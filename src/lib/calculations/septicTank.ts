/**
 * Septic tank sizing engine — Resolución 0330/2017 MinVivienda (Art. 134–145)
 * with technical reference to RAS 2000 Título E and CTE DB-HS 5 (Spain).
 *
 * Phase 1 corrections (vs. prior version):
 *  • V_N = 0.7 × V_S  (was 0.25 × V_L — underestimated by ~30%)
 *  • V_S uses configurable cleaning interval, default 3 years  (was 1 year)
 *  • Coeficiente de retorno Cr = 0.85 default  (was 1.00 — over-conservative)
 *  • Full flow suite: Q_med, Q_max_diario (K1), Q_max_horario (K1×K2), Q_min
 *  • TRH verified against Q_max_horario daily equivalent
 *  • Temperature correction via Van't Hoff kinetics (TRH increases in cold climates)
 */

import { getNormative } from '@/src/lib/config/normativeRegistry';

export type TipoUso =
  | 'vivienda_unifamiliar'
  | 'vivienda_colectiva'
  | 'restaurante'
  | 'hotel'
  | 'camping'
  | 'oficina'
  | 'industrial';

export interface SepticTankInput {
  /** Habitantes equivalentes (h-e). Mínimo normativo para vivienda unifamiliar: 5 */
  habitantes_equivalentes: number;
  /** Type of use — determines defaults per applicable standard */
  tipo_uso: TipoUso;
  /** Daily water allowance in L/hab·day. Default: 200 (Res. 0330/2017 Art. 134) */
  dotacion_litros_hab_dia?: number;
  /** Hydraulic retention time in days. If omitted, computed with temperature correction. */
  tiempo_retencion_dias?: number;
  /** Settling chambers. Default: 2. Use 3 for large loads. */
  numero_compartimentos?: number;
  /** Useful depth in meters. Default: 1.4 m (within Res. 0330/2017 Art. 140 range) */
  profundidad_m?: number;
  /**
   * Return coefficient (fraction of water supply that becomes wastewater).
   * Default 0.85 per RAS 2000 and standard literature.
   * Use 1.00 only when there is no water loss (e.g., on-site well with full return).
   */
  coeficiente_retorno?: number;
  /**
   * Water temperature in °C. Affects minimum TRH via Van't Hoff kinetics.
   * Default: 18°C (temperate). Bogotá: 14–16°C (cold, demands longer TRH).
   */
  temperatura_agua_c?: number;
  /**
   * Sludge removal interval in years. Default: 3 (Res. 0330/2017 Art. 139).
   * Affects V_S directly: longer interval → larger required volume.
   */
  intervalo_limpieza_anos?: number;
  /** Normative code: 'ras' for Colombia, 'cte' for Spain. Affects TRH minimums. */
  norm_code?: string;
}

export interface SepticTankDimensions {
  largo_m: number;
  ancho_m: number;
  alto_util_m: number;
  alto_total_m: number;
}

export interface ValidationCTE {
  ok: boolean;
  avisos: string[];
  cumple_minimo_he: boolean;
  cumple_retencion: boolean;
  cumple_profundidad: boolean;
}

export interface SepticTankResult {
  // ── Core volumes ──────────────────────────────────────────────────────
  volumen_util_litros: number;
  volumen_total_litros: number;
  dimensiones: SepticTankDimensions;
  num_compartimentos: number;
  tiempo_retencion_dias: number;

  // ── Flow suite ────────────────────────────────────────────────────────
  /** Q_AR medio (design daily flow) = n × q × Cr */
  caudal_diario_litros: number;
  caudal_segundos: number;
  /** Q_max_diario = K1 × Q_med (día de máximo consumo) */
  caudal_max_diario_litros: number;
  /** Q_max_horario daily equiv = K1 × K2 × Q_med (used for TRH verification) */
  caudal_max_horario_litros: number;
  /** Q_mínimo = 0.30 × Q_med */
  caudal_minimo_litros: number;
  /** TRH when Q_max_horario daily equivalent hits the tank (informational) */
  trh_verificado_q_max_h_dias: number;

  // ── Design parameters used ────────────────────────────────────────────
  coeficiente_retorno: number;
  k1_dia: number;
  k2_hora: number;
  intervalo_limpieza_anos: number;

  // ── Temperature correction ────────────────────────────────────────────
  temperatura_agua_c?: number;
  /** θ = 1.07^(T–25) — Van't Hoff factor; < 1.0 means slower biodigestion */
  factor_temperatura?: number;
  /** TRH minimum after temperature correction */
  trh_minimo_corregido_dias?: number;

  // ── Validation ────────────────────────────────────────────────────────
  validacion_cte: ValidationCTE;

  /** Volume breakdown for display/debug */
  _metadata?: {
    volumen_liquido_litros: number;
    volumen_lodos_litros: number;
    volumen_natas_litros: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Constants and defaults
// ─────────────────────────────────────────────────────────────────────────

const DEFAULTS_POR_TIPO: Record<TipoUso, { dotacion: number; min_he: number }> = {
  vivienda_unifamiliar: { dotacion: 200, min_he: 5 },
  vivienda_colectiva:   { dotacion: 200, min_he: 5 },
  restaurante:          { dotacion: 200, min_he: 50 },
  hotel:                { dotacion: 200, min_he: 10 },
  camping:              { dotacion: 150, min_he: 10 },
  oficina:              { dotacion: 100, min_he: 5 },
  industrial:           { dotacion: 100, min_he: 5 },
};

const CTE_DEFAULTS = getNormative('cte').defaults;
const RAS_DEFAULTS = getNormative('ras').defaults;

/** Sludge accumulation rate: 50 L/hab·año (same for CTE and Res. 0330/2017 Art. 139) */
const TASA_LODOS_L_HAB_ANO = 50;

/** Freeboard (borde libre) above water surface */
const TABLERO_SEGURIDAD_M = 0.30;

/**
 * K1 — daily peak factor. Ratio of max-day to average-day flow.
 * Standard value per RAS 2000 and common residential design: 1.3
 */
const K1_DEFAULT = 1.3;

/**
 * K2 — hourly peak factor. Ratio of peak-hour to average-hour flow.
 * Decreases as population grows (larger networks buffer peaks).
 * Values from RAS 2000 Table E.3 and Harmon's formula approximation.
 */
function calcK2(he: number): number {
  if (he <= 5)   return 2.0;
  if (he <= 20)  return 1.8;
  if (he <= 100) return 1.6;
  if (he <= 500) return 1.4;
  return 1.2;
}

/**
 * Minimum TRH in days based on temperature and normative code.
 * Based on Res. 0330/2017 Art. 138 (Colombia) and Van't Hoff kinetics.
 * T ≥ 20°C → 1.5 days; 10–19°C → 2.0 days; < 10°C → 2.5 days.
 */
function trhMinimoCorregido(tempC: number, normCode: string): number {
  const norm = normCode === 'ras' ? RAS_DEFAULTS : CTE_DEFAULTS;
  return norm.retentionDays(tempC);
}

/**
 * Van't Hoff temperature correction factor for anaerobic biodigestion kinetics.
 * θ = 1.07^(T – 25).  At T = 25°C, θ = 1.0 (reference).
 * At Bogotá (T ≈ 14°C), θ ≈ 0.47 — biological activity reduced ~53%.
 * This justifies extending TRH in cold climates.
 */
function factorTemperatura(tempC: number): number {
  return Math.pow(1.07, tempC - 25);
}

// ─────────────────────────────────────────────────────────────────────────
// Main calculation function
// ─────────────────────────────────────────────────────────────────────────

export function calculateSepticTank(input: SepticTankInput): SepticTankResult {
  const he = Math.max(input.habitantes_equivalentes, 1);
  const defaults = DEFAULTS_POR_TIPO[input.tipo_uso] ?? DEFAULTS_POR_TIPO.vivienda_unifamiliar;

  const dotacion             = input.dotacion_litros_hab_dia   ?? defaults.dotacion;
  const cr                   = input.coeficiente_retorno       ?? 0.85;
  const tempC                = input.temperatura_agua_c;
  const norm_code            = input.norm_code                 ?? 'ras';
  const intervalo_limpieza   = input.intervalo_limpieza_anos   ?? 3;  // Res. 0330/2017 Art. 139
  const profundidad          = input.profundidad_m             ?? 1.4;

  // ── Normative minimums ─────────────────────────────────────────────────
  const he_efectiva           = Math.max(he, defaults.min_he);
  const profundidad_efectiva  = Math.max(profundidad, norm_code === 'ras' ? RAS_DEFAULTS.minDepthM : CTE_DEFAULTS.minDepthM);

  // ── Temperature correction for TRH ────────────────────────────────────
  const trh_min_corr = tempC !== undefined
    ? trhMinimoCorregido(tempC, norm_code)
    : trhMinimoCorregido(norm_code === 'ras' ? 18 : 15, norm_code);
  const theta = tempC !== undefined ? factorTemperatura(tempC) : undefined;

  const trh_base       = input.tiempo_retencion_dias ?? trh_min_corr;
  const trh_efectivo   = Math.max(trh_base, trh_min_corr);

  // ── Flow suite ─────────────────────────────────────────────────────────
  // Q_AR medio — design flow (with return coefficient)
  const q_med = he_efectiva * dotacion * cr;             // L/day

  const k1 = K1_DEFAULT;
  const k2 = calcK2(he_efectiva);

  const q_max_diario  = k1 * q_med;                     // L/day (max day)
  const q_max_horario = k1 * k2 * q_med;                // L/day equivalent (peak hour sustained)
  const q_min         = 0.30 * q_med;                   // L/day (minimum)
  const q_seg         = q_med / 86400;                   // L/s

  // ── Volumes ────────────────────────────────────────────────────────────
  // V_L: liquid volume (design TRH × Q_med)
  const v_l = q_med * trh_efectivo;

  // V_S: sludge accumulation (Res. 0330/2017 Art. 139)
  // = TASA × he × interval; uses 3-year default cleaning cycle
  const v_s = TASA_LODOS_L_HAB_ANO * he_efectiva * intervalo_limpieza;

  // V_N: scum volume = 0.7 × V_S (RAS 2000 criterion, more accurate than 0.25 × V_L)
  const v_n = 0.70 * v_s;

  let v_util = v_l + v_s + v_n;

  // ── Normative minimum volume ───────────────────────────────────────────
  const v_min_norm = norm_code === 'ras'
    ? Math.max(he_efectiva * 200 * 1.5, RAS_DEFAULTS.minVolumeM3 * 1000)  // Res. 0330 Art. 138
    : he_efectiva * 200 * 2;                                                 // CTE §3.3.1

  let aplicado_minimo = false;
  if (v_util < v_min_norm) {
    v_util = v_min_norm;
    aplicado_minimo = true;
  }

  // ── TRH verification at Q_max_horario ─────────────────────────────────
  const trh_qmax_h = v_util / q_max_horario;            // days

  // ── Tank dimensions ────────────────────────────────────────────────────
  // Proportion L:W = 3:1 (Res. 0330/2017 Art. 140 range 2:1–4:1)
  const v_m3  = v_util / 1000;
  const area  = v_m3 / profundidad_efectiva;
  const ancho = Math.sqrt(area / 3);  // W = √(A/3) for L=3W
  const largo = 3 * ancho;

  const alto_total = profundidad_efectiva + TABLERO_SEGURIDAD_M;

  // ── Validation ─────────────────────────────────────────────────────────
  const trh_min_norm = norm_code === 'ras' ? RAS_DEFAULTS.minDepthM : CTE_DEFAULTS.minDepthM;
  const ancho_min    = norm_code === 'ras' ? RAS_DEFAULTS.minWidthM  : CTE_DEFAULTS.minWidthM;
  const largo_min    = norm_code === 'ras' ? RAS_DEFAULTS.minLengthM : CTE_DEFAULTS.minLengthM;

  const validacion: ValidationCTE = {
    ok: true,
    avisos: [],
    cumple_minimo_he:   he >= defaults.min_he,
    cumple_retencion:   trh_efectivo >= 1.0,
    cumple_profundidad: profundidad >= profundidad_efectiva,
  };

  if (he < defaults.min_he) {
    validacion.avisos.push(
      `Ocupación (${he}) inferior al mínimo normativo (${defaults.min_he} h-e). ` +
      `Se normaliza a ${defaults.min_he} h-e.`
    );
    validacion.cumple_minimo_he = false;
  }

  if (aplicado_minimo) {
    validacion.avisos.push(
      `Volumen calculado (${Math.round(v_l + v_s + v_n)} L) inferior al mínimo normativo ` +
      `(${Math.round(v_min_norm)} L). Se usa el mínimo normativo.`
    );
  }

  if (tempC !== undefined && tempC < 20) {
    validacion.avisos.push(
      `Temperatura del agua ${tempC}°C → TRH ajustado a ${trh_efectivo} días ` +
      `(factor Van't Hoff θ = ${(theta ?? 0).toFixed(2)}; actividad biológica reducida). ` +
      `Res. 0330/2017 Art. 138.`
    );
  }

  if (ancho < ancho_min) {
    validacion.avisos.push(
      `Ancho calculado (${ancho.toFixed(2)} m) inferior al mínimo (${ancho_min} m). ` +
      `Aumentar profundidad o volumen.`
    );
    validacion.ok = false;
  }

  if (largo < largo_min) {
    validacion.avisos.push(
      `Largo calculado (${largo.toFixed(2)} m) inferior al mínimo (${largo_min} m). ` +
      `Aumentar profundidad o volumen.`
    );
    validacion.ok = false;
  }

  return {
    // volumes
    volumen_util_litros:    Math.round(v_util),
    volumen_total_litros:   Math.round(v_util + TABLERO_SEGURIDAD_M * largo * ancho * 1000),
    dimensiones: {
      largo_m:     parseFloat(largo.toFixed(2)),
      ancho_m:     parseFloat(ancho.toFixed(2)),
      alto_util_m: parseFloat(profundidad_efectiva.toFixed(2)),
      alto_total_m: parseFloat(alto_total.toFixed(2)),
    },
    num_compartimentos:     input.numero_compartimentos ?? 2,
    tiempo_retencion_dias:  parseFloat(trh_efectivo.toFixed(1)),

    // flows
    caudal_diario_litros:        Math.round(q_med),
    caudal_segundos:             parseFloat(q_seg.toFixed(3)),
    caudal_max_diario_litros:    Math.round(q_max_diario),
    caudal_max_horario_litros:   Math.round(q_max_horario),
    caudal_minimo_litros:        Math.round(q_min),
    trh_verificado_q_max_h_dias: parseFloat(trh_qmax_h.toFixed(2)),

    // design parameters
    coeficiente_retorno:     cr,
    k1_dia:                  k1,
    k2_hora:                 k2,
    intervalo_limpieza_anos: intervalo_limpieza,

    // temperature
    ...(tempC !== undefined && {
      temperatura_agua_c:         tempC,
      factor_temperatura:         parseFloat((theta ?? 0).toFixed(3)),
      trh_minimo_corregido_dias:  parseFloat(trh_min_corr.toFixed(1)),
    }),

    validacion_cte: validacion,

    _metadata: {
      volumen_liquido_litros: Math.round(v_l),
      volumen_lodos_litros:   Math.round(v_s),
      volumen_natas_litros:   Math.round(v_n),
    },
  };
}
