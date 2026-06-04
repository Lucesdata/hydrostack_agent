/**
 * Clasificador sectorial agua/saneamiento — lógica PURA (0.2.1 §3, D19).
 *
 * Multi-señal con score auditable (no boolean opaco): A objeto/keywords (driver
 * de recall), B UNSPSC dominio (refuerzo), C entidad (allowlist/nombre), D
 * contexto (desempate). Devuelve score 0–1, tier, `sector_agua` y un
 * `match_reason` que registra QUÉ disparó y con qué evidencia — para depurar
 * falsos positivos sin adivinar.
 *
 * Corre sobre campos crudos/canónicos ya almacenados → recomputable sin
 * re-ingesta (D18/D20). No toca BD: el escritor adjunta los FK (proceso/contrato)
 * y persiste en `clasificacion_sectorial`.
 *
 * UMBRALES PROVISIONALES (D17): los cortes de tier se calibran contra una muestra
 * etiquetada a mano sobre datos reales. Por eso `weights`/`thresholds` son
 * inyectables — los defaults son un punto de partida, no un valor calibrado.
 */

import { stripAccents } from '../transform/normalize';
import {
  KEYWORDS_DOMINIO,
  UNSPSC_STRONG,
  UNSPSC_CONTEXT,
  ENTIDAD_NAME_PATTERNS,
  ENTIDAD_NIT_ALLOWLIST,
  CONTEXTO_TERMS,
} from './dictionaries';

/** Versión del clasificador. Subir al cambiar diccionarios/pesos → recomputo (D20). */
export const CLASIFICADOR_VERSION = '0.2.1-seed-1';

export type SectorTier = 'alta' | 'media' | 'baja';

/** Vista normalizada de un registro para clasificar (desacoplada de proceso/contrato). */
export interface ClassifierInput {
  objeto: string | null; // objeto/nombre/descripción (texto de dominio — señal A)
  unspsc: string | null; // código de categoría principal (puede traer prefijo "V1.")
  entidadNit: string | null; // NIT canónico de la entidad
  entidadNombre: string | null;
  sector: string | null; // contexto
  tipoContrato: string | null; // contexto
}

/** Evidencia auditable de qué señales dispararon (→ `sector_match_reason`, §3). */
export interface MatchReason {
  A: string[]; // keywords encontradas en el objeto
  B: { codigo: string; tipo: 'strong' | 'context' } | null;
  C: { via: 'allowlist' | 'nombre'; evidencia: string } | null;
  D: string[]; // términos de contexto que dispararon
}

export interface SectorClassification {
  sectorScore: number; // 0–1
  sectorTier: SectorTier;
  sectorAgua: boolean; // true solo en tier 'alta' (media → revisión manual, D17)
  matchReason: MatchReason;
  clasificadorVersion: string;
}

export interface ClassifierConfig {
  weights: {
    keywordBase: number; // primera keyword de dominio
    keywordExtra: number; // cada keyword adicional
    keywordCap: number; // tope de la señal A
    unspscStrong: number;
    unspscContext: number;
    entidadAllowlist: number;
    entidadNombre: number;
    contexto: number;
  };
  thresholds: { alta: number; media: number }; // score ≥ alta → alta; ≥ media → media; resto baja
}

/** Defaults PROVISIONALES — pendientes de calibración con muestra etiquetada (D17). */
export const DEFAULT_CONFIG: ClassifierConfig = {
  weights: {
    keywordBase: 0.6,
    keywordExtra: 0.1,
    keywordCap: 0.85,
    unspscStrong: 0.4,
    unspscContext: 0.1,
    entidadAllowlist: 0.5,
    entidadNombre: 0.2,
    contexto: 0.1,
  },
  thresholds: { alta: 0.6, media: 0.3 },
};

function norm(s: string | null): string {
  return s === null ? '' : stripAccents(s.toLowerCase());
}

/** Señal A: keywords de dominio presentes en el objeto normalizado. */
function matchKeywords(objeto: string | null): string[] {
  const t = norm(objeto);
  if (!t) return [];
  return KEYWORDS_DOMINIO.filter((kw) => t.includes(kw));
}

/** Señal B: clasifica el UNSPSC por prefijo de dígitos. */
function matchUnspsc(unspsc: string | null): MatchReason['B'] {
  // El código viene como "V1.83101500": el prefijo de versión "V1." trae un
  // dígito que ensuciaría el prefijo. Se quita antes de extraer los dígitos.
  const digits = (unspsc ?? '').replace(/^v\d+\./i, '').replace(/\D/g, '');
  if (!digits) return null;
  if (UNSPSC_STRONG.some((p) => digits.startsWith(p))) return { codigo: digits, tipo: 'strong' };
  if (UNSPSC_CONTEXT.some((p) => digits.startsWith(p))) return { codigo: digits, tipo: 'context' };
  return null;
}

/** Señal C: allowlist de NIT (fuerte) o patrón de nombre (débil). */
function matchEntidad(nit: string | null, nombre: string | null): MatchReason['C'] {
  if (nit !== null && ENTIDAD_NIT_ALLOWLIST.includes(nit)) {
    return { via: 'allowlist', evidencia: nit };
  }
  const n = norm(nombre);
  if (n) {
    const hit = ENTIDAD_NAME_PATTERNS.find((re) => re.test(n));
    if (hit) return { via: 'nombre', evidencia: hit.source };
  }
  return null;
}

/** Señal D: términos de agua en sector/tipo de contrato (desempate). */
function matchContexto(sector: string | null, tipo: string | null): string[] {
  const t = `${norm(sector)} ${norm(tipo)}`;
  return CONTEXTO_TERMS.filter((term) => t.includes(term));
}

function tierFor(score: number, th: ClassifierConfig['thresholds']): SectorTier {
  if (score >= th.alta) return 'alta';
  if (score >= th.media) return 'media';
  return 'baja';
}

export function classifySector(
  input: ClassifierInput,
  config: ClassifierConfig = DEFAULT_CONFIG,
): SectorClassification {
  const w = config.weights;
  const A = matchKeywords(input.objeto);
  const B = matchUnspsc(input.unspsc);
  const C = matchEntidad(input.entidadNit, input.entidadNombre);
  const D = matchContexto(input.sector, input.tipoContrato);

  let score = 0;
  if (A.length > 0) {
    score += Math.min(w.keywordCap, w.keywordBase + w.keywordExtra * (A.length - 1));
  }
  if (B) score += B.tipo === 'strong' ? w.unspscStrong : w.unspscContext;
  if (C) score += C.via === 'allowlist' ? w.entidadAllowlist : w.entidadNombre;
  if (D.length > 0) score += w.contexto;
  score = Math.min(1, score);

  const sectorTier = tierFor(score, config.thresholds);
  return {
    sectorScore: score,
    sectorTier,
    sectorAgua: sectorTier === 'alta',
    matchReason: { A, B, C, D },
    clasificadorVersion: CLASIFICADOR_VERSION,
  };
}
