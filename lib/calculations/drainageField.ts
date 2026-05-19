/**
 * Pure function for drainage field (infiltration system) sizing according to
 * CTE DB-HS 5 Anejo G and RD 1620/2007.
 *
 * Receives the effluent of the septic tank and infiltrates it into the soil.
 * Output dimensions a system of filter trenches, filter bed or filter well
 * based on soil permeability (K).
 */

export type TipoSistema =
  | 'zanjas_filtrantes'
  | 'lecho_filtrante'
  | 'pozo_filtrante';

export interface DrainageFieldInput {
  /** Daily flow in liters/day. Typically from calculate_septic_tank output. */
  caudal_diario_l: number;
  /** Soil permeability (K) in m/day. From perc test or soil study. */
  permeabilidad_suelo_m_dia: number;
  /** Type of drainage system. If omitted, auto-selected based on K. */
  tipo_sistema?: TipoSistema;
  /** Water table depth in meters. Optional but recommended. */
  nivel_freatico_m?: number;
  /** Distance to water well/intake in meters. Optional. */
  distancia_pozo_agua_m?: number;
}

export interface DrainageFieldDimensions {
  superficie_infiltracion_m2: number;
  longitud_total_zanjas_m: number | null;
  num_zanjas: number | null;
  separacion_zanjas_m: number | null;
  profundidad_m: number;
  ancho_zanja_m: number | null;
}

export interface DrainageFieldValidation {
  ok: boolean;
  /** Blocking issues that prevent installation */
  bloqueantes: string[];
  /** Warnings that should be addressed but don't block */
  avisos: string[];
}

export interface DrainageFieldResult {
  tipo_sistema: TipoSistema;
  dimensiones: DrainageFieldDimensions;
  carga_hidraulica_m_dia: number;
  permeabilidad_suelo_m_dia: number;
  validacion: DrainageFieldValidation;
  _metadata?: {
    permeabilidad_m_s: number;
    rango_permeabilidad: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────
// CTE DB-HS 5 Anejo G constants
// ─────────────────────────────────────────────────────────────────────────

const CTE_MINIMOS = {
  /** Minimum water table depth below infiltration system (meters) */
  nivel_freatico_minimo_m: 1.0,
  /** Minimum distance to water well/intake (meters) — CTE Anejo G */
  distancia_pozo_minima_m: 30,
  /** Minimum trench separation (meters) */
  separacion_zanjas_minima_m: 2.0,
  /** Maximum length per trench (meters) */
  longitud_maxima_zanja_m: 30,
  /** Standard trench width (meters) */
  ancho_zanja_estandar_m: 0.6,
  /** Standard trench depth (meters) */
  profundidad_zanja_m: 0.8,
  /** Standard filter bed depth (meters) */
  profundidad_lecho_m: 1.0,
  /** Standard filter well depth (meters) */
  profundidad_pozo_m: 2.5,
};

// Permeability thresholds (m/s) per CTE DB-HS 5
const PERMEABILIDAD_LIMITES = {
  /** Below this → soil not suitable for infiltration */
  minima_m_s: 1e-6,
  /** Above this → filter bed needed (too fast for trenches) */
  maxima_zanjas_m_s: 1e-4,
};

// Hydraulic loading rates per soil type (m/day)
const CARGA_HIDRAULICA = {
  zanjas_filtrantes: 0.04, // m³/m²·day (typical for trenches)
  lecho_filtrante: 0.03, // m³/m²·day (filter bed with sand)
  pozo_filtrante: 0.02, // m³/m²·day (filter well, less efficient)
};

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

/** Convert m/day to m/s */
function mDayToMs(k_m_day: number): number {
  return k_m_day / 86400;
}

/** Select recommended system based on permeability */
function selectSystem(k_m_s: number): TipoSistema | null {
  if (k_m_s < PERMEABILIDAD_LIMITES.minima_m_s) {
    return null; // Not suitable
  }
  if (k_m_s > PERMEABILIDAD_LIMITES.maxima_zanjas_m_s) {
    return 'lecho_filtrante';
  }
  return 'zanjas_filtrantes';
}

/** Describe permeability range for metadata */
function describeRange(k_m_s: number): string {
  if (k_m_s < PERMEABILIDAD_LIMITES.minima_m_s) {
    return 'no_apto';
  }
  if (k_m_s < 1e-5) {
    return 'baja';
  }
  if (k_m_s < PERMEABILIDAD_LIMITES.maxima_zanjas_m_s) {
    return 'media';
  }
  return 'alta';
}

// ─────────────────────────────────────────────────────────────────────────
// Main calculation function
// ─────────────────────────────────────────────────────────────────────────

export function calculateDrainageField(input: DrainageFieldInput): DrainageFieldResult {
  const caudal_m3_dia = input.caudal_diario_l / 1000;
  const k_m_dia = input.permeabilidad_suelo_m_dia;
  const k_m_s = mDayToMs(k_m_dia);

  const validacion: DrainageFieldValidation = {
    ok: true,
    bloqueantes: [],
    avisos: [],
  };

  // Auto-select system if not provided
  const recommended = selectSystem(k_m_s);
  const tipo_sistema = input.tipo_sistema ?? recommended ?? 'zanjas_filtrantes';

  // Permeability checks
  if (k_m_s < PERMEABILIDAD_LIMITES.minima_m_s) {
    validacion.ok = false;
    validacion.bloqueantes.push(
      `Permeabilidad del suelo (K=${k_m_s.toExponential(2)} m/s) inferior al mínimo CTE ` +
      `(${PERMEABILIDAD_LIMITES.minima_m_s.toExponential(0)} m/s). Suelo no apto para infiltración. ` +
      `Considerar tratamiento alternativo (filtro de arena, humedal construido).`
    );
  } else if (k_m_s > PERMEABILIDAD_LIMITES.maxima_zanjas_m_s && tipo_sistema === 'zanjas_filtrantes') {
    validacion.avisos.push(
      `Permeabilidad alta (K=${k_m_s.toExponential(2)} m/s). ` +
      `Se recomienda lecho filtrante con capa de arena en lugar de zanjas.`
    );
  }

  // Water table check
  if (input.nivel_freatico_m !== undefined && input.nivel_freatico_m < CTE_MINIMOS.nivel_freatico_minimo_m) {
    validacion.ok = false;
    validacion.bloqueantes.push(
      `Nivel freático (${input.nivel_freatico_m} m) inferior al mínimo CTE Anejo G ` +
      `(${CTE_MINIMOS.nivel_freatico_minimo_m} m). Riesgo de contaminación de aguas subterráneas.`
    );
  }

  // Distance to water well check
  if (
    input.distancia_pozo_agua_m !== undefined &&
    input.distancia_pozo_agua_m < CTE_MINIMOS.distancia_pozo_minima_m
  ) {
    validacion.ok = false;
    validacion.bloqueantes.push(
      `Distancia a pozo de agua (${input.distancia_pozo_agua_m} m) inferior al mínimo CTE Anejo G ` +
      `(${CTE_MINIMOS.distancia_pozo_minima_m} m). Riesgo de contaminación de captación.`
    );
  }

  // Calculate infiltration surface
  // Standard formula: A = Q / q, where q = hydraulic loading rate
  const carga_hidraulica = CARGA_HIDRAULICA[tipo_sistema];

  // Adjust loading rate based on actual K (more permeable = higher rate, within limits)
  const carga_ajustada = Math.min(
    Math.max(carga_hidraulica, k_m_dia * 0.05),
    carga_hidraulica * 2 // cap at 2x the standard rate
  );

  const superficie_infiltracion_m2 = caudal_m3_dia / carga_ajustada;

  // System-specific dimensions
  let longitud_total_zanjas_m: number | null = null;
  let num_zanjas: number | null = null;
  let separacion_zanjas_m: number | null = null;
  let ancho_zanja_m: number | null = null;
  let profundidad_m: number;

  if (tipo_sistema === 'zanjas_filtrantes') {
    ancho_zanja_m = CTE_MINIMOS.ancho_zanja_estandar_m;
    profundidad_m = CTE_MINIMOS.profundidad_zanja_m;
    longitud_total_zanjas_m = superficie_infiltracion_m2 / ancho_zanja_m;

    // Number of trenches based on max length per trench
    num_zanjas = Math.ceil(longitud_total_zanjas_m / CTE_MINIMOS.longitud_maxima_zanja_m);
    separacion_zanjas_m = CTE_MINIMOS.separacion_zanjas_minima_m;

    // Round trench length up
    longitud_total_zanjas_m = parseFloat(longitud_total_zanjas_m.toFixed(2));
  } else if (tipo_sistema === 'lecho_filtrante') {
    profundidad_m = CTE_MINIMOS.profundidad_lecho_m;
  } else {
    // pozo_filtrante
    profundidad_m = CTE_MINIMOS.profundidad_pozo_m;
  }

  return {
    tipo_sistema,
    dimensiones: {
      superficie_infiltracion_m2: parseFloat(superficie_infiltracion_m2.toFixed(2)),
      longitud_total_zanjas_m,
      num_zanjas,
      separacion_zanjas_m,
      profundidad_m,
      ancho_zanja_m,
    },
    carga_hidraulica_m_dia: parseFloat(carga_ajustada.toFixed(4)),
    permeabilidad_suelo_m_dia: k_m_dia,
    validacion,
    _metadata: {
      permeabilidad_m_s: parseFloat(k_m_s.toExponential(3)),
      rango_permeabilidad: describeRange(k_m_s),
    },
  };
}
