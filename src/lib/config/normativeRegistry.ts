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

/**
 * Numeric calculation defaults per norm — the single source of truth used by
 * BOTH calculation engines (the agent's calculate_septic_tank tool and the
 * standalone calculator UI). The two engines implement different algorithms
 * (conservative-CTE vs. multi-norm with return coefficient), but they MUST
 * agree on the underlying constants of each standard so they never drift.
 */
export interface NormCalculationDefaults {
  /** Sludge accumulation rate in L/(person·year). Depends on temperature
   *  because anaerobic digestion slows in colder tanks. */
  sludgeRate(tempC: number): number;
  /** Scum (Vn) factor as a fraction of liquid volume (Vl). */
  scumFactor: number;
  /** Hydraulic retention time in days. Depends on temperature. */
  retentionDays(tempC: number): number;
  /** Minimum total tank volume in m³. */
  minVolumeM3: number;
  /** Minimum useful depth in meters. */
  minDepthM: number;
  /** Minimum width in meters. */
  minWidthM: number;
  /** Minimum length in meters. */
  minLengthM: number;
  /** Default daily allowance for design flow. Unit per dotacionUnit. */
  defaultDotacion: number;
  /** Unit label for defaultDotacion (e.g. "L/person/day" or "GPD/bed"). */
  dotacionUnit: string;
  /** Human label for the temperature band a given temperature falls into. */
  tempLabel(tempC: number): string;
}

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
  /** Calculation defaults — shared by both calculation engines. */
  defaults: NormCalculationDefaults;
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
    defaults: {
      sludgeRate: (t) => (t >= 20 ? 65 : t >= 10 ? 80 : 95),
      scumFactor: 0.25,
      retentionDays: (t) => (t >= 20 ? 1.5 : t >= 10 ? 2.0 : 2.5),
      minVolumeM3: 3.785,
      minDepthM: 1.0,
      minWidthM: 0.9,
      minLengthM: 1.8,
      defaultDotacion: 75,
      dotacionUnit: 'GPD/bed',
      tempLabel: (t) =>
        t >= 20 ? '≥68°F (≥20°C)' : t >= 10 ? '50–66°F (10–19°C)' : '<50°F (<10°C)',
    },
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
    defaults: {
      sludgeRate: (t) => (t >= 15 ? 50 : t >= 10 ? 65 : 75),
      scumFactor: 0.25,
      retentionDays: (t) => (t >= 15 ? 1.5 : t >= 10 ? 2.0 : 2.5),
      minVolumeM3: 1.5,
      minDepthM: 1.0,
      minWidthM: 0.75,
      minLengthM: 1.5,
      defaultDotacion: 200,
      dotacionUnit: 'L/person/day',
      tempLabel: (t) =>
        t >= 15 ? '≥59°F (≥15°C)' : t >= 10 ? '50–58°F (10–14°C)' : '<50°F (<10°C)',
    },
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
    defaults: {
      sludgeRate: (t) => (t >= 15 ? 55 : t >= 10 ? 70 : t >= 5 ? 85 : 100),
      scumFactor: 0.30,
      retentionDays: (t) => (t >= 15 ? 1.5 : t >= 10 ? 2.0 : t >= 5 ? 2.5 : 3.0),
      minVolumeM3: 1.5,
      minDepthM: 1.2,
      minWidthM: 0.9,
      minLengthM: 1.5,
      defaultDotacion: 200,
      dotacionUnit: 'L/person/day',
      tempLabel: (t) =>
        t >= 15 ? '≥59°F (≥15°C)' :
        t >= 10 ? '50–58°F (10–14°C)' :
        t >= 5  ? '41–49°F (5–9°C)' : '<41°F (<5°C)',
    },
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
    defaults: {
      sludgeRate: (t) => (t >= 15 ? 50 : 60),
      scumFactor: 0.25,
      retentionDays: (t) => (t >= 15 ? 1.0 : 1.5),
      minVolumeM3: 1.5,
      minDepthM: 1.0,
      minWidthM: 0.75,
      minLengthM: 1.5,
      defaultDotacion: 160,
      dotacionUnit: 'L/person/day',
      tempLabel: (t) => (t >= 15 ? '≥59°F (≥15°C)' : '<59°F (<15°C)'),
    },
  },
  ras: {
    code: 'ras',
    name: 'Res. 0330/2017 (Colombia)',
    region: 'Colombia',
    flag: '\u{1F1E8}\u{1F1F4}',
    // Res. 0330/2017 is the primary norm (Art. 134–145 for SITARD).
    // Dec. 1076/2015 governs the environmental permit (vertimientos).
    // Res. 0631/2015 sets effluent quality limits.
    // RAS 2000 Título E remains valid as a technical calculation reference only.
    reference: 'Res. 0330/2017 MinVivienda (Art. 134–145) · Dec. 1076/2015 · Res. 0631/2015',
    docFile: 'docs/normativa/ras-2000.md',
    country: 'colombia',
    detectionKeywords: [
      'colombia', 'bogotá', 'bogota', 'medellín', 'medellin', 'cali',
      'barranquilla', 'bucaramanga', 'cartagena', 'cundinamarca', 'antioquia',
    ],
    defaults: {
      sludgeRate: (t) => (t >= 20 ? 40 : t >= 10 ? 50 : 60),
      scumFactor: 0.30,
      // Res. 0330/2017 Art. 138 — TRH mínimo 1.5 días para vivienda
      retentionDays: (t) => (t >= 20 ? 1.5 : t >= 10 ? 2.0 : 2.5),
      // Res. 0330/2017 Art. 138 — Volumen mínimo absoluto 1,500 L = 1.5 m³
      minVolumeM3: 1.5,
      minDepthM: 1.2,
      minWidthM: 0.6,
      minLengthM: 1.5,
      defaultDotacion: 120,
      dotacionUnit: 'L/person/day',
      tempLabel: (t) =>
        t >= 20 ? '≥68°F (≥20°C)' : t >= 10 ? '50–67°F (10–19°C)' : '<50°F (<10°C)',
    },
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
