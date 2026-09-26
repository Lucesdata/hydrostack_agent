/**
 * `entidadesCompradoras` contra PGlite con las migraciones reales: agrupación,
 * `count(*) over ()` y el filtro de abiertos son SQL que un mock no ejecuta.
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
import { entidad, geografia, proceso } from "@/src/lib/db/schema";
import { entidadesCompradoras } from "@/src/lib/secop/compradores";

let n = 0;
const abierto = { estadoApertura: "Abierto", estadoActual: "Publicado" } as const;

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
  await db.insert(geografia).values({
    codigoDivipola: "05000",
    departamentoCodigo: "05",
    departamentoNombre: "Antioquia",
    municipioCodigo: "000",
  });
  const [epm, alcaldia, sinGeo] = await db
    .insert(entidad)
    .values([
      { nitCanonico: "1", nombre: "EMPRESAS PUBLICAS DE MEDELLIN E.S.P.", geografiaId: "05000" },
      { nitCanonico: "2", nombre: "ALCALDIA MUNICIPAL DE URRAO", geografiaId: "05000" },
      { nitCanonico: "3", nombre: "MINISTERIO DE VIVIENDA", nivelGobierno: "nacional" },
    ])
    .returning({ id: entidad.id });
  const p = (entidadId: string, extra: Partial<typeof proceso.$inferInsert> = {}) => ({
    secopProcesoId: `CO1.REQ.${++n}`,
    entidadId,
    ...abierto,
    ...extra,
  });
  await db.insert(proceso).values([
    p(epm.id, { valorEstimado: "900" }),
    p(epm.id, { valorEstimado: "100" }),
    p(epm.id, { valorEstimado: "0" }),
    p(alcaldia.id, { valorEstimado: null }),
    p(sinGeo.id, { valorEstimado: "50" }),
    p(sinGeo.id),
    // Cerrados: no cuentan.
    p(alcaldia.id, { estadoApertura: "Cerrado", estadoActual: "Adjudicado" }),
    p(alcaldia.id, { estadoApertura: "Cerrado", estadoActual: "Adjudicado" }),
    p(alcaldia.id, { estadoApertura: "Cerrado", estadoActual: "Adjudicado" }),
  ]);
});

describe("entidadesCompradoras (SQL real)", () => {
  it("ordena por procesos abiertos y no cuenta los cerrados", async () => {
    const { entidades } = await entidadesCompradoras();
    expect(entidades.map((e) => [e.nombre, e.n])).toEqual([
      ["EMPRESAS PUBLICAS DE MEDELLIN E.S.P.", 3],
      ["MINISTERIO DE VIVIENDA", 2],
      ["ALCALDIA MUNICIPAL DE URRAO", 1],
    ]);
  });

  it("suma solo el presupuesto publicado y dice sobre cuántos", async () => {
    const epm = (await entidadesCompradoras()).entidades[0];
    expect(epm.montoAbierto).toBe(1000);
    expect(epm.nConMonto).toBe(2);
  });

  it("trae departamento y clase, y null si la entidad no tiene sede resuelta", async () => {
    const { entidades } = await entidadesCompradoras();
    expect(entidades[0].departamento).toBe("Antioquia");
    expect(entidades[0].clase).toBe("esp");
    expect(entidades[1].departamento).toBeNull();
    expect(entidades[1].clase).toBe("nacional");
  });

  it("el total cuenta todas las entidades, aunque el límite corte la lista", async () => {
    const r = await entidadesCompradoras(1);
    expect(r.entidades).toHaveLength(1);
    expect(r.totalEntidades).toBe(3);
  });
});
