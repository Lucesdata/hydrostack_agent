/**
 * Utilidades puras para escrituras por lotes.
 *
 * Postgres limita cada statement a 65.535 parámetros bind: un INSERT multi-fila
 * debe trocearse. Y un `INSERT ... ON CONFLICT DO UPDATE` no admite dos filas
 * con la misma clave de conflicto en el MISMO statement ("cannot affect row a
 * second time"), así que antes de trocear hay que deduplicar por esa clave.
 */

/** Parte `rows` en trozos de hasta `size` elementos, preservando el orden. */
export function chunk<T>(rows: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    out.push(rows.slice(i, i + size));
  }
  return out;
}

/**
 * Deduplica por clave conservando la ÚLTIMA aparición — el mismo resultado que
 * dejaban los upserts secuenciales fila a fila (el último sobrescribe).
 */
export function dedupLastWins<T>(rows: readonly T[], keyOf: (row: T) => string): T[] {
  const byKey = new Map<string, T>();
  for (const row of rows) byKey.set(keyOf(row), row);
  return [...byKey.values()];
}
