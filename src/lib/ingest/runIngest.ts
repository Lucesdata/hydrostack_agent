/**
 * Orquestador de ingesta incremental SODA → raw_record.
 *
 * Implementa el bucle keyset (0.2 §6): arranca en la ventana
 * `lastWatermark - margen` (D14) y avanza por cursor hasta agotar páginas. El
 * IO está inyectado (fetch de la fuente + sink a la capa cruda) para que el
 * bucle sea testeable sin red ni base: los adaptadores reales (SODA HTTP /
 * raw_record + sync_log) se cablean aparte.
 *
 * Append-only: el sink solo inserta; nunca actualiza ni borra. La deduplicación
 * real (no reprocesar lo que no cambió) la decide la capa de transformación vía
 * payload_hash, no la ingesta — aquí todo snapshot nuevo entra.
 */

import { randomUUID } from 'crypto';
import type { IngestSource } from './sources';
import { windowStart, maxWatermark } from './watermark';
import {
  buildKeysetPage,
  buildSweepPage,
  cursorFromRow,
  type SodaPageParams,
} from './pagination';
import { toRawRecord, type RawRecordInsert } from './mapRecord';

export type SodaFetcher = (
  dataset: string,
  params: SodaPageParams,
) => Promise<Record<string, unknown>[]>;

/** Inserta los registros y devuelve cuántos entraron de verdad (el adaptador
 *  de base puede saltar duplicados no-op del solape D14). */
export type RawSink = (records: RawRecordInsert[]) => Promise<number>;

export interface IngestOptions {
  source: IngestSource;
  /** Mayor watermark de la corrida anterior (de sync_log); null = backfill. */
  lastWatermark: string | null;
  batchId?: string;
  pageSize?: number;
  marginDays?: number;
  /** Tope de seguridad para no quedar en bucle si la fuente no decrece. */
  maxPages?: number;
}

export interface IngestSummary {
  source: string;
  batchId: string;
  windowStart: string | null;
  /** Watermark a persistir en sync_log; nunca retrocede del anterior. */
  watermarkTo: string | null;
  recordsIngested: number;
  pages: number;
  /** true → se cortó por tope; falta una continuación desde watermarkTo. */
  reachedMaxPages: boolean;
}

const DEFAULT_PAGE_SIZE = 1000;
const DEFAULT_MAX_PAGES = 10_000;

export async function runIngest(
  deps: { fetchPage: SodaFetcher; sink: RawSink },
  opts: IngestOptions,
): Promise<IngestSummary> {
  const { source, lastWatermark } = opts;
  const batchId = opts.batchId ?? randomUUID();
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const marginDays = opts.marginDays ?? 1;
  const maxPages = opts.maxPages ?? DEFAULT_MAX_PAGES;

  const start = windowStart(lastWatermark, marginDays);

  let cursor = null as ReturnType<typeof cursorFromRow>;
  let pages = 0;
  let recordsIngested = 0;
  let maxSeen: string | null = null;
  let reachedMaxPages = false;

  while (pages < maxPages) {
    const params = buildKeysetPage({
      watermarkField: source.watermarkField,
      idField: source.idField,
      sinceExclusive: start,
      cursor,
      sectorWhere: source.sectorWhere,
      limit: pageSize,
    });

    const rows = await deps.fetchPage(source.dataset, params);
    if (rows.length === 0) break;

    const records = rows.map((row) => toRawRecord(row, source, batchId));
    recordsIngested += await deps.sink(records);
    pages += 1;
    maxSeen = maxWatermark([maxSeen, ...rows.map((r) => r[source.watermarkField] as string)]);

    cursor = cursorFromRow(rows[rows.length - 1], source.watermarkField, source.idField);
    // Sin cursor utilizable no podemos avanzar sin arriesgar saltar/duplicar.
    if (cursor === null) break;
    // Última página (incompleta) → terminamos.
    if (rows.length < pageSize) break;

    if (pages >= maxPages) {
      reachedMaxPages = true;
      break;
    }
  }

  return {
    source: source.source,
    batchId,
    windowStart: start,
    watermarkTo: maxWatermark([lastWatermark, maxSeen]),
    recordsIngested,
    pages,
    reachedMaxPages,
  };
}

// ============================================================================
// Pasada 2: Sweep D21a — barre registros que la fuente trae SIN watermark.
// ============================================================================

export interface SweepOptions {
  source: IngestSource;
  batchId?: string;
  pageSize?: number;
  maxPages?: number;
}

export interface SweepSummary {
  source: string;
  batchId: string;
  pages: number;
  /** Cuántos snapshots aceptó el sink (descontando los descartados por hash). */
  recordsIngested: number;
  /** Cuántos registros vio el sweep (denominador del dedup). */
  totalScanned: number;
  reachedMaxPages: boolean;
}

const DEFAULT_SWEEP_PAGE_SIZE = 1000;
const DEFAULT_SWEEP_MAX_PAGES = 10_000;

/**
 * Bucle puro del sweep D21a (0.5 §3). Pagina por id nativo con `WHERE
 * watermark IS NULL` (Socrata no soporta keyset sobre NULL, así que el cursor
 * solo lleva el id). NO mueve el watermark — los registros sin timestamp no son
 * "nuevos", solo son "nunca-vistos-por-watermark"; la dedup la hace el hash en
 * el sink. IO inyectado (mismo patrón que `runIngest`) para que sea testeable
 * sin red ni base.
 */
export async function runSweep(
  deps: { fetchPage: SodaFetcher; sink: RawSink },
  opts: SweepOptions,
): Promise<SweepSummary> {
  const { source } = opts;
  const batchId = opts.batchId ?? randomUUID();
  const pageSize = opts.pageSize ?? DEFAULT_SWEEP_PAGE_SIZE;
  const maxPages = opts.maxPages ?? DEFAULT_SWEEP_MAX_PAGES;

  let pages = 0;
  let recordsIngested = 0;
  let totalScanned = 0;
  let cursor: string | null = null;
  let reachedMaxPages = false;

  while (pages < maxPages) {
    const params = buildSweepPage({
      idField: source.idField,
      watermarkField: source.watermarkField,
      sinceIdExclusive: cursor,
      sectorWhere: source.sectorWhere,
      limit: pageSize,
    });

    const rows = await deps.fetchPage(source.dataset, params);
    if (rows.length === 0) break;

    const records = rows.map((row) => toRawRecord(row, source, batchId));
    recordsIngested += await deps.sink(records);
    totalScanned += rows.length;
    pages += 1;

    const lastId = rows[rows.length - 1][source.idField];
    cursor = typeof lastId === 'string' && lastId ? lastId : null;
    if (cursor === null) break;
    if (rows.length < pageSize) break;

    if (pages >= maxPages) {
      reachedMaxPages = true;
      break;
    }
  }

  return {
    source: source.source,
    batchId,
    pages,
    recordsIngested,
    totalScanned,
    reachedMaxPages,
  };
}
