/**
 * CI-07 — línea base y cambios de contrato contra un Postgres real (PGlite con
 * las migraciones de `drizzle/`, incluidas 0027/0028). Es el reemplazo acotado de
 * `contrato_evento` (eliminada en drizzle/0011): una foto por contrato y un log
 * de cambios con retención.
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
import { ciContratoCambio, ciContratoEstado, contrato } from "@/src/lib/db/schema";
import { correrBaseCambiosContratos, RETENCION_CAMBIOS } from "@/src/lib/contratos/base-cambios";

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
}, 60_000);

let n = 0;
async function unContrato(v: Partial<typeof contrato.$inferInsert> = {}) {
  n += 1;
  const [c] = await db
    .insert(contrato)
    .values({
      secopContratoId: `CO1.PCCNTR.CI07.${n}`,
      valorActual: "1000.00",
      fechaFinActual: "2026-06-30",
      estadoActual: "En ejecución",
      ...v,
    })
    .returning({ id: contrato.id });
  return c.id;
}
const cambiosDe = (id: string) =>
  db.select().from(ciContratoCambio).where(eq(ciContratoCambio.contratoId, id));
const baseDe = async (id: string) =>
  (await db.select().from(ciContratoEstado).where(eq(ciContratoEstado.contratoId, id)))[0];

describe("primera corrida: siembra en silencio", () => {
  it("crea la línea base de cada contrato y NO inventa cambios", async () => {
    const a = await unContrato();
    const b = await unContrato({ estadoActual: "Terminado" });
    const r = await correrBaseCambiosContratos();
    expect(r.sembrados).toBeGreaterThanOrEqual(2);
    expect((await baseDe(a))?.estadoActual).toBe("En ejecución");
    expect((await baseDe(b))?.estadoActual).toBe("Terminado");
    expect(await cambiosDe(a)).toHaveLength(0);
    expect(r.cambiosDetectados).toBe(0);
  });

  it("los contratos borrados (soft delete) no entran", async () => {
    const id = await unContrato({ deletedAt: new Date() });
    await correrBaseCambiosContratos();
    expect(await baseDe(id)).toBeUndefined();
  });
});

describe("corridas siguientes", () => {
  it("detecta prórroga, adición y cambio de estado, y actualiza la línea base", async () => {
    const id = await unContrato();
    await correrBaseCambiosContratos();
    await db
      .update(contrato)
      .set({ valorActual: "1500.00", fechaFinActual: "2026-09-30", estadoActual: "Terminado" })
      .where(eq(contrato.id, id));

    const r = await correrBaseCambiosContratos();
    expect(r.cambiosDetectados).toBeGreaterThanOrEqual(3);
    const c = await cambiosDe(id);
    expect(c.map((x) => x.campo).sort()).toEqual([
      "estado_actual",
      "fecha_fin_actual",
      "valor_actual",
    ]);
    expect(c.find((x) => x.campo === "fecha_fin_actual")).toMatchObject({
      valorAnterior: "2026-06-30",
      valorNuevo: "2026-09-30",
    });
    const base = await baseDe(id);
    expect(base?.estadoActual).toBe("Terminado");
    expect(base?.fechaFinActual).toBe("2026-09-30");
  });

  it("sin cambios no escribe nada: ni cambios ni la línea base", async () => {
    const id = await unContrato();
    await correrBaseCambiosContratos();
    const antes = await baseDe(id);
    const r = await correrBaseCambiosContratos();
    expect(r.cambiosDetectados).toBe(0);
    expect(await cambiosDe(id)).toHaveLength(0);
    expect((await baseDe(id))?.vistoEn).toEqual(antes?.vistoEn);
  });

  it("es idempotente: repetir la corrida tras un cambio no duplica", async () => {
    const id = await unContrato();
    await correrBaseCambiosContratos();
    await db.update(contrato).set({ estadoActual: "Liquidado" }).where(eq(contrato.id, id));
    await correrBaseCambiosContratos();
    await correrBaseCambiosContratos();
    expect(await cambiosDe(id)).toHaveLength(1);
  });

  it("un campo que la fuente deja en blanco no se registra ni borra la línea base", async () => {
    const id = await unContrato();
    await correrBaseCambiosContratos();
    await db
      .update(contrato)
      .set({ fechaFinActual: null, valorActual: null })
      .where(eq(contrato.id, id));
    await correrBaseCambiosContratos();
    expect(await cambiosDe(id)).toHaveLength(0);
    expect((await baseDe(id))?.fechaFinActual).toBe("2026-06-30");
  });

  it("un valor que vuelve a uno anterior (A→B→A) se registra de nuevo en vez de perderse", async () => {
    const id = await unContrato({ estadoActual: "En ejecución" });
    await correrBaseCambiosContratos();
    await db.update(contrato).set({ estadoActual: "Suspendido" }).where(eq(contrato.id, id));
    await correrBaseCambiosContratos();
    await db.update(contrato).set({ estadoActual: "En ejecución" }).where(eq(contrato.id, id));
    await correrBaseCambiosContratos();
    const c = await cambiosDe(id);
    expect(c.map((x) => x.valorNuevo).sort()).toEqual(["En ejecución", "Suspendido"]);
    expect((await baseDe(id))?.estadoActual).toBe("En ejecución");
  });
});

describe("retención", () => {
  it(`conserva solo los ${RETENCION_CAMBIOS} cambios más recientes por contrato`, async () => {
    const id = await unContrato({ valorActual: "0.00" });
    await correrBaseCambiosContratos();
    for (let i = 1; i <= RETENCION_CAMBIOS + 5; i++) {
      await db
        .update(contrato)
        .set({ valorActual: `${i}.00` })
        .where(eq(contrato.id, id));
      await correrBaseCambiosContratos();
    }
    const c = await cambiosDe(id);
    expect(c).toHaveLength(RETENCION_CAMBIOS);
    // Sobreviven los más nuevos, no los más viejos.
    const nuevos = c.map((x) => x.valorNuevo);
    expect(nuevos).toContain(String(RETENCION_CAMBIOS + 5));
    expect(nuevos).not.toContain("1");
  });
});

describe("modos de ejecución", () => {
  it("dryRun cuenta lo que haría y no escribe nada", async () => {
    const id = await unContrato();
    const r = await correrBaseCambiosContratos({ dryRun: true });
    expect(r.dryRun).toBe(true);
    expect(r.sembrados).toBeGreaterThanOrEqual(1);
    expect(await baseDe(id)).toBeUndefined();
  });

  it("recorre por lotes sin saltarse ni repetir contratos", async () => {
    const ids = [
      await unContrato(),
      await unContrato(),
      await unContrato(),
      await unContrato(),
      await unContrato(),
    ];
    await correrBaseCambiosContratos({ lote: 2 });
    for (const id of ids) expect(await baseDe(id)).toBeDefined();
    const total = await db.execute(sql`select count(*)::int as n from ci_contrato_estado`);
    const contratos = await db.execute(
      sql`select count(*)::int as n from contrato where deleted_at is null`
    );
    expect((total.rows[0] as { n: number }).n).toBe((contratos.rows[0] as { n: number }).n);
  });

  it("se detiene si la base crece más de lo tolerado", async () => {
    await unContrato();
    let llamadas = 0;
    const r = await correrBaseCambiosContratos({
      lote: 1,
      maxCrecimientoMb: 5,
      medirTamanoMb: async () => (llamadas++ === 0 ? 100 : 200),
    });
    expect(r.abortado).toBe("crecimiento");
  });

  it("instrumenta por etapa: lectura, escritura de línea base, de cambios y poda", async () => {
    await unContrato();
    const r = await correrBaseCambiosContratos();
    expect(r.etapas.map((e) => e.nombre)).toEqual(["lectura", "linea_base", "cambios", "poda"]);
    for (const e of r.etapas) {
      expect(e.ms).toBeGreaterThanOrEqual(0);
      expect(e.filas).toBeGreaterThanOrEqual(0);
    }
  });
});
