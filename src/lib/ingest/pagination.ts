/**
 * Paginación keyset sobre SODA (0.2 §6.2).
 *
 * No usamos `$offset`: en datasets grandes Socrata lo degrada y puede saltar
 * filas. En su lugar ordenamos por `(watermarkField, idField)` y avanzamos con
 * un cursor `(watermark, id)` de la última fila de la página anterior:
 *
 *   $order = watermarkField ASC, idField ASC
 *   $where = watermark > cursor.w
 *            OR (watermark = cursor.w AND id > cursor.id)
 *
 * El tiebreaker por id da estabilidad cuando varias filas comparten timestamp.
 * La primera página (sin cursor) usa la cota inferior de la ventana incremental
 * (`sinceExclusive`, ver watermark.ts). Páginas siguientes usan solo el cursor,
 * que ya es más restrictivo que la ventana.
 */

export interface KeysetCursor {
  readonly watermark: string;
  readonly id: string;
}

export interface SodaPageParams {
  $order: string;
  $limit: number;
  $where?: string;
}

/** Escapa comillas simples para SoQL. */
function soqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}

export function buildKeysetPage(opts: {
  watermarkField: string;
  idField: string;
  /** Cota inferior de la ventana incremental (solo aplica en la 1ª página). */
  sinceExclusive?: string | null;
  /** Cursor de la última fila de la página anterior. */
  cursor?: KeysetCursor | null;
  limit: number;
}): SodaPageParams {
  const { watermarkField, idField, sinceExclusive, cursor, limit } = opts;

  let where: string | undefined;
  if (cursor) {
    const w = soqlEscape(cursor.watermark);
    const id = soqlEscape(cursor.id);
    where =
      `${watermarkField} > '${w}' ` +
      `OR (${watermarkField} = '${w}' AND ${idField} > '${id}')`;
  } else if (sinceExclusive) {
    where = `${watermarkField} > '${soqlEscape(sinceExclusive)}'`;
  }

  return {
    $order: `${watermarkField} ASC, ${idField} ASC`,
    $limit: limit,
    ...(where ? { $where: where } : {}),
  };
}

/** Extrae el cursor de la última fila de una página. */
export function cursorFromRow(
  row: Record<string, unknown>,
  watermarkField: string,
  idField: string,
): KeysetCursor | null {
  const watermark = row[watermarkField];
  const id = row[idField];
  if (typeof watermark !== 'string' || !watermark) return null;
  if (id == null || String(id) === '') return null;
  return { watermark, id: String(id) };
}
