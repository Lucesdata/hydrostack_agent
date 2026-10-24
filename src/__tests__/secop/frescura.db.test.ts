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
import { frescuraDeProceso } from "@/src/lib/secop/frescura";

const RAW = "00000000-0000-4000-8000-0000000000a1";
const BATCH = "00000000-0000-4000-8000-0000000000b1";

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve("drizzle") });
  await db.execute(
    sql`insert into raw_record (id,source,source_record_id,payload_hash,batch_id,source_updated_at) values (${RAW},'secop_ii_procesos','CO1.REQ.1','h',${BATCH},'2026-10-17T08:30:00Z')`
  );
  await db.execute(
    sql`insert into proceso (id,secop_proceso_id,raw_record_id_actual) values ('00000000-0000-4000-8000-000000000001','CO1.REQ.1',${RAW}),('00000000-0000-4000-8000-000000000002','CO1.REQ.2',null)`
  );
  await db.execute(
    sql`insert into sync_log (source,status,started_at,finished_at) values
      ('secop_ii_procesos','ok','2026-10-18T11:00:00Z','2026-10-18T11:50:00Z'),
      ('secop_ii_procesos','ok','2026-10-19T11:00:00Z','2026-10-19T11:57:00Z'),
      ('secop_ii_procesos','failed','2026-10-20T11:00:00Z','2026-10-20T11:05:00Z'),
      ('secop_ii_contratos','ok','2026-10-21T11:00:00Z','2026-10-21T11:30:00Z')`
  );
}, 20000);

describe("frescuraDeProceso", () => {
  it("toma la última corrida ok de procesos (ni fallidas ni otra fuente) y la fecha de SECOP del registro actual", async () => {
    const f = await frescuraDeProceso("CO1.REQ.1");
    expect(f.error).toBe(false);
    expect(f.sincronizacion).toBe("2026-10-19T11:57:00.000Z");
    expect(f.publicadoSecop).toBe("2026-10-17T08:30:00.000Z");
  });

  it("un proceso sin registro crudo vinculado no inventa la fecha de SECOP", async () => {
    const f = await frescuraDeProceso("CO1.REQ.2");
    expect(f.publicadoSecop).toBeNull();
    expect(f.sincronizacion).toBe("2026-10-19T11:57:00.000Z");
  });
});
