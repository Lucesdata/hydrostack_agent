/**
 * Mapeo fila SODA cruda → shape de inserción en raw_record (ELT landing).
 *
 * No interpreta ni recorta el payload: lo guarda tal cual (D6 — la basura vive
 * en crudo). Solo deriva los metadatos que la capa cruda indexa:
 *   - source / sourceRecordId / batchId   (claves de la fila)
 *   - payloadHash                          (detección de cambios, D10)
 *   - sourceUpdatedAt                      (Date para la columna timestamptz)
 *
 * El watermark crudo (string) se usa aparte para el cursor keyset; aquí lo
 * convertimos a Date solo para la columna. Si no parsea, va NULL: la fila no se
 * descarta (la capa cruda nunca rechaza), solo queda sin timestamp.
 */

import { payloadHash } from './hash';
import { parseFloatingDate } from './watermark';
import type { IngestSource } from './sources';

export interface RawRecordInsert {
  source: string;
  sourceRecordId: string;
  payload: Record<string, unknown>;
  payloadHash: string;
  sourceUpdatedAt: Date | null;
  batchId: string;
}

export function toRawRecord(
  row: Record<string, unknown>,
  source: IngestSource,
  batchId: string,
): RawRecordInsert {
  return {
    source: source.source,
    sourceRecordId: String(row[source.idField] ?? ''),
    payload: row,
    payloadHash: payloadHash(row, source.volatileFields),
    sourceUpdatedAt: parseFloatingDate(row[source.watermarkField]),
    batchId,
  };
}
