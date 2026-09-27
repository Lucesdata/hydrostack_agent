/**
 * La §7 de la ficha contra un Postgres de verdad (PGlite con las migraciones
 * reales): `competidoresComparables` agrupa por la llave del rival y
 * `historialComparable` se recorta a lo comparable (mismo tipo, mismo
 * departamento, sin el propio proceso). Lo que se prueba es SQL —el join por
 * `proceso_id`, la mediana con `percentile_cont`, el `FILTER`— y un mock no
 * ejecutaría nada de eso.
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
import { alOferentesHistorico, geografia, proceso } from "@/src/lib/db/schema";
import { competidoresComparables } from "@/src/lib/secop/ficha";
import { historialComparable } from "@/src/lib/al/consulta/competidor";

let n = 0;
/** Un proceso cerrado; devuelve su uuid interno. */
async function unProceso(v: { dpto?: string; tipo?: "ptar" | "acueducto"; objeto?: string }) {
  n += 1;
  const [fila] = await db
    .insert(proceso)
    .values({
      secopProcesoId: `CO1.REQ.${n}`,
      objeto: v.objeto ?? `Obra ${n}`,
      geografiaId: `${v.dpto ?? "05"}000`,
      estadoApertura: "Cerrado",
      estadoActual: "Adjudicado",
      tipoProyecto: v.tipo ?? "ptar",
    })
    .returning({ id: proceso.id, secopProcesoId: proceso.secopProcesoId });
  return fila;
}

async function participa(
  p: { id: string; secopProcesoId: string },
  proveedorKey: string,
  nombre: string,
  v: { gano?: boolean; estimado?: string; adjudicado?: string; fecha?: string } = {}
) {
  await db.insert(alOferentesHistorico).values({
    secopProcesoId: p.secopProcesoId,
    procesoId: p.id,
    proveedorKey,
    proveedorNombre: nombre,
    adjudicado: v.gano ?? false,
    valorEstimado: v.estimado ?? null,
    valorAdjudicado: v.adjudicado ?? null,
    fechaAdjudicacion: v.fecha ?? null,
    fuente: "proponentes",
  });
}

let ficha: { id: string; secopProcesoId: string };
const REF = () => ({ id: ficha.id, tipoProyecto: "ptar" as const, departamentoCodigo: "05" });

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
  await db.insert(geografia).values([
    { codigoDivipola: "05000", departamentoCodigo: "05", departamentoNombre: "Antioquia" },
    { codigoDivipola: "76000", departamentoCodigo: "76", departamentoNombre: "Valle" },
  ]);

  ficha = await unProceso({ objeto: "PTAR de la ficha" });
  const a = await unProceso({ objeto: "PTAR de Rionegro" });
  const b = await unProceso({ objeto: "PTAR de Envigado" });
  const otroTipo = await unProceso({ tipo: "acueducto" });
  const otroDpto = await unProceso({ dpto: "76" });

  // Aguas SAS aparece con dos grafías del nombre: la llave es la misma.
  await participa(a, "nit:900", "AGUAS SAS", {
    gano: true,
    estimado: "100",
    adjudicado: "90",
    fecha: "2025-03-01",
  });
  await participa(b, "nit:900", "AGUAS S.A.S.", { fecha: "2025-06-01" });
  await participa(b, "nom:obras del norte", "OBRAS DEL NORTE", {
    gano: true,
    estimado: "200",
    adjudicado: "200",
  });
  // Fuera de lo comparable: no deben contar.
  await participa(otroTipo, "nit:900", "AGUAS SAS", { gano: true });
  await participa(otroDpto, "nit:900", "AGUAS SAS", { gano: true });
  await participa(ficha, "nit:900", "AGUAS SAS", { gano: true });
});

describe("competidoresComparables", () => {
  it("agrupa por la llave del rival, no por cómo se escribe su nombre", async () => {
    const r = await competidoresComparables({
      id: ficha.id,
      tipoProyecto: "ptar",
      departamentoCodigo: "05",
    });
    const aguas = r.find((c) => c.proveedorKey === "nit:900");
    expect(aguas).toMatchObject({ presentados: 2, ganados: 1 });
    expect(r.map((c) => c.proveedorKey).sort()).toEqual(["nit:900", "nom:obras del norte"]);
  });
});

describe("historialComparable", () => {
  it("cuenta solo lo comparable: ni otro tipo, ni otro departamento, ni el propio proceso", async () => {
    const h = await historialComparable("nit:900", REF());
    expect(h).toMatchObject({
      participaciones: 2,
      adjudicaciones: 1,
      tasaExito: 0.5,
      ratioAdjudicadoSobreEstimado: 0.9,
      nitCanonico: null,
    });
  });

  it("lista sus procesos comparables recientes con el slug de su ficha", async () => {
    const h = await historialComparable("nit:900", REF());
    expect(h?.recientes.map((r) => [r.objeto, r.adjudicado])).toEqual([
      ["PTAR de Envigado", false],
      ["PTAR de Rionegro", true],
    ]);
    expect(h?.recientes[1].slug).toMatch(/^ptar-de-rionegro--CO1\.REQ\.\d+$/);
  });

  it("devuelve null para quien no tiene participaciones comparables", async () => {
    expect(await historialComparable("nit:111", REF())).toBeNull();
  });

  it("trae las sanciones con su cobertura aunque no tenga NIT", async () => {
    const h = await historialComparable("nom:obras del norte", REF());
    expect(h?.sanciones.cobertura.cruzablePorDocumento).toBe(false);
    expect(h?.sanciones.directas).toEqual([]);
  });
});
