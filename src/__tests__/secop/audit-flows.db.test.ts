import path from "node:path";
import { beforeAll, afterAll, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/pglite/migrator";
vi.mock("@/src/lib/db/client", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("@/src/lib/db/schema");
  const client = new PGlite();
  return { db: drizzle(client, { schema }), pool: { end: () => client.close() }, schema };
});
import { db, pool } from "@/src/lib/db/client";
import { entidad, proceso, usuario, geografia } from "@/src/lib/db/schema";
import { procesosDeVitrina } from "@/src/lib/secop/vitrina";
import { SIN_FILTROS } from "@/src/lib/secop/filtros-vitrina";
import { guardarProceso, estadoGuardados, quitarProceso } from "@/src/lib/mis-procesos/store";
import { batchUpsertEntidades } from "@/src/lib/transform/writers";
import { mapProcesoRow } from "@/src/lib/transform/mapCanonical";
const url =
  "https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.900&isFromPublicArea=True";
beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve("drizzle") });
  await db.insert(proceso).values([
    { secopProcesoId: "CO1.REQ.12", url, estadoApertura: "Cerrado", estadoActual: "Seleccionado" },
    { secopProcesoId: "CO1.REQ.900", url: url.replace("900", "777") },
    { secopProcesoId: "CO1.REQ.13", url: url.replace("community.secop.gov.co", "evil.test") },
    { secopProcesoId: "CO1.NTC.123", estadoApertura: "Abierto" },
  ]);
  await db.insert(usuario).values([
    { id: "audit-a", email: "audit-a@example.test" },
    { id: "audit-b", email: "audit-b@example.test" },
  ]);
  await db.insert(geografia).values({
    codigoDivipola: "17001",
    departamentoCodigo: "17",
    departamentoNombre: "Caldas",
    municipioCodigo: "001",
    municipioNombre: "Manizales",
  });
});
afterAll(() => pool.end());
it("NTC encuentra el REQ vinculado por URL oficial, no por el sufijo numérico", async () => {
  const r = await procesosDeVitrina("abiertos", 1, {
    filtros: { ...SIN_FILTROS, numero: "co1.ntc.900" },
  });
  expect(r.items.map((p) => p.secopProcesoId)).toEqual(["CO1.REQ.12"]);
  expect(r.total).toBe(1);
});
it("guardar y quitar NTC mantiene aislamiento entre cuentas", async () => {
  await guardarProceso({ usuarioId: "audit-a" }, "co1.ntc.123");
  expect(await estadoGuardados("audit-a", ["CO1.NTC.123"])).toEqual(["CO1.NTC.123"]);
  expect(await estadoGuardados("audit-b", ["CO1.NTC.123"])).toEqual([]);
  await quitarProceso("audit-b", "CO1.NTC.123");
  expect(await estadoGuardados("audit-a", ["CO1.NTC.123"])).toHaveLength(1);
  await quitarProceso("audit-a", "CO1.NTC.123");
  expect(await estadoGuardados("audit-a", ["CO1.NTC.123"])).toEqual([]);
});
it("un contrato sin sede conocida no borra la sede resuelta de la entidad", async () => {
  const proj = mapProcesoRow({
    nit_entidad: "890801052",
    entidad: "GOBERNACION DE CALDAS",
  }).entidad!;
  await batchUpsertEntidades(db as never, [{ proj, geografiaId: "17001" }]);
  await batchUpsertEntidades(db as never, [{ proj, geografiaId: null }]);
  const [e] = await db.select().from(entidad).where(eq(entidad.nitCanonico, "890801052"));
  expect(e.geografiaId).toBe("17001");
});
it("RLS deniega leer y escribir guardados desde un rol API sin bypass", async () => {
  await guardarProceso({ usuarioId: "audit-a" }, "CO1.NTC.123");
  await db.execute(sql`CREATE ROLE audit_api NOLOGIN`);
  await db.execute(sql`GRANT USAGE ON SCHEMA public TO audit_api`);
  await db.execute(sql`GRANT SELECT, INSERT, DELETE ON senal_usuario TO audit_api`);
  await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE audit_api`);
    expect((await tx.execute(sql`SELECT * FROM senal_usuario`)).rows).toEqual([]);
    expect((await tx.execute(sql`DELETE FROM senal_usuario RETURNING id`)).rows).toEqual([]);
  });
  await expect(
    db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE audit_api`);
      await tx.execute(
        sql`INSERT INTO senal_usuario(usuario_id,senal) VALUES ('audit-b','personal:guardado:v1:CO1.NTC.123')`
      );
    })
  ).rejects.toThrow();
  expect(await estadoGuardados("audit-a", ["CO1.NTC.123"])).toEqual(["CO1.NTC.123"]);
});

import { readFileSync } from "node:fs";
import { rawRecord, contrato } from "@/src/lib/db/schema";
import { runTransform } from "@/src/lib/transform/orchestrator";
import { GeoResolver } from "@/src/lib/transform/writers";
it("el transform conserva sede y actualiza cierre y estado sin usar localización contractual", async () => {
  const { geografiaAlias } = await import("@/src/lib/db/schema");
  await db
    .insert(geografia)
    .values([
      {
        codigoDivipola: "15000",
        departamentoCodigo: "15",
        departamentoNombre: "Boyacá",
        municipioCodigo: "000",
      },
      {
        codigoDivipola: "05001",
        departamentoCodigo: "05",
        departamentoNombre: "Antioquia",
        municipioCodigo: "001",
        municipioNombre: "Medellín",
      },
    ])
    .onConflictDoNothing();
  await db.insert(geografiaAlias).values({ textoNormalizado: "medellin", codigoDivipola: "05001" });
  const payload = {
    id_del_proceso: "CO1.REQ.11285575",
    nit_entidad: "891800896",
    entidad: "MUNICIPIO DE GUAYATA",
    departamento_entidad: "No Definido",
    ciudad_entidad: "No Definido",
    estado_del_procedimiento: "Publicado",
    estado_de_apertura_del_proceso: "Abierto",
    fecha_de_recepcion_de: "2026-11-06T00:00:00.000",
  };
  const [raw] = await db
    .insert(rawRecord)
    .values({
      source: "secop_ii_procesos",
      sourceRecordId: payload.id_del_proceso,
      payload,
      payloadHash: "audit-1",
      batchId: "00000000-0000-4000-8000-000000000001",
    })
    .returning();
  await db.insert(rawRecord).values({
    source: "secop_ii_contratos",
    sourceRecordId: "CO1.PCCNTR.321",
    payload: {
      id_contrato: "CO1.PCCNTR.321",
      nit_entidad: "891800896",
      nombre_entidad: "MUNICIPIO DE GUAYATA",
      departamento: "No Definido",
      ciudad: "No Definido",
      localizaci_n: "Colombia, Antioquia, Medellín",
    },
    payloadHash: "audit-c",
    batchId: raw.batchId,
  });
  await runTransform();
  const [e] = await db.select().from(entidad).where(eq(entidad.nitCanonico, "891800896"));
  expect(e.geografiaId).toBe("15000");
  const [c] = await db
    .select()
    .from(contrato)
    .where(eq(contrato.secopContratoId, "CO1.PCCNTR.321"));
  expect(c.geografiaId).toBe("05001");
  await db
    .update(rawRecord)
    .set({
      payload: {
        ...payload,
        fecha_de_recepcion_de: "2026-11-10T00:00:00.000",
        estado_del_procedimiento: "Cancelado",
      },
      payloadHash: "audit-2",
    })
    .where(eq(rawRecord.id, raw.id));
  await runTransform();
  const [p] = await db
    .select()
    .from(proceso)
    .where(eq(proceso.secopProcesoId, payload.id_del_proceso));
  expect(p.fechaRecepcion).toBe("2026-11-10");
  expect(p.estadoActual).toBe("Cancelado");
  expect(p.geografiaId).toBe("15000");
  expect(
    (await GeoResolver.load(db as never)).resolve({ departamento: "boyaca", municipio: "medellin" })
  ).toBe("15000");
});
it("reparación histórica por NIT es idempotente y no cambia geografía de ejecución", async () => {
  await db
    .update(entidad)
    .set({ geografiaId: "05001" })
    .where(eq(entidad.nitCanonico, "890801052"));
  const statements = readFileSync("drizzle/0026_reparar_sedes_auditoria.sql", "utf8").split(
    "--> statement-breakpoint"
  );
  for (let i = 0; i < 2; i++)
    for (const statement of statements) await db.execute(sql.raw(statement));
  const [e] = await db.select().from(entidad).where(eq(entidad.nitCanonico, "890801052"));
  expect(e.geografiaId).toBe("17001");
  const [c] = await db
    .select()
    .from(contrato)
    .where(eq(contrato.secopContratoId, "CO1.PCCNTR.321"));
  expect(c.geografiaId).toBe("05001");
});
it("la última fila sin sede de un lote no descarta la sede válida del mismo NIT", async () => {
  const proj = mapProcesoRow({
    nit_entidad: "800123456",
    entidad: "Entidad nueva de prueba",
  }).entidad!;
  await batchUpsertEntidades(db as never, [
    { proj, geografiaId: "17001" },
    { proj: { ...proj, nombre: "Nombre más reciente" }, geografiaId: null },
  ]);
  const [e] = await db.select().from(entidad).where(eq(entidad.nitCanonico, "800123456"));
  expect(e.geografiaId).toBe("17001");
  expect(e.nombre).toBe("Nombre más reciente");
});
