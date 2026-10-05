/**
 * El encaje de la vitrina contra un Postgres de verdad (PGlite con las
 * migraciones reales): lee los procesos por id, trae la fecha de recepción
 * para la compuerta de plazo y omite los ids que no existen.
 */
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { migrate } from "drizzle-orm/pglite/migrator";

vi.mock("@/src/lib/db/client", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("@/src/lib/db/schema");
  const client = new PGlite();
  return { db: drizzle(client, { schema }), pool: { end: () => client.close() }, schema };
});

import { db } from "@/src/lib/db/client";
import { geografia, proceso } from "@/src/lib/db/schema";
import { encajeDeProcesos } from "@/src/lib/secop/encaje-vitrina";
import type { OferenteProfile } from "@/src/lib/oferente/types";

const HOY = new Date("2026-10-04T15:00:00Z");

const perfil: OferenteProfile = {
  id: "oferente-local",
  tipoPersona: "juridica",
  sectoresUnspsc: ["83101"],
  capacidadFinanciera: {
    capitalTrabajoCop: 0,
    indiceLiquidez: 0,
    indiceEndeudamiento: 0,
    razonCoberturaIntereses: 0,
    fuente: "manual",
    vigenciaHasta: null,
  },
  kCapacidadResidualCop: null,
  cobertura: { departamentos: ["76"], municipios: ["76001"] },
  cuantiaObjetivo: { minCop: 100_000_000, maxCop: 1_000_000_000 },
};

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
  await db.insert(geografia).values({
    codigoDivipola: "76001",
    departamentoCodigo: "76",
    departamentoNombre: "Valle del Cauca",
    municipioCodigo: "001",
    municipioNombre: "Cali",
  });
  const comun = {
    objeto: "Optimización del acueducto",
    geografiaId: "76001",
    valorEstimado: "200000000",
    estadoApertura: "Abierto",
    estadoActual: "Publicado",
    unspsc: "V1.83101500",
    tipoProyecto: "acueducto",
  };
  await db.insert(proceso).values([
    { ...comun, secopProcesoId: "CO1.REQ.VIGENTE", fechaRecepcion: "2026-10-20" },
    { ...comun, secopProcesoId: "CO1.REQ.VENCIDO", fechaRecepcion: "2026-10-01" },
  ]);
});

describe("encajeDeProcesos", () => {
  it("da un resumen por id existente y omite los que no existen", async () => {
    const r = await encajeDeProcesos(
      perfil,
      ["CO1.REQ.VIGENTE", "CO1.REQ.VENCIDO", "CO1.REQ.NOEXISTE"],
      HOY
    );
    expect(Object.keys(r).sort()).toEqual(["CO1.REQ.VENCIDO", "CO1.REQ.VIGENTE"]);
    for (const e of Object.values(r)) expect(e.total).toBe(5);
  });

  it("la recepción vencida hace fallar el plazo: la fecha llega desde la base", async () => {
    const r = await encajeDeProcesos(perfil, ["CO1.REQ.VIGENTE", "CO1.REQ.VENCIDO"], HOY);
    expect(r["CO1.REQ.VENCIDO"].overall).toBe("FAIL");
    expect(r["CO1.REQ.VENCIDO"].noCumple).toBeGreaterThanOrEqual(1);
    expect(r["CO1.REQ.VIGENTE"].cumple).toBeGreaterThan(r["CO1.REQ.VENCIDO"].cumple);
  });
});
