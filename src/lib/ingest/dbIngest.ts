/**
 * Cableado real de la ingesta incremental contra Neon Postgres.
 *
 * Une el bucle puro (runIngest) con:
 *   - el fetch SODA real (sodaFetchPage),
 *   - un sink que aterriza en raw_record saltando duplicados no-op del solape
 *     D14 (si el último snapshot guardado de ese registro tiene el mismo
 *     payload_hash, no se reinserta — sigue siendo append-only, sin UPDATE),
 *   - la fila de control en sync_log (watermark anterior → MAX(watermark_to)).
 *
 * Requiere DATABASE_URL (Neon). El bucle y sus piezas son testeables sin base;
 * esto es el adaptador de IO que solo corre end-to-end con la base provista.
 */

import { randomUUID } from 'crypto';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/src/lib/db/client';
import { rawRecord, syncLog } from '@/src/lib/db/schema';
import { runIngest, type IngestSummary, type RawSink } from './runIngest';
import { sodaFetchPage } from './sodaFetch';
import { windowStart } from './watermark';
import type { IngestSource } from './sources';
import type { RawRecordInsert } from './mapRecord';

/** Watermark anterior = MAX(watermark_to) de las corridas exitosas (0.1 §4.5). */
export async function readLastWatermark(source: string): Promise<string | null> {
  const [row] = await db
    .select({ wm: sql<string | null>`max(${syncLog.watermarkTo})` })
    .from(syncLog)
    .where(and(eq(syncLog.source, source), inArray(syncLog.status, ['ok', 'partial'])));
  return row?.wm ?? null;
}

/** Hash del último snapshot guardado por cada source_record_id del lote. */
async function latestHashes(
  source: string,
  recordIds: string[],
): Promise<Map<string, string>> {
  if (recordIds.length === 0) return new Map();
  const rows = await db
    .selectDistinctOn([rawRecord.sourceRecordId], {
      recId: rawRecord.sourceRecordId,
      hash: rawRecord.payloadHash,
    })
    .from(rawRecord)
    .where(and(eq(rawRecord.source, source), inArray(rawRecord.sourceRecordId, recordIds)))
    .orderBy(rawRecord.sourceRecordId, desc(rawRecord.ingestedAt));
  return new Map(rows.map((r) => [r.recId, r.hash]));
}

/** Sink: inserta solo los snapshots que cambiaron; devuelve cuántos entraron. */
function makeDbSink(source: string): RawSink {
  return async (records: RawRecordInsert[]): Promise<number> => {
    if (records.length === 0) return 0;
    const ids = [...new Set(records.map((r) => r.sourceRecordId))];
    const seen = await latestHashes(source, ids);
    const toInsert = records.filter((r) => seen.get(r.sourceRecordId) !== r.payloadHash);
    if (toInsert.length === 0) return 0;
    await db.insert(rawRecord).values(toInsert);
    return toInsert.length;
  };
}

/** Corre la ingesta incremental de una fuente y registra la corrida. */
export async function ingestSource(
  source: IngestSource,
  opts: { pageSize?: number; marginDays?: number; maxPages?: number } = {},
): Promise<IngestSummary> {
  const lastWatermark = await readLastWatermark(source.source);
  const batchId = randomUUID();
  const from = windowStart(lastWatermark, opts.marginDays ?? 1);

  const [log] = await db
    .insert(syncLog)
    .values({ source: source.source, batchId, watermarkFrom: from, status: 'running' })
    .returning({ id: syncLog.id });

  try {
    const summary = await runIngest(
      { fetchPage: sodaFetchPage, sink: makeDbSink(source.source) },
      { source, lastWatermark, batchId, ...opts },
    );
    await db
      .update(syncLog)
      .set({
        finishedAt: new Date(),
        watermarkTo: summary.watermarkTo,
        recordsIngested: summary.recordsIngested,
        status: summary.reachedMaxPages ? 'partial' : 'ok',
      })
      .where(eq(syncLog.id, log.id));
    return summary;
  } catch (err) {
    await db
      .update(syncLog)
      .set({
        finishedAt: new Date(),
        status: 'failed',
        errorSummary: err instanceof Error ? err.message.slice(0, 500) : String(err),
      })
      .where(eq(syncLog.id, log.id));
    throw err;
  }
}
