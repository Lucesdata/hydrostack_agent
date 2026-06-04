/**
 * Watermark incremental (0.2 §6).
 *
 * Cada fuente avanza su propio watermark = el mayor valor del campo de
 * actualización visto en la corrida. La siguiente corrida arranca en
 * `watermark_anterior - margen` (D14): el `>` estricto podría perder filas que
 * comparten timestamp exacto con otras ya procesadas, así que solapamos un
 * margen pequeño y dejamos que el payload_hash descarte los duplicados.
 *
 * Los timestamps de Socrata son "floating" (sin zona): `2024-01-15T09:30:00.000`.
 * Por eso comparamos como strings (mismo formato → orden lexicográfico =
 * cronológico) y hacemos la aritmética en componentes UTC, sin que la zona
 * local del runner desplace el valor.
 */

const DAY_MS = 86_400_000;

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}

const FLOATING_RE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?/;

/**
 * Interpreta un timestamp floating de Socrata como UTC (ms epoch).
 * Clave: `Date.parse` de un string sin zona lo lee en hora LOCAL del runner;
 * leeríamos componentes UTC al formatear y derivaríamos. Parseando los
 * componentes contra `Date.UTC`, `formatFloating(floatingToUtcMs(x))` es
 * idempotente sin importar la zona de la máquina.
 */
function floatingToUtcMs(ts: string): number | null {
  const m = FLOATING_RE.exec(ts);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, ms] = m;
  return Date.UTC(+y, +mo - 1, +d, +h, +mi, +s, ms ? +ms.padEnd(3, '0') : 0);
}

/** Formatea un Date como timestamp floating de Socrata (sin zona), en UTC. */
export function formatFloating(d: Date): string {
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}` +
    `.${pad(d.getUTCMilliseconds(), 3)}`
  );
}

/** Parsea un floating de Socrata a Date (UTC). `null` si no es parseable. */
export function parseFloatingDate(ts: unknown): Date | null {
  if (typeof ts !== 'string' || !ts) return null;
  const ms = floatingToUtcMs(ts);
  return ms === null ? null : new Date(ms);
}

/** Resta `days` a un timestamp floating, devolviendo otro floating. */
export function subtractDays(isoTimestamp: string, days: number): string {
  const ms = floatingToUtcMs(isoTimestamp);
  if (ms === null) {
    throw new Error(`watermark con formato inválido: ${isoTimestamp}`);
  }
  return formatFloating(new Date(ms - days * DAY_MS));
}

/**
 * Inicio de la ventana de extracción para la próxima corrida.
 * - Sin watermark previo (primera corrida / backfill) → `null` = sin cota inferior.
 * - Con watermark previo → `watermark - marginDays` (solape D14).
 */
export function windowStart(
  lastWatermark: string | null | undefined,
  marginDays = 1,
): string | null {
  if (!lastWatermark) return null;
  return subtractDays(lastWatermark, marginDays);
}

/** Mayor watermark de un conjunto de filas (orden lexicográfico). */
export function maxWatermark(values: (string | null | undefined)[]): string | null {
  let max: string | null = null;
  for (const v of values) {
    if (!v) continue;
    if (max === null || v > max) max = v;
  }
  return max;
}
