/**
 * La fecha de la última ingesta contra Postgres de verdad (PGlite con las
 * migraciones reales): lo que se prueba es el filtro por fuente y estado.
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
import { syncLog } from "@/src/lib/db/schema";
import { ultimaActualizacion } from "@/src/lib/secop/actualizacion";

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
});

describe("ultimaActualizacion (SQL real)", () => {
  it("sin corridas registradas devuelve null: la línea se oculta", async () => {
    expect(await ultimaActualizacion()).toBeNull();
  });

  it("la última corrida de procesos que terminó bien, no la fallida ni la de contratos", async () => {
    await db.insert(syncLog).values([
      { source: "secop_ii_procesos", status: "ok", finishedAt: new Date("2026-09-20T10:00:00Z") },
      {
        source: "secop_ii_procesos",
        status: "partial",
        finishedAt: new Date("2026-09-24T10:00:00Z"),
      },
      {
        source: "secop_ii_procesos",
        status: "failed",
        finishedAt: new Date("2026-09-27T10:00:00Z"),
      },
      { source: "secop_ii_contratos", status: "ok", finishedAt: new Date("2026-09-28T10:00:00Z") },
      { source: "secop_ii_procesos", status: "running" },
    ]);
    expect((await ultimaActualizacion())?.toISOString()).toBe("2026-09-24T10:00:00.000Z");
  });
});
