/**
 * ──────────────────────────────────────────────────────────────────────────
 *  Red de ingesta sectorial (A2) — fuente ÚNICA del filtro de aterrizaje
 * ──────────────────────────────────────────────────────────────────────────
 *
 *  Define QUÉ procesos/contratos entran a `raw_record` (ADR-0001, Opción C):
 *  nacional pero filtrado por el sector agua-saneamiento. Es el `$where` que el
 *  keyset/sweep debe ANDear con su cursor (pendiente de cablear en Fase B).
 *
 *  DERIVADO DE DATOS, NO ADIVINADO (ver docs/fase-0):
 *   · `0.2.1-unspsc-derivado.md`  → distribución real de UNSPSC en la red.
 *   · `0.2.1-validacion-pr.md`    → precision/recall por estrato (muestra de 50).
 *
 *  Forma de la red:   ( KEYWORDS  ∪  UNSPSC water-exclusivo )  AND NOT  seg-80
 *
 *  Por qué así (y no como dice la letra del plan A2):
 *   · KEYWORDS son el DRIVER de recall, no un complemento. El estrato sin código
 *     UNSPSC (`UNSPECIFIED`) midió 100% relevante y SOLO lo pesca el texto → un
 *     filtro solo-UNSPSC perdería esos leads reales.
 *   · El brazo UNSPSC se limita a códigos WATER-EXCLUSIVOS (familia 83101,
 *     acueducto/alcantarillado). NO se usan segmentos completos (`72%`, `81%`):
 *     capturarían toda la construcción/ingeniería nacional sin relación con agua.
 *     Coincide con la señal STRONG del clasificador → la red es superconjunto de
 *     las señales del clasificador (invariante del ADR).
 *   · El segmento 80 (gestión/personal) se EXCLUYE: midió ≈0% relevante (staffing,
 *     interventorías administrativas, servicios profesionales) y es ~47% del
 *     volumen. Poda enorme con pérdida de relevancia ≈ 0. Trade-off: esos
 *     registros no se podrán reclasificar sin backfill (aceptado, ADR-0001).
 *
 *  Las keywords son accent-safe (sin vocales acentuadas): `upper()` de SoQL NO
 *  quita tildes, así que `POTABILIZ` matchea "POTABILIZACIÓN" pero `CAPTACIÓN`
 *  no matchearía "CAPTACION". Mantener esa propiedad al editar la lista.
 *
 *  ⚠️  Esta lista es la AUTORIDAD de la red de ingesta. El clasificador
 *  (`classify/dictionaries.ts`) y el proxy live (`secop/config.ts`) deberían
 *  converger hacia aquí para no divergir (tarea de reconciliación en Fase B).
 * ──────────────────────────────────────────────────────────────────────────
 */

import { FIELDS_PROCESOS, FIELDS_CONTRATOS } from './config';

/** Prefijo de versión del código UNSPSC, tal como llega de Socrata ("V1.83101500"). */
export const UNSPSC_PREFIX = 'V1.';

/**
 * Keywords de dominio (accent-safe, mayúsculas). Driver de recall. Debe coincidir
 * con la red usada en la derivación A1 (`scripts/exploration/derive-unspsc.mjs`).
 */
export const SECTOR_KEYWORDS: readonly string[] = [
  'ACUEDUCTO',
  'ALCANTARILLADO',
  'SANEAMIENTO',
  'AGUA POTABLE',
  'AGUAS RESIDUALES',
  'AGUA RESIDUAL',
  'PTAR',
  'PTAP',
  'PLANTA DE TRATAMIENTO',
  'POTABILIZ', // potabilización
  'CAPTACI', // captación
  'ADUCCI', // aducción
  'POZO SEPTIC', // pozo séptico
  'TANQUE SEPTIC', // tanque séptico
  'VERTIMIENTO',
  'COLECTOR',
  'INTERCEPTOR',
  'EMISARIO',
  'MICROMEDIC', // micromedición
  'MACROMEDIC', // macromedición
  'PSMV',
  'PLAN MAESTRO DE ACUEDUCTO',
];

/**
 * Prefijos UNSPSC WATER-EXCLUSIVOS (solo dígitos, sin "V1."). Brazo de recall
 * para procesos bien codificados pero mal texteados. Deliberadamente estrecho:
 * solo familias cuyo código basta para afirmar "es de agua" sin keyword. Familias
 * de obra/ingeniería/ambiente (72141, 81101, 77101…) NO van aquí — son CONTEXT en
 * el clasificador (sin keyword capturarían demasiado no-agua).
 */
export const WATER_EXCLUSIVE_UNSPSC: readonly string[] = ['83101'];

/** Segmentos UNSPSC (2 dígitos) EXCLUIDOS por ruido (A3: seg-80 ≈0% relevante). */
export const EXCLUDED_UNSPSC_SEGMENTS: readonly string[] = ['80'];

/** Campos SODA que necesita la red, por dataset. */
export interface SectorNetFields {
  /** Campos de texto donde buscar las keywords (nombre/objeto/descripción). */
  readonly textFields: readonly string[];
  /** Campo del código UNSPSC. */
  readonly unspscField: string;
}

export const SECTOR_NET_PROCESOS: SectorNetFields = {
  textFields: [FIELDS_PROCESOS.nombre, FIELDS_PROCESOS.descripcion],
  unspscField: FIELDS_PROCESOS.unspsc,
};

export const SECTOR_NET_CONTRATOS: SectorNetFields = {
  textFields: [FIELDS_CONTRATOS.objeto],
  unspscField: FIELDS_CONTRATOS.unspsc,
};

/** Escapa comillas simples para SoQL. */
function soqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}

/** Cláusula keyword: OR de `upper(campo) like '%KW%'` sobre todos los textFields. */
function keywordClause(fields: SectorNetFields): string {
  return SECTOR_KEYWORDS.map((kw) => {
    const k = soqlEscape(kw.toUpperCase());
    const perField = fields.textFields.map((f) => `upper(${f}) like '%${k}%'`);
    return `(${perField.join(' OR ')})`;
  }).join(' OR ');
}

/** Cláusula UNSPSC water-exclusivo: OR de `campo like 'V1.83101%'`. */
function unspscIncludeClause(fields: SectorNetFields): string {
  return WATER_EXCLUSIVE_UNSPSC.map(
    (p) => `${fields.unspscField} like '${UNSPSC_PREFIX}${p}%'`,
  ).join(' OR ');
}

/** Cláusula de exclusión: `campo like 'V1.80%'`. */
function unspscExcludeClause(fields: SectorNetFields): string {
  return EXCLUDED_UNSPSC_SEGMENTS.map(
    (s) => `${fields.unspscField} like '${UNSPSC_PREFIX}${s}%'`,
  ).join(' OR ');
}

/**
 * `$where` SoQL de la red de ingesta:
 *   ( (keywords) OR (UNSPSC water-exclusivo) ) AND NOT (UNSPSC excluido)
 *
 * Se ANDea con la condición de cursor del keyset/sweep en Fase B.
 */
export function buildSectorWhere(fields: SectorNetFields): string {
  const include = `(${keywordClause(fields)}) OR (${unspscIncludeClause(fields)})`;
  const exclude = unspscExcludeClause(fields);
  return `(${include}) AND NOT (${exclude})`;
}

/** Normaliza "V1.83101500" → "83101500" (8 dígitos). null si no hay código. */
function unspscDigits(raw: unknown): string | null {
  if (raw == null) return null;
  const d = String(raw)
    .replace(/^v\d+\./i, '')
    .replace(/\D/g, '');
  return d || null;
}

/**
 * Predicado PURO equivalente a `buildSectorWhere` (misma semántica), para tests y
 * para clasificación client-side sin re-consultar Socrata. Una fila pasa la red si
 * (texto matchea keyword O código es water-exclusivo) Y el código no es excluido.
 */
export function matchesSectorNet(
  row: Record<string, unknown>,
  fields: SectorNetFields,
): boolean {
  const digits = unspscDigits(row[fields.unspscField]);

  const excluded = digits != null && EXCLUDED_UNSPSC_SEGMENTS.some((s) => digits.startsWith(s));
  if (excluded) return false;

  const textHit = fields.textFields.some((f) => {
    const v = row[f];
    if (v == null) return false;
    const t = String(v).toUpperCase();
    return SECTOR_KEYWORDS.some((kw) => t.includes(kw));
  });
  if (textHit) return true;

  return digits != null && WATER_EXCLUSIVE_UNSPSC.some((p) => digits.startsWith(p));
}
