/**
 * Serialización del archivo frío de `raw_record` (spec §D4).
 *
 * NDJSON en vez de un array JSON: permite escribir y verificar por lotes sin
 * cargar 129.511 payloads en memoria, y `wc -l` cuenta filas directamente.
 */

export interface FilaArchivo {
  id: string;
  source: string;
  sourceRecordId: string;
  payloadHash: string;
  ingestedAt: string;
  payload: Record<string, unknown>;
}

export function serializarLote(filas: FilaArchivo[]): string {
  if (filas.length === 0) return "";
  return filas.map((f) => JSON.stringify(f)).join("\n") + "\n";
}
