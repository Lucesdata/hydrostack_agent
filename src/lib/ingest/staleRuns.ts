/**
 * Watchdog de corridas `sync_log` en estado 'running' que nunca cerraron.
 *
 * Si el proceso muere sin pasar por el catch de `ingestSource` (timeout duro
 * de la función, crash), la fila queda en 'running' para siempre — no hay
 * excepción que capturar. Este módulo decide, de forma pura, cuáles filas
 * son lo bastante viejas para asumir que el proceso que las abrió ya no
 * existe. El UPDATE real vive en dbIngest.ts (adaptador de IO, sin test
 * unitario, igual que el resto de esa capa).
 */

export interface RunningRow {
  id: string;
  startedAt: Date;
}

export function findStaleRunningIds(
  rows: RunningRow[],
  now: Date,
  maxDurationMs: number,
): string[] {
  const cutoff = now.getTime() - maxDurationMs;
  return rows.filter((r) => r.startedAt.getTime() < cutoff).map((r) => r.id);
}
