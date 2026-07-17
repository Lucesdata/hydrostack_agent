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
import {
  runIngest,
  runSweep,
  type IngestSummary,
  type RawSink,
  type SweepSummary,
} from './runIngest';
import { sodaFetchPage } from './sodaFetch';
import { windowStart } from './watermark';
import type { IngestSource } from './sources';
import type { RawRecordInsert } from './mapRecord';
import { resolveDatasetId } from '@/src/lib/secop/datasetResolver';
import { findStaleRunningIds } from './staleRuns';
import { summarizeIngestError } from './errorSummary';

/**
 * Umbral del watchdog: generoso por encima de `maxDuration = 300` del cron
 * (app/api/cron/ingest/route.ts) para no pisar una corrida legítima en curso.
 */
const STALE_RUNNING_MS = 15 * 60 * 1000;

/**
 * Marca como `failed` cualquier corrida `running` de esta fuente más vieja
 * que el umbral — el proceso que la abrió murió sin pasar por el catch de
 * `ingestSource` (timeout duro, crash), así que nunca va a cerrarla. Corre
 * antes de abrir una fila nueva para no acumular basura en `sync_log`.
 */
export async function failStaleRuns(
  source: string,
  opts: { now?: Date; maxDurationMs?: number } = {},
): Promise<string[]> {
  const now = opts.now ?? new Date();
  const maxDurationMs = opts.maxDurationMs ?? STALE_RUNNING_MS;

  const running = await db
    .select({ id: syncLog.id, startedAt: syncLog.startedAt })
    .from(syncLog)
    .where(and(eq(syncLog.source, source), eq(syncLog.status, 'running')));

  const staleIds = findStaleRunningIds(running, now, maxDurationMs);
  if (staleIds.length === 0) return [];

  await db
    .update(syncLog)
    .set({
      finishedAt: now,
      status: 'failed',
      errorSummary: `watchdog: marcada failed — running > ${maxDurationMs}ms sin cerrar (proceso murió sin actualizar sync_log)`,
    })
    .where(inArray(syncLog.id, staleIds));

  return staleIds;
}

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
export function makeDbSink(source: string): RawSink {
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

/**
 * Pasada 2 del incremental (D21a / 0.5 §3): cabléa el bucle puro `runSweep`
 * contra el fetch SODA real y el sink que escribe en `raw_record`. La dedup la
 * hace el `payload_hash` (`makeDbSink`); el watermark NO avanza porque estos
 * registros vienen sin `ultima_actualizacion`.
 *
 * Aplicable a `secop_ii_contratos` (≈43% sin timestamp en muestra). Procesos
 * no lo necesita: `fecha_de_ultima_publicaci` viene casi 100% poblado.
 */
export async function sweepWithoutWatermark(
  source: IngestSource,
  opts: { pageSize?: number; maxPages?: number; batchId?: string } = {},
): Promise<SweepSummary> {
  const dataset = await resolveDatasetId(source.datasetKey);
  return runSweep(
    { fetchPage: sodaFetchPage, sink: makeDbSink(source.source) },
    { source: { ...source, dataset }, ...opts },
  );
}

export type { IngestSummary, SweepSummary };

/** Corre la ingesta incremental de una fuente y registra la corrida. */
export async function ingestSource(
  source: IngestSource,
  opts: { pageSize?: number; marginDays?: number; maxPages?: number } = {},
): Promise<IngestSummary> {
  await failStaleRuns(source.source);

  const dataset = await resolveDatasetId(source.datasetKey);
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
      { source: { ...source, dataset }, lastWatermark, batchId, ...opts },
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
        errorSummary: summarizeIngestError(err),
      })
      .where(eq(syncLog.id, log.id));
    throw err;
  }
}
