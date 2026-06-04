/**
 * payload_hash — huella estable de un registro crudo (D10 / 0.2 §5).
 *
 * Sirve para detectar cambios reales entre snapshots: si el hash no cambió, el
 * registro no se reprocesa (no genera eventos espurios). El hash se calcula
 * sobre el JSON canónico (claves ordenadas a todo nivel) EXCLUYENDO los campos
 * volátiles de la fuente (watermark, contadores de actividad, ejecución
 * financiera) — ver `volatileFields` en sources.ts.
 *
 * Determinismo: el orden de claves de Socrata no es estable entre filas, así
 * que ordenamos siempre. Sin esto, dos snapshots idénticos podrían hashear
 * distinto solo por el orden de serialización.
 */

import { createHash } from 'crypto';

/** Serialización determinista: claves ordenadas recursivamente. */
export function stableStringify(value: unknown): string {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return (
    '{' +
    keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') +
    '}'
  );
}

/** Copia del row sin los campos volátiles (solo al nivel raíz). */
export function stripVolatile(
  row: Record<string, unknown>,
  volatileFields: readonly string[],
): Record<string, unknown> {
  const exclude = new Set(volatileFields);
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    if (!exclude.has(key)) out[key] = row[key];
  }
  return out;
}

/** SHA-256 (hex) del JSON canónico del row menos los campos volátiles. */
export function payloadHash(
  row: Record<string, unknown>,
  volatileFields: readonly string[],
): string {
  const canonical = stableStringify(stripVolatile(row, volatileFields));
  return createHash('sha256').update(canonical).digest('hex');
}
