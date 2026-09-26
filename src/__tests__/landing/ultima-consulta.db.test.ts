/**
 * `getUltimaConsultaSecop` contra PGlite con las migraciones reales: filtra por
 * fuente y por estado, y eso es SQL que un mock no ejecuta.
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
import { getUltimaConsultaSecop } from "@/src/lib/landing/ultima-consulta";

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
});

describe("getUltimaConsultaSecop (SQL real)", () => {
  it("sin corridas, null", async () => {
    expect(await getUltimaConsultaSecop()).toBeNull();
  });

  it("la última corrida terminada de procesos; ignora fallidas, en curso y contratos", async () => {
    await db.insert(syncLog).values([
      { source: "secop_ii_procesos", status: "ok", finishedAt: new Date("2026-09-25T11:05:00Z") },
      {
        source: "secop_ii_procesos",
        status: "partial",
        finishedAt: new Date("2026-09-26T11:04:00Z"),
      },
      {
        source: "secop_ii_procesos",
        status: "failed",
        finishedAt: new Date("2026-09-26T15:00:00Z"),
      },
      { source: "secop_ii_procesos", status: "running" },
      { source: "secop_ii_contratos", status: "ok", finishedAt: new Date("2026-09-26T17:00:00Z") },
    ]);
    expect(await getUltimaConsultaSecop()).toBe("2026-09-26T11:04:00.000Z");
  });
});
