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
  /** Filtro sectorial de ingesta (ADR-0001): se ANDea con la condición de cursor. */
  sectorWhere?: string | null;
  limit: number;
}): SodaPageParams {
  const { watermarkField, idField, sinceExclusive, cursor, sectorWhere, limit } = opts;

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

  // La cláusula de cursor tiene un OR de nivel superior; para ANDearla con el
  // filtro sectorial hay que parentizarla. Sin `sectorWhere` la salida queda
  // IDÉNTICA (compat hacia atrás): backfill sin cota → sin $where.
  const combined = combineWhere(where, sectorWhere);

  return {
    $order: `${watermarkField} ASC, ${idField} ASC`,
    $limit: limit,
    ...(combined ? { $where: combined } : {}),
  };
}

/** AND de la cláusula de cursor/ventana con el filtro sectorial, parentizando. */
function combineWhere(cursorWhere?: string, sectorWhere?: string | null): string | undefined {
  const sector = sectorWhere ? `(${sectorWhere})` : null;
  if (cursorWhere && sector) return `(${cursorWhere}) AND ${sector}`;
  if (cursorWhere) return cursorWhere;
  return sector ?? undefined;
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

/**
 * Página del sweep D21a (0.5): barre registros SIN watermark, paginando por id
 * nativo. Socrata no soporta keyset sobre NULL, así que el cursor solo lleva el
 * id; el orden por id da estabilidad determinista entre páginas.
 *
 *   $order = idField ASC
 *   $where = watermarkField IS NULL
 *            AND idField > '{cursor.id}'    (en páginas siguientes)
 *
 * El watermark NO se mueve por el sweep (estos registros no tienen timestamp);
 * la dedup la hace el payload_hash en el sink.
 */
export function buildSweepPage(opts: {
  idField: string;
  watermarkField: string;
  /** Id de la última fila de la página anterior (cursor del sweep). */
  sinceIdExclusive?: string | null;
  /** Filtro sectorial de ingesta (ADR-0001): se ANDea como condición extra. */
  sectorWhere?: string | null;
  limit: number;
}): SodaPageParams {
  const { idField, watermarkField, sinceIdExclusive, sectorWhere, limit } = opts;
  const conditions = [`${watermarkField} IS NULL`];
  if (sinceIdExclusive) {
    conditions.push(`${idField} > '${soqlEscape(sinceIdExclusive)}'`);
  }
  // Todas las condiciones del sweep son AND, así que el filtro sectorial entra
  // como una condición más (sin riesgo de precedencia). Sin él, salida idéntica.
  if (sectorWhere) {
    conditions.push(`(${sectorWhere})`);
  }
  return {
    $order: `${idField} ASC`,
    $limit: limit,
    $where: conditions.join(' AND '),
  };
}
