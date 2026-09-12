import { describe, it, expect, vi, beforeEach } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

/**
 * Regresión del CRÍTICO 1 del último whole-branch review: `vaciarPayloads()`
 * (0.9) pone el payload en NULL tras la primera corrida exitosa. Si
 * `latestSnapshots` no filtra `payload IS NOT NULL`, la segunda corrida
 * vuelve a traer esa fila con `payload: null` y `mapProcesoRow` revienta con
 * "Cannot read properties of null (reading 'id_del_proceso')" — silenciosamente,
 * porque el cron es el único caller. Este test corre el transform dos veces
 * sobre la misma fila sembrada y exige que la segunda sea un no-op limpio.
 */

const dialect = new PgDialect();

interface FakeRow {
  id: string;
  payload: Record<string, unknown> | null;
}

let store: FakeRow[];

vi.mock("@/src/lib/db/client", () => ({
  db: {
    select: (fields: Record<string, unknown>) => ({
      from: () => ({
        where: () => Promise.resolve([{ total: store.length }]),
      }),
    }),
    selectDistinctOn: (_cols: unknown, _fields: unknown) => ({
      from: () => ({
        where: (cond: unknown) => ({
          orderBy: () => {
            // Interpreta el SQL real generado por el where de latestSnapshots
            // en vez de hardcodear el filtro: si al fix se le quita el
            // isNotNull, este mock deja de filtrar y el test revienta igual
            // que en producción.
            const { sql: text } = dialect.sqlToQuery(cond as never);
            const filtraNulos = text.toLowerCase().includes("is not null");
            const rows = filtraNulos ? store.filter((r) => r.payload !== null) : store.slice();
            return Promise.resolve(rows.map((r) => ({ id: r.id, payload: r.payload })));
          },
        }),
      }),
    }),
    update: () => ({
      set: (patch: { payload: null }) => ({
        where: (cond: unknown) => ({
          returning: () => {
            const { params } = dialect.sqlToQuery(cond as never);
            const ids = new Set(params as string[]);
            const tocadas: { id: string }[] = [];
            for (const row of store) {
              if (ids.has(row.id)) {
                row.payload = patch.payload;
                tocadas.push({ id: row.id });
              }
            }
            return Promise.resolve(tocadas);
          },
        }),
      }),
    }),
  },
}));

vi.mock("@/src/lib/transform/writers", () => {
  class GeoResolver {
    static async load() {
      return new GeoResolver();
    }
    size() {
      return 1;
    }
    resolve() {
      return null;
    }
  }
  return {
    GeoResolver,
    batchQuarantine: vi.fn(async () => {}),
    batchUpsertEntidades: vi.fn(async () => new Map<string, string>()),
    batchUpsertProveedores: vi.fn(async () => new Map<string, string>()),
    batchUpsertProcesos: vi.fn(async (_db: unknown, items: unknown[]) => items.length),
    batchUpsertContratos: vi.fn(async (_db: unknown, items: unknown[]) => items.length),
    loadPortafolioIndex: vi.fn(async () => new Map<string, string>()),
  };
});

import { runTransform } from "@/src/lib/transform/orchestrator";

describe("runTransform — segunda corrida tras vaciarPayloads", () => {
  beforeEach(() => {
    store = [{ id: "raw-1", payload: { id_del_proceso: "CO1.REQ.999" } }];
  });

  it("la primera corrida transforma y vacía el payload; la segunda es un no-op limpio, no un throw", async () => {
    const primera = await runTransform();
    expect(primera.procesos.uniqueRecords).toBe(1);
    expect(primera.procesos.cuarentena).toBe(0);
    expect(primera.procesos.payloadsVaciados).toBe(1);
    expect(store[0].payload).toBeNull();

    await expect(runTransform()).resolves.not.toThrow();
    const segunda = await runTransform();
    expect(segunda.procesos.uniqueRecords).toBe(0);
    expect(segunda.procesos.cuarentena).toBe(0);
    expect(segunda.procesos.payloadsVaciados).toBe(0);
  });
});
