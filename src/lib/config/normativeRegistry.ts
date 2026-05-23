/**
 * Normative Registry — single source of truth for jurisdiction / standard data.
 *
 * Before this file, the same information was duplicated across:
 *   - app/api/agent/route.ts        → detectLocation() + doc-path map
 *   - src/lib/owner-state.js        → countryMap
 *   - src/components/SepticTankCalculator.jsx → NORMS object
 *
 * Each copy used different codes ("epa-onsite" vs "epa" vs "epa") and
 * keyword sets, so a user detected as Spain in one place could be detected
 * as USA in another. This registry makes the data canonical: add a norm once
 * here and every consumer picks it up.
 */

/** Canonical code for a supported standard / jurisdiction. */
export type NormCode = 'cte' | 'epa' | 'uk' | 'asnzs' | 'ras';

/** Country bucket used by the homeowner orientation flow. */
export type Country = 'colombia' | 'spain' | 'usa' | 'other';

export interface NormativeInfo {
  /** Canonical code used everywhere in the codebase. */
  code: NormCode;
  /** Human-readable name for UI display. */
  name: string;
  /** Short region description. */
  region: string;
  /** Flag emoji for UI. */
  flag: string;
  /** Regulatory reference string. */
  reference: string;
  /** Path (relative to project root) of the regulation markdown doc. */
  docFile: string;
  /** Country bucket for the homeowner orientation flow. */
  country: Country;
  /** Lowercase keywords that, if found in user text, select this norm. */
  detectionKeywords: string[];
}

/**
 * The registry. To add a new jurisdiction, add ONE entry here and create the
 * matching markdown file under docs/normativa/.
 */
export const NORMATIVE_REGISTRY: Record<NormCode, NormativeInfo> = {
  epa: {
    code: 'epa',
    name: 'EPA Onsite (USA)',
    region: 'United States',
    flag: '\u{1F1FA}\u{1F1F8}',
    reference: 'EPA 625/R-06/003',
    docFile: 'docs/normativa/epa-onsite.md',
    country: 'usa',
    detectionKeywords: [
      'usa', 'united states', 'american', 'epa',
      'texas', 'california', 'florida', 'new york',
    ],
  },
  uk: {
    code: 'uk',
    name: 'UK Building Regulations',
    region: 'United Kingdom',
    flag: '\u{1F1EC}\u{1F1E7}',
    reference: 'UK Building Regs Part H',
    docFile: 'docs/normativa/uk-building-regs.md',
    country: 'other',
    detectionKeywords: [
      'uk', 'united kingdom', 'england', 'scotland', 'wales', 'britain',
    ],
  },
  asnzs: {
    code: 'asnzs',
    name: 'AS/NZS 1547 (AU/NZ)',
    region: 'Australia & New Zealand',
    flag: '\u{1F1E6}\u{1F1FA}',
    reference: 'AS/NZS 1547:2012',
    docFile: 'docs/normativa/as-nzs-1547.md',
    country: 'other',
    detectionKeywords: [
      'australia', 'new zealand', 'sydney', 'melbourne', 'auckland',
    ],
  },
  cte: {
    code: 'cte',
    name: 'CTE DB-HS 5 (Spain)',
    region: 'Spain',
    flag: '\u{1F1EA}\u{1F1F8}',
    reference: 'CTE DB-HS 5 / RD 1620/2007',
    docFile: 'docs/normativa/cte-hs5.md',
    country: 'spain',
    detectionKeywords: [
      'españa', 'espana', 'spain', 'spanish', 'madrid', 'barcelona',
    ],
  },
  ras: {
    code: 'ras',
    name: 'RAS 2000 (Colombia)',
    region: 'Colombia',
    flag: '\u{1F1E8}\u{1F1F4}',
    reference: 'RAS 2000 / RAS 2017',
    docFile: 'docs/normativa/ras-2000.md',
    country: 'colombia',
    detectionKeywords: [
      'colombia', 'bogotá', 'bogota', 'medellín', 'medellin', 'cali',
    ],
  },
};

/** Default norm used when nothing can be detected (matches legacy behaviour). */
export const DEFAULT_NORM: NormCode = 'epa';

/** All norms as a list, handy for dropdowns and iteration. */
export function listNormatives(): NormativeInfo[] {
  return Object.values(NORMATIVE_REGISTRY);
}

/** Look up a norm by code. Throws on unknown code. */
export function getNormative(code: NormCode): NormativeInfo {
  const info = NORMATIVE_REGISTRY[code];
  if (!info) throw new Error(`Unknown normative code: ${code}`);
  return info;
}

/**
 * Detect the norm referenced in a piece of free text.
 * Returns null when no jurisdiction keyword is present.
 */
export function detectNormativeFromText(text: string): NormCode | null {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase();
  for (const info of listNormatives()) {
    if (info.detectionKeywords.some((kw) => lower.includes(kw))) {
      return info.code;
    }
  }
  return null;
}

/**
 * Detect the norm, falling back to {@link DEFAULT_NORM} when nothing matches.
 * This mirrors the legacy detectLocation() behaviour (default = EPA/USA).
 */
export function detectNormative(text: string): NormCode {
  return detectNormativeFromText(text) ?? DEFAULT_NORM;
}

/** Resolve the regulation markdown doc path for a norm code. */
export function getNormativeDocFile(code: NormCode): string {
  return getNormative(code).docFile;
}

/**
 * Detect the homeowner's country from free text.
 * Returns null when no country keyword is present.
 */
export function detectCountryFromText(text: string): Country | null {
  const code = detectNormativeFromText(text);
  return code ? getNormative(code).country : null;
}
