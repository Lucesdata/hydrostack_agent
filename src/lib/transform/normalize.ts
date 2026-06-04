/**
 * Normalizadores de valor para la transformación raw → canónico (0.2 §3, H3).
 *
 * La fuente entrega basura tipada como texto: centinelas ("No Definido"),
 * booleanos como "Si"/"No", money y fechas como strings. Estos helpers son el
 * paso previo a tipar cualquier campo. Regla de oro (D3/H3): un centinela NO
 * crea dato — se resuelve a `null` (p. ej. proveedor "No Definido" → NULL, no un
 * proveedor llamado "No Definido").
 */

/** Quita tildes para comparaciones insensibles a acentos. */
export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

/** Centinelas observados que significan "sin dato" (0.2 H3). */
const SENTINELS = new Set([
  'no definido',
  'no definida',
  'sin definir',
  'por definir',
  'no adjudicado',
  'sin descripcion',
  'no aplica',
  'n/a',
  'na',
]);

/** Texto limpio o `null` si viene vacío o es un centinela de "sin dato". */
export function cleanText(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  if (SENTINELS.has(stripAccents(s.toLowerCase()))) return null;
  return s;
}

const TRUTHY = new Set(['si', 'yes', 'true', '1']);
const FALSY = new Set(['no', 'false', '0']);

/** Booleano desde texto ("Si"/"No"/"Sí"...); `null` si es centinela o ambiguo. */
export function parseBool(value: unknown): boolean | null {
  const s = cleanText(value);
  if (s === null) return null;
  const k = stripAccents(s.toLowerCase());
  if (TRUTHY.has(k)) return true;
  if (FALSY.has(k)) return false;
  return null;
}

/**
 * Money desde texto a número (la columna es numeric(20,2); el writer lo
 * convierte a string). Asume el decimal canónico de SODA ("1000000.00"). Si
 * trae coma decimal ("1.000.000,50") la maneja; los puntos solos se tratan como
 * separador decimal (formato canónico), no como miles.
 */
export function parseMoney(value: unknown): number | null {
  const s = cleanText(value);
  if (s === null) return null;
  let t = s.replace(/[^0-9.,-]/g, '');
  if (!t) return null;
  if (t.includes(',') && t.includes('.')) {
    t = t.replace(/\./g, '').replace(',', '.'); // formato colombiano: . miles, , decimal
  } else if (t.includes(',')) {
    t = t.replace(',', '.');
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Fecha canónica `YYYY-MM-DD` (trunca cualquier hora); `null` si no parsea. */
export function parseDate(value: unknown): string | null {
  const s = cleanText(value);
  if (s === null) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}
