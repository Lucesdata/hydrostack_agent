/**
 * Lote 1 contra PGlite con las migraciones reales (spec 2026-10-24-lote1-datos-columnas):
 * las columnas se escriben y un payload que no las trae no borra lo ya rellenado (D-T2).
 */
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/src/lib/db/schema";
import { contrato, proceso, rawRecord } from "@/src/lib/db/schema";
import { mapContratoRow, mapProcesoRow } from "@/src/lib/transform/mapCanonical";
import { batchUpsertContratos, batchUpsertProcesos } from "@/src/lib/transform/writers";

const db = drizzle(new PGlite(), { schema });
const BATCH = "00000000-0000-4000-8000-0000000000b1";
const RAW = "00000000-0000-4000-8000-0000000000a1";
const DOC = { state: "UNKNOWN", reason: "prueba", method: "metadata" } as never;

const filaProceso = (extra: Record<string, unknown> = {}) => ({
  id_del_proceso: "CO1.REQ.1",
  id_del_portafolio: "CO1.BDOS.1",
  nombre_del_procedimiento: "Acueducto",
  ...extra,
});
const filaContrato = (extra: Record<string, unknown> = {}) => ({
  id_contrato: "CO1.PCCNTR.1",
  proceso_de_compra: "CO1.BDOS.1",
  valor_del_contrato: "1000",
  ...extra,
});
const itemProceso = (row: Record<string, unknown>) => ({
  proj: mapProcesoRow(row),
  entidadId: null,
  geografiaId: null,
  rawRecordId: RAW,
  docAccess: DOC,
});
const itemContrato = (row: Record<string, unknown>) => ({
  proj: mapContratoRow(row),
  entidadId: null,
  proveedorId: null,
  procesoId: null,
  geografiaId: null,
  rawRecordId: RAW,
});

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
  await db.insert(rawRecord).values({
    id: RAW,
    source: "secop_ii_procesos",
    sourceRecordId: "CO1.REQ.1",
    payloadHash: "h",
    batchId: BATCH,
  });
}, 30000);

describe("Lote 1: proceso", () => {
  it("escribe duración y unidad; un payload sin ellas no las borra; uno con valores nuevos sí los cambia", async () => {
    await batchUpsertProcesos(db as never, [
      itemProceso(filaProceso({ duracion: "12", unidad_de_duracion: "Mes(es)" })),
    ]);
    const leer = async () =>
      (await db.select().from(proceso).where(eq(proceso.secopProcesoId, "CO1.REQ.1")))[0];
    let p = await leer();
    expect([p.duracionValor, p.duracionUnidad]).toEqual([12, "meses"]);

    await batchUpsertProcesos(db as never, [itemProceso(filaProceso())]);
    p = await leer();
    expect([p.duracionValor, p.duracionUnidad]).toEqual([12, "meses"]);

    await batchUpsertProcesos(db as never, [
      itemProceso(filaProceso({ duracion: "90", unidad_de_duracion: "día(s)" })),
    ]);
    p = await leer();
    expect([p.duracionValor, p.duracionUnidad]).toEqual([90, "dias"]);
  });

  it("una fila nueva sin los campos queda en NULL, no en cero ni en texto vacío", async () => {
    await batchUpsertProcesos(db as never, [
      itemProceso({ ...filaProceso(), id_del_proceso: "CO1.REQ.2", duracion: "0" }),
    ]);
    const [p] = await db.select().from(proceso).where(eq(proceso.secopProcesoId, "CO1.REQ.2"));
    expect(p.duracionValor).toBeNull();
    expect(p.duracionUnidad).toBeNull();
  });
});

describe("Lote 1: contrato", () => {
  const completo = {
    origen_de_los_recursos: "Recursos Propios",
    destino_gasto: "Inversión",
    sistema_general_de_participaciones: "500",
    recursos_propios: "0",
    dias_adicionados: "60",
    liquidaci_n: "Si",
  };
  const leer = async () =>
    (await db.select().from(contrato).where(eq(contrato.secopContratoId, "CO1.PCCNTR.1")))[0];

  it("escribe los cinco campos, con fuentes como jsonb disperso", async () => {
    await batchUpsertContratos(db as never, [itemContrato(filaContrato(completo))]);
    const c = await leer();
    expect(c.origenRecursos).toBe("Recursos Propios");
    expect(c.destinoGasto).toBe("Inversión");
    expect(c.fuentesRecursos).toEqual({ sgp: 500 });
    expect(c.diasAdicionados).toBe(60);
    expect(c.liquidado).toBe(true);
  });

  it("un payload sin los campos no borra lo rellenado (coalesce)", async () => {
    await batchUpsertContratos(db as never, [itemContrato(filaContrato())]);
    const c = await leer();
    expect(c.origenRecursos).toBe("Recursos Propios");
    expect(c.fuentesRecursos).toEqual({ sgp: 500 });
    expect(c.diasAdicionados).toBe(60);
    expect(c.liquidado).toBe(true);
  });

  it("un valor nuevo sí actualiza, y `false` no se confunde con ausencia", async () => {
    await batchUpsertContratos(db as never, [
      itemContrato(
        filaContrato({
          ...completo,
          dias_adicionados: "90",
          liquidaci_n: "No",
          destino_gasto: "Funcionamiento",
        })
      ),
    ]);
    const c = await leer();
    expect(c.diasAdicionados).toBe(90);
    expect(c.destinoGasto).toBe("Funcionamiento");
    expect(c.liquidado).toBe(false);
  });

  it("las columnas son nulables y una fila sin datos queda en NULL", async () => {
    await batchUpsertContratos(db as never, [
      itemContrato({ ...filaContrato(), id_contrato: "CO1.PCCNTR.2", dias_adicionados: "0" }),
    ]);
    const [c] = await db
      .select()
      .from(contrato)
      .where(eq(contrato.secopContratoId, "CO1.PCCNTR.2"));
    expect(c.fuentesRecursos).toBeNull();
    expect(c.diasAdicionados).toBeNull();
    expect(c.liquidado).toBeNull();
    expect(c.origenRecursos).toBeNull();
  });
});
