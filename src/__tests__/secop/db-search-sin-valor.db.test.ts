/**
 * El prefiltro de cuantía contra PGlite con las migraciones reales
 * (PENDIENTES §43): con `incluirSinValor`, los procesos sin presupuesto
 * publicado entran, pero detrás de los que cumplen el mínimo.
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
import { proceso } from "@/src/lib/db/schema";
import { searchProcesosDb } from "@/src/lib/secop/db-search";

const base = {
  apertura: "Abierto" as const,
  soloAgua: true,
  valorMin: 100,
  orden: "fecha" as const,
};

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
  const p = (id: string, fecha: string, valorEstimado: string | null) => ({
    secopProcesoId: id,
    objeto: "Optimización del acueducto municipal",
    estadoApertura: "Abierto",
    fechaPublicacion: fecha,
    valorEstimado,
  });
  await db
    .insert(proceso)
    .values([
      p("CUMPLE-VIEJO", "2026-09-01", "500"),
      p("CUMPLE-NUEVO", "2026-09-10", "200"),
      p("SIN-DATO-CERO", "2026-09-20", "0"),
      p("SIN-DATO-NULO", "2026-09-21", null),
      p("DEBAJO-DEL-MIN", "2026-09-22", "50"),
    ]);
});

const ids = (r: { items: { id: string }[] }) => r.items.map((i) => i.id);

describe("searchProcesosDb · valorMin e incluirSinValor", () => {
  it("sin la opción, el mínimo deja fuera los sin presupuesto (comportamiento de siempre)", async () => {
    expect(ids(await searchProcesosDb(base))).toEqual(["CUMPLE-NUEVO", "CUMPLE-VIEJO"]);
  });

  it("con la opción entran los sin presupuesto, detrás aunque sean más recientes", async () => {
    expect(ids(await searchProcesosDb({ ...base, incluirSinValor: true }))).toEqual([
      "CUMPLE-NUEVO",
      "CUMPLE-VIEJO",
      "SIN-DATO-CERO",
      "SIN-DATO-NULO",
    ]);
  });

  it("no desplazan a los que cumplen cuando no hay plazas para todos", async () => {
    const r = await searchProcesosDb({ ...base, incluirSinValor: true, pageSize: 2 });
    expect(ids(r)).toEqual(["CUMPLE-NUEVO", "CUMPLE-VIEJO"]);
  });

  it("un valor publicado por debajo del mínimo sigue fuera", async () => {
    expect(ids(await searchProcesosDb({ ...base, incluirSinValor: true }))).not.toContain(
      "DEBAJO-DEL-MIN"
    );
  });
});
