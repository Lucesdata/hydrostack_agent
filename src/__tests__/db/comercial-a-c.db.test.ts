/**
 * CI-04 — invariantes de las migraciones A (perfil de empresa, consentimiento,
 * seguimiento, auditoría) y C (línea base y cambios de contrato) contra un
 * Postgres de verdad (PGlite con las migraciones reales de `drizzle/`).
 * Spec: docs/sdd/00-esqueleto.md §4.9 · plan: …/2026-11-09-ci-03-plan-de-datos.md §4.
 *
 * Lo que se prueba es lo que impone la BASE (CHECK, UNIQUE, triggers, RLS), no
 * el servicio: un mock no ejecutaría nada de eso.
 */
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { migrate } from "drizzle-orm/pglite/migrator";
import { sql } from "drizzle-orm";

vi.mock("@/src/lib/db/client", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("@/src/lib/db/schema");
  const client = new PGlite();
  return { db: drizzle(client, { schema }), pool: { end: () => client.close() }, schema };
});

import { db } from "@/src/lib/db/client";
import {
  ciAuditoria,
  ciConsentimiento,
  ciContratoCambio,
  ciContratoEstado,
  ciEmpresa,
  ciEmpresaCapacidad,
  ciEmpresaCobertura,
  ciEmpresaRol,
  ciSeguimiento,
  contrato,
  usuario,
} from "@/src/lib/db/schema";

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
}, 60_000);

/** Mensaje real de Postgres, que drizzle envuelve en `cause`. */
async function falla(p: PromiseLike<unknown>, patron: RegExp) {
  try {
    await p;
  } catch (e) {
    const err = e as { message?: string; cause?: { message?: string } };
    const texto = `${err.message ?? ""} ${err.cause?.message ?? ""}`;
    expect(texto).toMatch(patron);
    return;
  }
  throw new Error(`Se esperaba un fallo que coincidiera con ${patron}, pero la operación pasó`);
}

let n = 0;
async function unUsuario() {
  n += 1;
  const id = `u-${n}`;
  await db.insert(usuario).values({ id, email: `u${n}@ejemplo.test` });
  return id;
}
async function unaEmpresa(usuarioId?: string) {
  const uid = usuarioId ?? (await unUsuario());
  const [e] = await db
    .insert(ciEmpresa)
    .values({ usuarioId: uid, razonSocial: "Acme Pumps GmbH", pais: "DE" })
    .returning({ id: ciEmpresa.id });
  return { id: e.id, usuarioId: uid };
}
async function unContrato() {
  n += 1;
  const [c] = await db
    .insert(contrato)
    .values({ secopContratoId: `CO1.PCCNTR.${n}` })
    .returning({ id: contrato.id });
  return c.id;
}

describe("ci_empresa", () => {
  it("una cuenta = una empresa (V1)", async () => {
    const { usuarioId } = await unaEmpresa();
    await falla(
      db.insert(ciEmpresa).values({ usuarioId, razonSocial: "Otra", pais: "US" }),
      /ci_empresa_usuario_uq|unique/i
    );
  });

  it("el país es ISO alfa-2 y el estado de verificación nace en sin_verificar", async () => {
    const uid = await unUsuario();
    await falla(
      db.insert(ciEmpresa).values({ usuarioId: uid, razonSocial: "X", pais: "DEU" }),
      /ci_empresa_pais_ck/
    );
    const [e] = await db
      .insert(ciEmpresa)
      .values({ usuarioId: uid, razonSocial: "X", pais: "DE" })
      .returning();
    expect(e.estadoVerificacion).toBe("sin_verificar");
    expect(e.coberturaNacional).toBe(false);
    expect(e.atributos).toEqual({});
  });

  it("rechaza un estado de verificación desconocido", async () => {
    const { id } = await unaEmpresa();
    await falla(
      db.execute(sql`update ci_empresa set estado_verificacion = 'aprobada_ya' where id = ${id}`),
      /ci_empresa_verificacion_ck/
    );
  });

  it("borrar la cuenta borra la empresa y sus capacidades por cascada", async () => {
    const { id, usuarioId } = await unaEmpresa();
    await db.insert(ciEmpresaCapacidad).values({
      empresaId: id,
      nodoCodigo: "BOM",
      taxonomiaVersion: "1.1.0-borrador",
      estadoDato: "declarado",
    });
    await db.execute(sql`delete from usuario where id = ${usuarioId}`);
    const quedan = await db.execute(
      sql`select 1 from ci_empresa_capacidad where empresa_id = ${id}`
    );
    expect(quedan.rows).toHaveLength(0);
  });
});

describe("estados de dato, roles, capacidades y cobertura", () => {
  it("el rol debe ser uno de los del brief y el estado de dato uno de los tres", async () => {
    const { id } = await unaEmpresa();
    await falla(
      db
        .insert(ciEmpresaRol)
        .values({ empresaId: id, rol: "vendedor_de_humo", estadoDato: "declarado" }),
      /ci_empresa_rol_rol_ck/
    );
    await falla(
      db
        .insert(ciEmpresaRol)
        .values({ empresaId: id, rol: "importador", estadoDato: "confirmado" }),
      /ci_empresa_rol_estado_ck/
    );
    await db
      .insert(ciEmpresaRol)
      .values({ empresaId: id, rol: "importador", estadoDato: "verificado" });
    await falla(
      db.insert(ciEmpresaRol).values({ empresaId: id, rol: "importador", estadoDato: "declarado" }),
      /ci_empresa_rol_pkey|unique|duplicate/i
    );
  });

  it("una capacidad por nodo y empresa; estado de dato acotado", async () => {
    const { id } = await unaEmpresa();
    const base = { empresaId: id, nodoCodigo: "INS", taxonomiaVersion: "1.1.0-borrador" };
    await db
      .insert(ciEmpresaCapacidad)
      .values({ ...base, estadoDato: "documentado", marcas: ["ACME"] });
    await falla(
      db.insert(ciEmpresaCapacidad).values({ ...base, estadoDato: "declarado" }),
      /ci_empresa_capacidad_empresa_nodo_uq|unique/i
    );
    await falla(
      db.insert(ciEmpresaCapacidad).values({ ...base, nodoCodigo: "SCA", estadoDato: "quizas" }),
      /ci_empresa_capacidad_estado_ck/
    );
  });

  it("la cobertura es DIVIPOLA de 2 o 5 dígitos", async () => {
    const { id } = await unaEmpresa();
    await db
      .insert(ciEmpresaCobertura)
      .values({ empresaId: id, divipola: "76", estadoDato: "declarado" });
    await db
      .insert(ciEmpresaCobertura)
      .values({ empresaId: id, divipola: "76001", estadoDato: "declarado" });
    for (const malo of ["7", "760", "7600", "76A01", "760011"]) {
      await falla(
        db
          .insert(ciEmpresaCobertura)
          .values({ empresaId: id, divipola: malo, estadoDato: "declarado" }),
        /ci_empresa_cobertura_divipola_ck/
      );
    }
  });
});

describe("ci_consentimiento (append-only, prueba de consentimiento)", () => {
  it("acepta alta y baja de alertas comerciales y rechaza otras finalidades/acciones", async () => {
    const uid = await unUsuario();
    await db.insert(ciConsentimiento).values({
      usuarioId: uid,
      finalidad: "alertas_comerciales",
      accion: "alta",
      versionTexto: "v1-es",
    });
    await falla(
      db
        .insert(ciConsentimiento)
        .values({ usuarioId: uid, finalidad: "publicidad", accion: "alta", versionTexto: "v1" }),
      /ci_consentimiento_finalidad_ck/
    );
    await falla(
      db.insert(ciConsentimiento).values({
        usuarioId: uid,
        finalidad: "alertas_comerciales",
        accion: "quizas",
        versionTexto: "v1",
      }),
      /ci_consentimiento_accion_ck/
    );
  });

  it("no se puede modificar ni borrar una fila directamente", async () => {
    const uid = await unUsuario();
    const [f] = await db
      .insert(ciConsentimiento)
      .values({
        usuarioId: uid,
        finalidad: "alertas_comerciales",
        accion: "alta",
        versionTexto: "v1-es",
      })
      .returning({ id: ciConsentimiento.id });
    await falla(
      db.execute(sql`update ci_consentimiento set accion = 'baja' where id = ${f.id}`),
      /solo anexado|append/i
    );
    await falla(
      db.execute(sql`delete from ci_consentimiento where id = ${f.id}`),
      /solo anexado|append/i
    );
  });

  it("pero la supresión de la cuenta sí arrastra su consentimiento (derecho de supresión)", async () => {
    const uid = await unUsuario();
    await db.insert(ciConsentimiento).values({
      usuarioId: uid,
      finalidad: "alertas_comerciales",
      accion: "alta",
      versionTexto: "v1-es",
    });
    await db.execute(sql`delete from usuario where id = ${uid}`);
    const r = await db.execute(sql`select 1 from ci_consentimiento where usuario_id = ${uid}`);
    expect(r.rows).toHaveLength(0);
  });
});

describe("ci_seguimiento", () => {
  it("sigue contratos, necesidades y contratistas, no procesos (esos van por /mis-procesos)", async () => {
    const uid = await unUsuario();
    await db
      .insert(ciSeguimiento)
      .values({ usuarioId: uid, objetoTipo: "contrato", objetoId: "CO1.PCCNTR.1" });
    await falla(
      db
        .insert(ciSeguimiento)
        .values({ usuarioId: uid, objetoTipo: "proceso", objetoId: "CO1.REQ.1" }),
      /ci_seguimiento_tipo_ck/
    );
    await falla(
      db
        .insert(ciSeguimiento)
        .values({ usuarioId: uid, objetoTipo: "contrato", objetoId: "CO1.PCCNTR.1" }),
      /ci_seguimiento_unico_uq|unique/i
    );
  });
});

describe("ci_auditoria (inmutable)", () => {
  it("registra y no permite UPDATE ni DELETE", async () => {
    const [f] = await db
      .insert(ciAuditoria)
      .values({
        actorTipo: "sistema",
        accion: "empresa.creada",
        objetoTipo: "empresa",
        objetoId: "x",
        detalle: { a: 1 },
      })
      .returning({ id: ciAuditoria.id });
    await falla(
      db.execute(sql`update ci_auditoria set accion = 'otra' where id = ${f.id}`),
      /solo anexado|append/i
    );
    await falla(
      db.execute(sql`delete from ci_auditoria where id = ${f.id}`),
      /solo anexado|append/i
    );
  });
});

describe("migración C: línea base y cambios de contrato", () => {
  it("una fila de línea base por contrato", async () => {
    const cid = await unContrato();
    await db
      .insert(ciContratoEstado)
      .values({ contratoId: cid, estadoActual: "En ejecución", vistoEn: new Date() });
    await falla(
      db
        .insert(ciContratoEstado)
        .values({ contratoId: cid, estadoActual: "Terminado", vistoEn: new Date() }),
      /ci_contrato_estado_pkey|unique|duplicate/i
    );
  });

  it("el cambio es idempotente por (contrato, campo, valor nuevo) y el campo es de la lista", async () => {
    const cid = await unContrato();
    const c = {
      contratoId: cid,
      campo: "fecha_fin_actual",
      valorAnterior: "2026-06-30",
      valorNuevo: "2026-09-30",
    };
    await db.insert(ciContratoCambio).values(c);
    await falla(db.insert(ciContratoCambio).values(c), /ci_contrato_cambio_unico_uq|unique/i);
    await falla(
      db.insert(ciContratoCambio).values({ ...c, campo: "objeto" }),
      /ci_contrato_cambio_campo_ck/
    );
  });
});

describe("RLS en todas las tablas nuevas (R6)", () => {
  it("ninguna tabla de public queda sin RLS", async () => {
    const r = await db.execute(
      sql`select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
            and c.relname not like '\\_\\_%' escape '\\'`
    );
    expect(r.rows.map((x) => (x as { relname: string }).relname)).toEqual([]);
  });

  it("las nueve tablas de A y C existen", async () => {
    const r = await db.execute(
      sql`select relname from pg_class where relname like 'ci\\_%' escape '\\' and relkind = 'r' order by 1`
    );
    expect(r.rows.map((x) => (x as { relname: string }).relname)).toEqual([
      "ci_auditoria",
      "ci_consentimiento",
      "ci_contrato_cambio",
      "ci_contrato_estado",
      "ci_empresa",
      "ci_empresa_capacidad",
      "ci_empresa_cobertura",
      "ci_empresa_rol",
      "ci_seguimiento",
    ]);
  });
});
