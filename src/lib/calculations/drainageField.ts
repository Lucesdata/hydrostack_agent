/**
 * Pure function for drainage field (infiltration system) sizing.
 *
 * Implements Fase 3 — Campo de drenaje mejorado:
 * - Perc test input (25mm descent or min/cm) → Ka via Crites & Tchobanoglous
 * - Evapotranspiration correction for high-altitude cold climates (Bogotá)
 * - Configurable safety factor FS (1.10–1.50, default 1.20)
 * - System types: zanjas_filtrantes, lecho_filtrante, pozo_filtrante,
 *                 monticulo_filtrante, camara_infiltracion, campo_aspersion
 *
 * References:
 * - Crites & Tchobanoglous, Small and Decentralized Wastewater Management Systems, 1998
 * - Resolución 0330/2017 Art. 134–145 (Colombia)
 * - CTE DB-HS 5 Anejo G (Spain)
 */

export type TipoSistema =
  | 'zanjas_filtrantes'
  | 'lecho_filtrante'
  | 'pozo_filtrante'
  | 'monticulo_filtrante'   // Mound system — for high water table or low-K soil
  | 'camara_infiltracion'   // Chamber system — higher efficiency, no gravel
  | 'campo_aspersion';      // Spray irrigation — needs secondary treatment, permitted zones only

export interface DrainageFieldInput {
  /** Daily flow in liters/day. Typically from calculate_septic_tank output. */
  caudal_diario_l: number;

  /** Soil permeability (K) in m/day. Optional if perc test provided. */
  permeabilidad_suelo_m_dia?: number;

  /** Type of drainage system. If omitted, auto-selected based on K / soil type. */
  tipo_sistema?: TipoSistema;

  /** Water table depth in meters from natural grade. */
  nivel_freatico_m?: number;

  /** Distance to water well/intake in meters. */
  distancia_pozo_agua_m?: number;

  // ── Fase 3 additions ──────────────────────────────────────────────────────

  /**
   * Perc test: time for 25 mm drop in the borehole (minutes).
   * ASTM D6391 standard measurement.
   * Converted internally: T_perc (min/cm) = tiempo_descenso_25mm_min / 2.5
   * Then: Ka = 70 / sqrt(T_perc)  [Crites & Tchobanoglous]
   * If provided, overrides permeabilidad_suelo_m_dia for Ka calculation.
   */
  tiempo_descenso_25mm_min?: number;

  /**
   * Mean daily evapotranspiration (mm/day) for the site.
   * Used to reduce effective Ka for high-altitude cold climates (Bogotá ~3–5 mm/day).
   * Reduces Ka by ETP / Ka_gross before FS.
   * Typical values: Bogotá 3.5, Medellín 4.2, coastal Colombia 6–8.
   */
  etp_media_mm_dia?: number;

  /**
   * Safety factor applied to infiltration area.
   * A_diseño = A_neta * FS
   * Default: 1.20. Range: 1.10 (favorable, well-tested soil) to 1.50 (marginal soil or uncertain perc test).
   */
  factor_seguridad?: number;
}

export interface DrainageFieldDimensions {
  superficie_neta_m2: number;      // Before FS
  superficie_diseno_m2: number;    // After FS (this is what to build)
  longitud_total_zanjas_m: number | null;
  longitud_por_zanja_m: number | null;
  num_zanjas: number | null;
  separacion_zanjas_m: number | null;
  profundidad_m: number;
  ancho_zanja_m: number | null;
  elevacion_monticulo_m?: number;  // For mound systems only
}

export interface DrainageFieldValidation {
  ok: boolean;
  bloqueantes: string[];
  avisos: string[];
}

export interface DrainageFieldResult {
  tipo_sistema: TipoSistema;
  ka_l_m2_dia: number;             // Effective infiltration rate used (after ETP correction)
  ka_bruto_l_m2_dia: number;       // Gross Ka before ETP correction
  factor_seguridad: number;
  etp_correccion_aplicada: boolean;
  dimensiones: DrainageFieldDimensions;
  permeabilidad_suelo_m_dia: number;
  validacion: DrainageFieldValidation;
  metodologia: {
    fuente_ka: 'perc_test_25mm' | 'perc_test_min_cm' | 'permeabilidad_suelo' | 'tabla_suelo';
    t_perc_min_cm?: number;        // Perc test result in min/cm
    ka_crites_tchobanoglous?: number; // Ka from C&T table before ETP correction
    norma_ref: string;
  };
  _metadata?: {
    permeabilidad_m_s: number;
    rango_permeabilidad: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────

const MINIMOS = {
  nivel_freatico_minimo_m: 1.0,
  distancia_pozo_minima_m: 30,
  separacion_zanjas_minima_m: 2.0,
  longitud_maxima_zanja_m: 30,
  ancho_zanja_estandar_m: 0.6,
  profundidad_zanja_m: 0.8,
  profundidad_lecho_m: 1.0,
  profundidad_pozo_m: 2.5,
  profundidad_monticulo_base_m: 0.6,  // Gravel bed depth in mound system
  elevacion_monticulo_m: 0.6,         // Mound height above natural grade
};

const PERC_LIMITES = {
  /** Below this (min/cm) → soil too fast, risk of contamination */
  minima_t_perc_min_cm: 1.0,
  /** Above this (min/cm) → soil not suitable for infiltration */
  maxima_t_perc_min_cm: 30.0,
};

const PERMEABILIDAD_LIMITES = {
  minima_m_s: 1e-6,
  maxima_zanjas_m_s: 1e-4,
};

// Default Ka by system type (L/m²·day) when no perc test is available
// Used only as a sanity cap; actual Ka comes from perc test or K
const KA_DEFAULTS: Record<TipoSistema, number> = {
  zanjas_filtrantes:  40,
  lecho_filtrante:    30,
  pozo_filtrante:     20,
  monticulo_filtrante: 35,  // Similar to zanjas but with controlled fill
  camara_infiltracion: 60,  // Higher — no gravel, greater contact area
  campo_aspersion:    100,  // Highest — surface application
};

// Safety factor normative justification
const FS_NORMA: Record<string, string> = {
  '1.10': 'Suelo bien caracterizado con ≥3 ensayos de perc test en el mismo punto. Condiciones favorables.',
  '1.20': 'Valor por defecto (RAS 2017 Art. 135; Crites & Tchobanoglous §5.3). Caso general.',
  '1.30': 'Suelo heterogéneo o un solo ensayo de perc test. Mayor incertidumbre.',
  '1.50': 'Suelo marginal, datos escasos o período de lluvias. Máxima cautela.',
};

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function mDayToMs(k_m_day: number): number {
  return k_m_day / 86400;
}

/**
 * Crites & Tchobanoglous (1998) formula:
 * Ka (L/m²·day) = 70 / sqrt(T_perc_min_cm)
 * Valid for T_perc between 1 and 30 min/cm.
 */
function kaFromPercTest(t_perc_min_cm: number): number {
  if (t_perc_min_cm <= 0) return 0;
  return 70 / Math.sqrt(t_perc_min_cm);
}

/**
 * Approximate Ka from soil permeability K (m/day).
 * Uses a simplified empirical relationship for filter trenches.
 * For more accurate results, a perc test is preferred.
 */
function kaFromPermeability(k_m_dia: number): number {
  // Convert K to effective infiltration rate
  // Typical trench utilizes ~5% of K as hydraulic loading (empirical)
  const ka_raw = k_m_dia * 1000 * 0.05; // m/day → L/m²·day × 5%
  return Math.min(Math.max(ka_raw, 2), 100); // Clamp to realistic range
}

function selectSystem(
  k_m_s: number,
  nivel_freatico_m: number | undefined
): TipoSistema | null {
  if (k_m_s < PERMEABILIDAD_LIMITES.minima_m_s) return null;

  // High water table → recommend mound
  if (nivel_freatico_m !== undefined && nivel_freatico_m < 1.5) {
    return 'monticulo_filtrante';
  }

  if (k_m_s > PERMEABILIDAD_LIMITES.maxima_zanjas_m_s) return 'lecho_filtrante';
  return 'zanjas_filtrantes';
}

function describeRange(k_m_s: number): string {
  if (k_m_s < PERMEABILIDAD_LIMITES.minima_m_s) return 'no_apto';
  if (k_m_s < 1e-5) return 'baja';
  if (k_m_s < PERMEABILIDAD_LIMITES.maxima_zanjas_m_s) return 'media';
  return 'alta';
}

/**
 * Apply ETP correction to Ka.
 * For cold/dry altiplano sites, some infiltration capacity is consumed by
 * evapotranspiration, reducing effective hydraulic conductivity by 10–15%.
 *
 * The correction is: Ka_ef = Ka * (1 - min(ETP_mm/Ka_mm, 0.20))
 * Capped at 20% reduction to avoid over-correction.
 */
function applyEtpCorrection(ka_l_m2_dia: number, etp_mm_dia: number): number {
  const etp_l_m2 = etp_mm_dia; // 1 mm/m² = 1 L/m²
  const ratio = etp_l_m2 / ka_l_m2_dia;
  const reduction = Math.min(ratio, 0.20); // cap at 20%
  return ka_l_m2_dia * (1 - reduction);
}

// ─────────────────────────────────────────────────────────────────────────
// Main calculation function
// ─────────────────────────────────────────────────────────────────────────

export function calculateDrainageField(input: DrainageFieldInput): DrainageFieldResult {
  const caudal_m3_dia = input.caudal_diario_l / 1000;
  const factor_seguridad = Math.min(Math.max(input.factor_seguridad ?? 1.20, 1.10), 1.50);

  const validacion: DrainageFieldValidation = {
    ok: true,
    bloqueantes: [],
    avisos: [],
  };

  // ── Step 1: Determine Ka (infiltration rate) ──────────────────────────

  let ka_bruto = 0;
  let t_perc_min_cm: number | undefined;
  let fuente_ka: DrainageFieldResult['metodologia']['fuente_ka'];
  let k_m_dia = input.permeabilidad_suelo_m_dia ?? 0;

  if (input.tiempo_descenso_25mm_min !== undefined) {
    // ASTM D6391: 25mm drop → T_perc (min/cm) = time / 2.5
    t_perc_min_cm = input.tiempo_descenso_25mm_min / 2.5;
    fuente_ka = 'perc_test_25mm';

    if (t_perc_min_cm < PERC_LIMITES.minima_t_perc_min_cm) {
      validacion.avisos.push(
        `T_perc = ${t_perc_min_cm.toFixed(1)} min/cm — suelo muy rápido (< ${PERC_LIMITES.minima_t_perc_min_cm} min/cm). ` +
        `Riesgo de contaminación de agua subterránea por tránsito demasiado rápido. ` +
        `Verificar si el suelo requiere barrera de arena intermedia.`
      );
    }
    if (t_perc_min_cm > PERC_LIMITES.maxima_t_perc_min_cm) {
      validacion.ok = false;
      validacion.bloqueantes.push(
        `T_perc = ${t_perc_min_cm.toFixed(1)} min/cm — suelo no apto (> ${PERC_LIMITES.maxima_t_perc_min_cm} min/cm). ` +
        `La infiltración es demasiado lenta para un campo estándar. ` +
        `Considerar montículo filtrante o humedal construido.`
      );
    }
    ka_bruto = kaFromPercTest(t_perc_min_cm);

    // Approximate permeability for metadata
    if (!k_m_dia) k_m_dia = (ka_bruto / 1000) / 0.05;

  } else if (k_m_dia > 0) {
    // Use provided soil permeability
    const k_m_s = mDayToMs(k_m_dia);

    if (k_m_s < PERMEABILIDAD_LIMITES.minima_m_s) {
      validacion.ok = false;
      validacion.bloqueantes.push(
        `Permeabilidad del suelo (K=${k_m_s.toExponential(2)} m/s) inferior al mínimo ` +
        `(${PERMEABILIDAD_LIMITES.minima_m_s.toExponential(0)} m/s). ` +
        `Suelo no apto para infiltración directa. Considerar montículo filtrante o tratamiento alternativo.`
      );
    }
    ka_bruto = kaFromPermeability(k_m_dia);
    fuente_ka = 'permeabilidad_suelo';

  } else {
    // No soil data — use conservative default
    ka_bruto = 15; // Conservative default (silt/loam equivalent)
    fuente_ka = 'tabla_suelo';
    validacion.avisos.push(
      `No se proporcionó permeabilidad ni perc test. ` +
      `Se usa Ka conservador = 15 L/m²·día (equivalente limo/franco). ` +
      `Realizar perc test in-situ para dimensionamiento definitivo.`
    );
  }

  // ── Step 2: Apply ETP correction ─────────────────────────────────────

  let ka_efectiva = ka_bruto;
  let etp_correccion_aplicada = false;

  if (input.etp_media_mm_dia !== undefined && input.etp_media_mm_dia > 0) {
    ka_efectiva = applyEtpCorrection(ka_bruto, input.etp_media_mm_dia);
    etp_correccion_aplicada = true;
    const pct = Math.round((1 - ka_efectiva / ka_bruto) * 100);
    validacion.avisos.push(
      `Corrección ETP aplicada (ETP = ${input.etp_media_mm_dia} mm/día): ` +
      `Ka reducida de ${ka_bruto.toFixed(1)} → ${ka_efectiva.toFixed(1)} L/m²·día (−${pct}%). ` +
      `Válido para sitios de altiplano (Bogotá, Cundinamarca).`
    );
  }

  if (ka_efectiva <= 0) ka_efectiva = 1; // Safety guard

  // ── Step 3: Select system type ────────────────────────────────────────

  const k_m_s = mDayToMs(k_m_dia > 0 ? k_m_dia : 0.1);
  const recommended = selectSystem(k_m_s, input.nivel_freatico_m);
  const tipo_sistema: TipoSistema = input.tipo_sistema ?? recommended ?? 'zanjas_filtrantes';

  // ── Step 4: System-specific Ka adjustments ────────────────────────────

  let ka_sistema = ka_efectiva;
  if (tipo_sistema === 'camara_infiltracion') {
    // Chamber systems have ~50% more contact area efficiency
    ka_sistema = ka_efectiva * 1.5;
  } else if (tipo_sistema === 'campo_aspersion') {
    // Spray fields operate at higher hydraulic loading
    ka_sistema = Math.min(ka_efectiva * 2.0, 100);
    validacion.avisos.push(
      `Campo de aspersión: requiere tratamiento secundario (efluente de fosa séptica + filtro percolador o UASB). ` +
      `Solo en zonas con permiso de vertimientos superficial (SDA/CAR).`
    );
  }

  // Permeability / type validation warnings
  if (
    k_m_s > PERMEABILIDAD_LIMITES.maxima_zanjas_m_s &&
    tipo_sistema === 'zanjas_filtrantes'
  ) {
    validacion.avisos.push(
      `Permeabilidad alta (K=${k_m_s.toExponential(2)} m/s). ` +
      `Se recomienda lecho filtrante con capa de arena en lugar de zanjas.`
    );
  }

  if (tipo_sistema === 'monticulo_filtrante' && input.nivel_freatico_m === undefined) {
    validacion.avisos.push(
      `Montículo filtrante seleccionado: confirmar nivel freático medido in-situ. ` +
      `El montículo debe garantizar ≥ 1.20 m entre el fondo del sistema y el N.F.`
    );
  }

  // ── Step 5: Water table and well distance checks ───────────────────────

  if (
    input.nivel_freatico_m !== undefined &&
    input.nivel_freatico_m < MINIMOS.nivel_freatico_minimo_m
  ) {
    if (tipo_sistema !== 'monticulo_filtrante') {
      validacion.ok = false;
      validacion.bloqueantes.push(
        `Nivel freático (${input.nivel_freatico_m} m) inferior al mínimo (${MINIMOS.nivel_freatico_minimo_m} m). ` +
        `Sistema estándar inviable. Usar montículo filtrante (monticulo_filtrante) o cámara elevada.`
      );
    }
  }

  if (
    input.distancia_pozo_agua_m !== undefined &&
    input.distancia_pozo_agua_m < MINIMOS.distancia_pozo_minima_m
  ) {
    validacion.ok = false;
    validacion.bloqueantes.push(
      `Distancia a pozo de agua (${input.distancia_pozo_agua_m} m) inferior al mínimo ` +
      `(${MINIMOS.distancia_pozo_minima_m} m — Res. 0330/2017 Art. 143). Riesgo de contaminación de captación.`
    );
  }

  // ── Step 6: Calculate areas ───────────────────────────────────────────

  const superficie_neta_m2 = caudal_m3_dia * 1000 / ka_sistema;
  const superficie_diseno_m2 = superficie_neta_m2 * factor_seguridad;

  // ── Step 7: System-specific dimensions ────────────────────────────────

  let longitud_total_zanjas_m: number | null = null;
  let longitud_por_zanja_m: number | null = null;
  let num_zanjas: number | null = null;
  let separacion_zanjas_m: number | null = null;
  let ancho_zanja_m: number | null = null;
  let profundidad_m: number;
  let elevacion_monticulo_m: number | undefined;

  if (tipo_sistema === 'zanjas_filtrantes' || tipo_sistema === 'monticulo_filtrante') {
    ancho_zanja_m = MINIMOS.ancho_zanja_estandar_m;
    profundidad_m = tipo_sistema === 'monticulo_filtrante'
      ? MINIMOS.profundidad_monticulo_base_m
      : MINIMOS.profundidad_zanja_m;

    longitud_total_zanjas_m = parseFloat((superficie_diseno_m2 / ancho_zanja_m).toFixed(2));
    num_zanjas = Math.ceil(longitud_total_zanjas_m / MINIMOS.longitud_maxima_zanja_m);
    longitud_por_zanja_m = parseFloat((longitud_total_zanjas_m / num_zanjas).toFixed(2));
    separacion_zanjas_m = MINIMOS.separacion_zanjas_minima_m;

    if (tipo_sistema === 'monticulo_filtrante') {
      elevacion_monticulo_m = MINIMOS.elevacion_monticulo_m;
      validacion.avisos.push(
        `Montículo filtrante: elevar el campo ${elevacion_monticulo_m} m sobre la rasante natural. ` +
        `Usar material granular importado (arena gruesa + grava). Verificar estabilidad de taludes (pendiente ≤ 3:1).`
      );
    }

  } else if (tipo_sistema === 'camara_infiltracion') {
    ancho_zanja_m = 0.9; // Standard chamber width
    profundidad_m = 0.5;  // Chamber height
    longitud_total_zanjas_m = parseFloat((superficie_diseno_m2 / ancho_zanja_m).toFixed(2));
    num_zanjas = Math.ceil(longitud_total_zanjas_m / MINIMOS.longitud_maxima_zanja_m);
    longitud_por_zanja_m = parseFloat((longitud_total_zanjas_m / num_zanjas).toFixed(2));
    separacion_zanjas_m = MINIMOS.separacion_zanjas_minima_m;
    validacion.avisos.push(
      `Cámara de infiltración: instalar cámaras plásticas prefabricadas (tipo Infiltrator® o similar). ` +
      `No requiere grava. Separación mínima entre filas: 2.0 m.`
    );

  } else if (tipo_sistema === 'lecho_filtrante') {
    profundidad_m = MINIMOS.profundidad_lecho_m;

  } else if (tipo_sistema === 'campo_aspersion') {
    profundidad_m = 0.3; // Sprinkler installation depth
    validacion.avisos.push(
      `Campo de aspersión: tasa hidráulica superficial (≤ 2.5 cm/día). ` +
      `Mantener buffer de seguridad de 30 m a edificaciones y 60 m a captaciones de agua.`
    );

  } else {
    // pozo_filtrante
    profundidad_m = MINIMOS.profundidad_pozo_m;
  }

  // ── Step 8: Determine FS norma justification ──────────────────────────

  const fs_str = factor_seguridad.toFixed(2);
  const fs_norma_key = ['1.10', '1.20', '1.30', '1.50'].reduce((prev, curr) =>
    Math.abs(parseFloat(curr) - factor_seguridad) < Math.abs(parseFloat(prev) - factor_seguridad) ? curr : prev
  );

  return {
    tipo_sistema,
    ka_l_m2_dia: parseFloat(ka_efectiva.toFixed(2)),
    ka_bruto_l_m2_dia: parseFloat(ka_bruto.toFixed(2)),
    factor_seguridad,
    etp_correccion_aplicada,
    dimensiones: {
      superficie_neta_m2: parseFloat(superficie_neta_m2.toFixed(2)),
      superficie_diseno_m2: parseFloat(superficie_diseno_m2.toFixed(2)),
      longitud_total_zanjas_m,
      longitud_por_zanja_m,
      num_zanjas,
      separacion_zanjas_m,
      profundidad_m,
      ancho_zanja_m,
      ...(elevacion_monticulo_m !== undefined ? { elevacion_monticulo_m } : {}),
    },
    permeabilidad_suelo_m_dia: parseFloat(k_m_dia.toFixed(4)),
    validacion,
    metodologia: {
      fuente_ka,
      ...(t_perc_min_cm !== undefined ? { t_perc_min_cm: parseFloat(t_perc_min_cm.toFixed(2)) } : {}),
      ...(t_perc_min_cm !== undefined ? { ka_crites_tchobanoglous: parseFloat(ka_bruto.toFixed(2)) } : {}),
      norma_ref: 'Crites & Tchobanoglous (1998) §5.3 · RAS 2017 Art. 134–145 · CTE DB-HS 5 Anejo G',
    },
    _metadata: {
      permeabilidad_m_s: parseFloat(mDayToMs(k_m_dia).toExponential(3)),
      rango_permeabilidad: describeRange(mDayToMs(k_m_dia)),
    },
  };
}

export { KA_DEFAULTS, FS_NORMA, PERC_LIMITES };
