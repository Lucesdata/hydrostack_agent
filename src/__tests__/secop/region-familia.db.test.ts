/**
 * El panel de una región del hero contra un Postgres de verdad (PGlite con las
 * migraciones reales): el conteo tiene que ser el mismo del mapa
 * (`conteosPorFamilia()`), y la lista, los de mayor presupuesto con ficha.
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
import { conteosPorFamilia } from "@/src/lib/secop/conteos-familia";
import { esRegionValida, regionFamilia } from "@/src/lib/secop/region-familia";

let n = 0;
async function unProceso(v: {
  id?: string;
  geo?: string;
  tipo?: string;
  valor?: string | null;
  abierto?: boolean;
  referencia?: string | null;
  publicado?: string;
}) {
  n += 1;
  const id = v.id ?? `CO1.REQ.${n}`;
  await db.insert(proceso).values({
    secopProcesoId: id,
    referencia: v.referencia === undefined ? `REF-${n}` : v.referencia,
    objeto: `Obra ${n}`,
    geografiaId: v.geo ?? "05001",
    tipoProyecto: v.tipo ?? "acueducto",
    valorEstimado: v.valor === undefined ? String(n * 1_000_000) : v.valor,
    fechaPublicacion: v.publicado ?? "2026-03-01",
    estadoApertura: v.abierto ? "Abierto" : "Cerrado",
    estadoActual: v.abierto ? "Publicado" : "Adjudicado",
    fechaRecepcion: v.abierto ? "2099-12-31" : "2026-03-15",
  });
  return id;
}

const ids: Record<string, string> = {};

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
  await db.insert(geografia).values([
    {
      codigoDivipola: "05001",
      departamentoCodigo: "05",
      departamentoNombre: "Antioquia",
      municipioCodigo: "001",
      municipioNombre: "Medellín",
    },
    { codigoDivipola: "76001", departamentoCodigo: "76", departamentoNombre: "Valle del Cauca" },
  ]);
  ids.mayor = await unProceso({ valor: "9000000000", abierto: true });
  ids.segundo = await unProceso({ tipo: "ptap", valor: "5000000000" });
  ids.sinValor = await unProceso({ valor: null });
  for (let i = 0; i < 4; i++) await unProceso({ valor: String(100_000 + i) });
  // Cuentan para el mapa pero no se pueden enlazar: entran en el conteo, no en la lista.
  ids.sinFicha = await unProceso({ id: "PROC-1", valor: "99000000000" });
  await unProceso({ referencia: null, valor: "98000000000" });
  // No cuentan: otra familia, otro departamento, antes de 2026.
  await unProceso({ tipo: "ptar" });
  await unProceso({ geo: "76001" });
  await unProceso({ publicado: "2025-06-01" });
});

describe("regionFamilia", () => {
  it("el conteo es el mismo del mapa", async () => {
    const r = await regionFamilia("05", "potable");
    const mapa = (await conteosPorFamilia()).find((c) => c.dpto === "05")!;
    expect(r.conteo).toEqual(mapa.potable);
    expect(r.conteo).toEqual({ n: 9, abiertos: 1 });
    expect(r.nombre).toBe("Antioquia");
  });

  it("los cinco de mayor presupuesto que tienen ficha; sin presupuesto, al final", async () => {
    const r = await regionFamilia("05", "potable");
    expect(r.procesos).toHaveLength(5);
    expect(r.procesos[0]).toMatchObject({ id: ids.mayor, abierto: true, cierre: "2099-12-31" });
    expect(r.procesos[1].id).toBe(ids.segundo);
    expect(r.procesos.map((p) => p.id)).not.toContain(ids.sinFicha);
    expect(r.procesos.map((p) => p.id)).not.toContain(ids.sinValor);
    expect(r.procesos[1].abierto).toBe(false);
  });

  it("una familia sin procesos en la región: conteo en cero y lista vacía", async () => {
    const r = await regionFamilia("05", "redes");
    expect(r).toMatchObject({ familia: "redes", conteo: { n: 0, abiertos: 0 }, procesos: [] });
  });

  it("solo regiones del mapa y las tres familias", () => {
    expect(esRegionValida("05", "potable")).toBe(true);
    expect(esRegionValida("05", "otros")).toBe(false);
    expect(esRegionValida("00", "potable")).toBe(false);
    expect(esRegionValida("5", "residual")).toBe(false);
    expect(esRegionValida(undefined, "redes")).toBe(false);
  });
});
