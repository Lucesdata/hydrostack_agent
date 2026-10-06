/**
 * `recibeOfertas` contra PGlite con las migraciones reales: el matching y las
 * alertas usan la misma regla de la portada (`condicionAbierto()`), no
 * `estado_apertura = 'Abierto'` a secas (spec 2026-10-05-ficha-viva-ciclo-de-vida, M7–M9).
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

function dia(offset: number): string {
  return new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
}

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
  const p = (id: string, v: { estado?: string; recepcion?: string | null }) => ({
    secopProcesoId: id,
    objeto: "Optimización del acueducto municipal",
    estadoApertura: "Abierto",
    estadoActual: v.estado ?? "Publicado",
    fechaPublicacion: "2026-09-01",
    fechaRecepcion: v.recepcion === undefined ? dia(20) : v.recepcion,
    valorEstimado: "500000000",
  });
  await db.insert(proceso).values([
    p("VIGENTE", {}),
    // Márgenes de días: `dia()` es UTC y «hoy» en la consulta es Colombia.
    p("VENCIDA", { recepcion: dia(-10) }),
    p("REGIMEN-ESPECIAL-SIN-FECHA", { recepcion: null }),
    p("SELECCIONADO", { estado: "Seleccionado" }),
    p("EVALUACION", { estado: "Evaluación" }),
  ]);
});

const ids = (r: { items: { id: string }[] }) => r.items.map((i) => i.id).sort();

describe("searchProcesosDb · recibeOfertas", () => {
  it("solo los que reciben ofertas hoy, con la regla de la portada", async () => {
    expect(ids(await searchProcesosDb({ recibeOfertas: true, soloAgua: true }))).toEqual([
      "VIGENTE",
    ]);
  });

  it('`apertura: "Abierto"` a secas dejaba pasar los cinco (la regla vieja)', async () => {
    const r = await searchProcesosDb({ apertura: "Abierto", soloAgua: true });
    expect(r.items).toHaveLength(5);
  });
});
