/**
 * El orden de la vitrina contra un Postgres de verdad (PGlite con las
 * migraciones reales): el `case` de relevancia, el día en Colombia y que el
 * total no cambie. Mismo patrón que `muestra-portada.db.test.ts`.
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
import { procesosDeVitrina } from "@/src/lib/secop/vitrina";

function dia(offset: number): string {
  return new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
}

async function unProceso(id: string, v: { tipo: string | null; publicado: string; recepcion?: string }) {
  await db.insert(proceso).values({
    secopProcesoId: id,
    objeto: `Obra ${id}`,
    estadoApertura: "Abierto",
    estadoActual: "Publicado",
    tipoProyecto: v.tipo,
    fechaPublicacion: v.publicado,
    fechaRecepcion: v.recepcion ?? null,
  });
}

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
  // El más reciente de todos es «otros»; el siguiente, de agua pero vencido.
  await unProceso("CO1.REQ.OTROS", { tipo: "otros", publicado: dia(0) });
  await unProceso("CO1.REQ.VENCIDO", { tipo: "ptar", publicado: dia(0), recepcion: dia(-10) });
  await unProceso("CO1.REQ.SINTIPO", { tipo: null, publicado: dia(-1) });
  await unProceso("CO1.REQ.ACUEDUCTO", { tipo: "acueducto", publicado: dia(-3) });
  await unProceso("CO1.REQ.PTAR", { tipo: "ptar", publicado: dia(-2), recepcion: dia(20) });
});

describe("el orden de los abiertos", () => {
  it("agua que recibe ofertas, luego sin subsistema, al final la recepción vencida", async () => {
    const p = await procesosDeVitrina("abiertos", 1);
    expect(p.items.map((i) => i.secopProcesoId)).toEqual([
      "CO1.REQ.PTAR",
      "CO1.REQ.ACUEDUCTO",
      "CO1.REQ.OTROS",
      "CO1.REQ.SINTIPO",
      "CO1.REQ.VENCIDO",
    ]);
  });

  it("ordena, no filtra: el total sigue siendo el de condicionAbierto()", async () => {
    expect((await procesosDeVitrina("abiertos", 1)).total).toBe(5);
  });
});
