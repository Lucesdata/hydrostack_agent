import { describe, expect, it, vi, beforeEach } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import type { RawRecordInsert } from "@/src/lib/ingest/mapRecord";

const insertValuesMock = vi.fn();
const onConflictMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/src/lib/db/client", () => ({
  db: {
    insert: () => ({
      values: (...args: unknown[]) => {
        insertValuesMock(...args);
        return { onConflictDoUpdate: (...cArgs: unknown[]) => onConflictMock(...cArgs) };
      },
    }),
  },
}));

import { makeDbSink } from "@/src/lib/ingest/dbIngest";

function record(over: Partial<RawRecordInsert> = {}): RawRecordInsert {
  return {
    source: "secop_ii_procesos",
    sourceRecordId: "CO1.REQ.1",
    payload: { a: 1 },
    payloadHash: "hash1",
    sourceUpdatedAt: null,
    batchId: "b1",
    ...over,
  };
}

describe("makeDbSink", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserta las filas tal cual si no hay (source, sourceRecordId) repetidos", async () => {
    const sink = makeDbSink("secop_ii_procesos");
    const records = [
      record({ sourceRecordId: "CO1.REQ.1" }),
      record({ sourceRecordId: "CO1.REQ.2" }),
    ];
    const n = await sink(records);
    expect(insertValuesMock).toHaveBeenCalledWith(records);
    expect(n).toBe(2);
  });

  it("deduplica por (source, sourceRecordId) dentro del mismo lote antes del upsert — se queda con la última ocurrencia", async () => {
    const sink = makeDbSink("secop_ii_procesos");
    const first = record({ sourceRecordId: "CO1.REQ.1", payloadHash: "old" });
    const second = record({ sourceRecordId: "CO1.REQ.2" });
    const dup = record({ sourceRecordId: "CO1.REQ.1", payloadHash: "new" });
    const n = await sink([first, second, dup]);

    const inserted = insertValuesMock.mock.calls[0][0] as (typeof first)[];
    expect(inserted).toHaveLength(2);
    expect(inserted.map((r) => r.sourceRecordId).sort()).toEqual(["CO1.REQ.1", "CO1.REQ.2"]);
    expect(inserted.find((r) => r.sourceRecordId === "CO1.REQ.1")?.payloadHash).toBe("new");
    expect(n).toBe(2);
  });

  it("el upsert solo actualiza si cambió el hash o el timestamp de la fuente (no reescribe filas iguales)", async () => {
    const sink = makeDbSink("secop_ii_contratos");
    await sink([record({ source: "secop_ii_contratos" })]);

    const conflict = onConflictMock.mock.calls[0][0] as { setWhere?: unknown; target: unknown[] };
    expect(conflict.target).toHaveLength(2);
    expect(conflict.setWhere).toBeDefined();
    const { sql: text } = new PgDialect().sqlToQuery(conflict.setWhere as SQL);
    expect(text).toContain('"payload_hash" IS DISTINCT FROM excluded.payload_hash');
    expect(text).toContain('"source_updated_at" IS DISTINCT FROM excluded.source_updated_at');
  });

  it("no toca la base si el lote queda vacío", async () => {
    const sink = makeDbSink("secop_ii_procesos");
    const n = await sink([]);
    expect(insertValuesMock).not.toHaveBeenCalled();
    expect(n).toBe(0);
  });
});
