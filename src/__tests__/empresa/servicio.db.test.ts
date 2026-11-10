/**
 * CI-05 — servicio del perfil de empresa contra un Postgres real (PGlite con las
 * migraciones de `drizzle/`). Se prueba lo que importa para una tabla de cuenta:
 * AISLAMIENTO por usuario, que el cliente no pueda fijar estados de dato ni de
 * verificación, y que lo que ya fue verificado no sobreviva a un cambio.
 */
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq, sql } from "drizzle-orm";

vi.mock("@/src/lib/db/client", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("@/src/lib/db/schema");
  const client = new PGlite();
  return { db: drizzle(client, { schema }), pool: { end: () => client.close() }, schema };
});

import { db } from "@/src/lib/db/client";
import { ciAuditoria, ciEmpresa, usuario } from "@/src/lib/db/schema";
import { guardarEmpresa, obtenerEmpresa } from "@/src/lib/empresa/servicio";
import { ROLES_EMPRESA } from "@/src/lib/empresa/validar";

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
}, 60_000);

let n = 0;
async function unUsuario() {
  n += 1;
  const id = `emp-u-${n}`;
  await db.insert(usuario).values({ id, email: `emp${n}@ejemplo.test` });
  return id;
}

const entrada = (extra: Record<string, unknown> = {}) => ({
  razonSocial: "Acme Pumps GmbH",
  pais: "DE",
  roles: ["fabricante_internacional"],
  capacidades: [
    { nodoCodigo: "BOM.SUM", marcas: ["Acme"], especificaciones: { caudal_max_m3h: 120 } },
  ],
  cobertura: ["76"],
  atributos: { idiomas: ["es", "en"] },
  ...extra,
});

async function guardar(uid: string, e: unknown) {
  const r = await guardarEmpresa(uid, e);
  if (!r.ok) throw new Error(`Esperaba ok: ${JSON.stringify(r.errores)}`);
  return r;
}

describe("guardar y leer", () => {
  it("crea el perfil, todo nace «declarado» y la verificación en sin_verificar", async () => {
    const uid = await unUsuario();
    const r = await guardar(uid, entrada());
    expect(r.creada).toBe(true);
    const e = await obtenerEmpresa(uid);
    expect(e?.razonSocial).toBe("Acme Pumps GmbH");
    expect(e?.estadoVerificacion).toBe("sin_verificar");
    expect(e?.roles).toEqual([{ rol: "fabricante_internacional", estadoDato: "declarado" }]);
    expect(e?.capacidades[0]).toMatchObject({
      nodoCodigo: "BOM.SUM",
      estadoDato: "declarado",
      marcas: ["Acme"],
    });
    expect(e?.cobertura).toEqual([{ divipola: "76", estadoDato: "declarado" }]);
    expect(e?.atributos.idiomas).toEqual({ valor: ["es", "en"], estado: "declarado" });
    expect(e?.completitud.completo).toBe(true);
  });

  it("sin perfil, obtenerEmpresa devuelve null", async () => {
    expect(await obtenerEmpresa(await unUsuario())).toBeNull();
  });

  it("guardar de nuevo REEMPLAZA los hijos (lo que se quita, se quita) y no duplica la empresa", async () => {
    const uid = await unUsuario();
    await guardar(uid, entrada({ roles: ["importador", "consultora"], cobertura: ["76", "05"] }));
    const r = await guardar(uid, entrada({ roles: ["importador"], cobertura: ["05001"] }));
    expect(r.creada).toBe(false);
    const e = await obtenerEmpresa(uid);
    expect(e?.roles.map((x) => x.rol)).toEqual(["importador"]);
    expect(e?.cobertura.map((x) => x.divipola)).toEqual(["05001"]);
    const filas = await db.select().from(ciEmpresa).where(eq(ciEmpresa.usuarioId, uid));
    expect(filas).toHaveLength(1);
  });

  it("dos guardados simultáneos de la misma cuenta nueva dejan una sola empresa", async () => {
    const uid = await unUsuario();
    const rs = await Promise.all([guardarEmpresa(uid, entrada()), guardarEmpresa(uid, entrada())]);
    expect(rs.every((r) => r.ok)).toBe(true);
    const filas = await db.select().from(ciEmpresa).where(eq(ciEmpresa.usuarioId, uid));
    expect(filas).toHaveLength(1);
  });

  it("todos los roles que acepta el validador los acepta también el CHECK de la base", async () => {
    const uid = await unUsuario();
    await guardar(uid, entrada({ roles: [...ROLES_EMPRESA] }));
    expect((await obtenerEmpresa(uid))?.roles).toHaveLength(ROLES_EMPRESA.length);
  });
});

describe("aislamiento entre cuentas", () => {
  it("una cuenta no lee ni modifica el perfil de otra", async () => {
    const a = await unUsuario();
    const b = await unUsuario();
    await guardar(a, entrada({ razonSocial: "Empresa A" }));

    expect(await obtenerEmpresa(b)).toBeNull();
    await guardar(b, entrada({ razonSocial: "Empresa B", roles: ["importador"] }));

    const ea = await obtenerEmpresa(a);
    const eb = await obtenerEmpresa(b);
    expect(ea?.razonSocial).toBe("Empresa A");
    expect(ea?.roles.map((r) => r.rol)).toEqual(["fabricante_internacional"]);
    expect(eb?.razonSocial).toBe("Empresa B");
    expect(ea?.id).not.toBe(eb?.id);
  });

  it("los ids que manda el cliente no cuentan: manda el usuario de la sesión", async () => {
    const a = await unUsuario();
    const b = await unUsuario();
    await guardar(a, entrada({ razonSocial: "Empresa A" }));
    const ea = await obtenerEmpresa(a);

    await guardar(b, {
      ...entrada({ razonSocial: "Empresa B" }),
      usuarioId: a,
      empresaId: ea?.id,
      id: ea?.id,
    });

    expect((await obtenerEmpresa(a))?.razonSocial).toBe("Empresa A");
    expect((await obtenerEmpresa(b))?.razonSocial).toBe("Empresa B");
  });
});

describe("el cliente no fija estados", () => {
  it("estadoVerificacion y estados de dato enviados por el cliente se ignoran", async () => {
    const uid = await unUsuario();
    await guardar(uid, {
      ...entrada(),
      estadoVerificacion: "verificada",
      roles: ["importador"],
      capacidades: [{ nodoCodigo: "BOM", estadoDato: "verificado" }],
    });
    const e = await obtenerEmpresa(uid);
    expect(e?.estadoVerificacion).toBe("sin_verificar");
    expect(e?.capacidades[0].estadoDato).toBe("declarado");
  });

  it("un dato verificado se conserva si no cambia y vuelve a «declarado» si cambia", async () => {
    const uid = await unUsuario();
    await guardar(uid, entrada());
    await db.execute(
      sql`update ci_empresa_capacidad set estado_dato = 'verificado'
          where empresa_id = (select id from ci_empresa where usuario_id = ${uid})`
    );
    await db.execute(
      sql`update ci_empresa_rol set estado_dato = 'documentado'
          where empresa_id = (select id from ci_empresa where usuario_id = ${uid})`
    );

    await guardar(uid, entrada()); // idéntico
    let e = await obtenerEmpresa(uid);
    expect(e?.capacidades[0].estadoDato).toBe("verificado");
    expect(e?.roles[0].estadoDato).toBe("documentado");

    await guardar(
      uid,
      entrada({
        capacidades: [
          { nodoCodigo: "BOM.SUM", marcas: ["Otra"], especificaciones: { caudal_max_m3h: 120 } },
        ],
      })
    );
    e = await obtenerEmpresa(uid);
    expect(e?.capacidades[0].estadoDato).toBe("declarado");
    expect(e?.roles[0].estadoDato).toBe("documentado");
  });

  it("cambiar la identidad de una empresa verificada la devuelve a revisión; el resto la deja igual", async () => {
    const uid = await unUsuario();
    await guardar(uid, entrada());
    await db.execute(
      sql`update ci_empresa set estado_verificacion = 'verificada' where usuario_id = ${uid}`
    );

    await guardar(uid, entrada({ cobertura: ["05"] })); // no es identidad
    expect((await obtenerEmpresa(uid))?.estadoVerificacion).toBe("verificada");

    await guardar(uid, entrada({ razonSocial: "Acme Pumps AG" }));
    expect((await obtenerEmpresa(uid))?.estadoVerificacion).toBe("en_revision");
  });

  it("una empresa rechazada o revocada no se rehabilita editando el perfil", async () => {
    const uid = await unUsuario();
    await guardar(uid, entrada());
    await db.execute(
      sql`update ci_empresa set estado_verificacion = 'revocada' where usuario_id = ${uid}`
    );
    await guardar(uid, entrada({ razonSocial: "Otro nombre" }));
    expect((await obtenerEmpresa(uid))?.estadoVerificacion).toBe("revocada");
  });
});

describe("entrada inválida", () => {
  it("devuelve los errores y no escribe nada", async () => {
    const uid = await unUsuario();
    const r = await guardarEmpresa(
      uid,
      entrada({ pais: "DEU", capacidades: [{ nodoCodigo: "XXX" }] })
    );
    expect(r.ok).toBe(false);
    expect(await obtenerEmpresa(uid)).toBeNull();
    const aud = await db.select().from(ciAuditoria).where(eq(ciAuditoria.actorId, uid));
    expect(aud).toHaveLength(0);
  });

  it("rechaza listas de precios y no deja rastro en la base", async () => {
    const uid = await unUsuario();
    const r = await guardarEmpresa(
      uid,
      entrada({
        capacidades: [{ nodoCodigo: "BOM", especificaciones: { lista_de_precios: [1, 2] } }],
      })
    );
    expect(r.ok).toBe(false);
    expect(await obtenerEmpresa(uid)).toBeNull();
  });
});

describe("auditoría", () => {
  it("registra creación y modificación, sin copiar especificaciones ni datos del perfil", async () => {
    const uid = await unUsuario();
    await guardar(uid, entrada());
    await guardar(uid, entrada({ cobertura: ["05"] }));
    const aud = await db.select().from(ciAuditoria).where(eq(ciAuditoria.actorId, uid));
    expect(aud.map((a) => a.accion).sort()).toEqual(["empresa.creada", "empresa.guardada"]);
    for (const a of aud) {
      expect(a.actorTipo).toBe("usuario");
      expect(a.objetoTipo).toBe("empresa");
      const texto = JSON.stringify(a.detalle);
      expect(texto).not.toMatch(/caudal|Acme|razon/i);
      expect(a.detalle).toMatchObject({
        roles: expect.any(Number),
        capacidades: expect.any(Number),
      });
    }
  });
});
