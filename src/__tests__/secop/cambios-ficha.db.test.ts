import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { migrate } from "drizzle-orm/pglite/migrator";
import { sql } from "drizzle-orm";
vi.mock("@/src/lib/db/client", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  return { db: drizzle(new PGlite()) };
});
import { db } from "@/src/lib/db/client";
import { cambiosDeProceso } from "@/src/lib/secop/ficha";
beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve("drizzle") });
  await db.execute(
    sql`insert into proceso (id,secop_proceso_id) values ('00000000-0000-4000-8000-000000000001','CO1.REQ.1'),('00000000-0000-4000-8000-000000000002','CO1.REQ.2')`
  );
  await db.execute(
    sql`insert into al_proceso_evento (proceso_id,secop_proceso_id,tipo_evento,detected_at,fecha_cierre_anterior,fecha_cierre_nueva,payload_hash) values ('00000000-0000-4000-8000-000000000001','CO1.REQ.1','adenda','2026-10-06T15:00:00Z','2026-10-19','2026-10-22','a'),('00000000-0000-4000-8000-000000000001','CO1.REQ.1','apertura','2026-10-01T15:00:00Z',null,null,'b'),('00000000-0000-4000-8000-000000000002','CO1.REQ.2','adenda','2026-10-07T15:00:00Z',null,null,'c')`
  );
}, 20000);
describe("Historial público de una ficha", () => {
  it("aísla el proceso y conserva fechas DATE ordenando por detección", async () => {
    const r = await cambiosDeProceso("CO1.REQ.1");
    expect(r.error).toBe(false);
    expect(r.cambios).toHaveLength(2);
    expect(r.cambios[0].fechaCierreNueva).toBe("2026-10-22");
    expect(r.cambios[0].tipoEvento).toBe("adenda");
    expect(r.cambios[1].tipoEvento).toBe("apertura");
    expect(r.cambios[0]).not.toHaveProperty("delta");
  });
  it("distingue ausencia de registros de error", async () => {
    expect(await cambiosDeProceso("CO1.REQ.99")).toEqual({ error: false, cambios: [] });
  });
  it("mantiene un error de lectura distinto de un historial sin novedades", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const lectura = vi.spyOn(db, "select").mockImplementationOnce(() => {
      throw new Error("base no disponible");
    });
    expect(await cambiosDeProceso("CO1.REQ.1")).toEqual({ error: true, cambios: [] });
    expect(log).toHaveBeenCalled();
    lectura.mockRestore();
    log.mockRestore();
  });
});
