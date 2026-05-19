/**
 * Pure function for septic tank calculation according to CTE DB-HS 5 (Spain)
 * and RD 1620/2007.
 *
 * This module extracts the core hydraulic calculations from SepticTankCalculator.jsx
 * and provides a testable, type-safe interface for tool use and future integrations.
 */

export type TipoUso =
  | 'vivienda_unifamiliar'
  | 'vivienda_colectiva'
  | 'restaurante'
  | 'hotel'
  | 'camping'
  | 'oficina'
  | 'industrial';

export interface SepticTankInput {
  /** Habitantes equivalentes (h-e). Vivienda unifamiliar: mínimo 5 */
  habitantes_equivalentes: number;
  /** Type of use (determines defaults per CTE DB-HS 5) */
  tipo_uso: TipoUso;
  /** Daily allowance in L/hab·day. Default: 200 (Spain) */
  dotacion_litros_hab_dia?: number;
  /** Hydraulic retention time in days. Default: 2, Min: 1 */
  tiempo_retencion_dias?: number;
  /** Number of settling chambers. Default: 2, Options: 2 | 3 */
  numero_compartimentos?: number;
  /** Depth of useful water zone in meters. Default: 1.2 */
  profundidad_m?: number;
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
  volumen_util_litros: number;
  volumen_total_litros: number;
  dimensiones: SepticTankDimensions;
  num_compartimentos: number;
  tiempo_retencion_dias: number;
  caudal_diario_litros: number;
  caudal_segundos: number;
  validacion_cte: ValidationCTE;
  /** Additional metadata for display/debug */
  _metadata?: {
    volumen_liquido_litros: number;
    volumen_lodos_litros: number;
    volumen_natas_litros: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Defaults and CTE DB-HS 5 constants
// ─────────────────────────────────────────────────────────────────────────

const DEFAULTS_POR_TIPO: Record<TipoUso, { dotacion: number; min_he: number }> = {
  vivienda_unifamiliar: { dotacion: 200, min_he: 5 },
  vivienda_colectiva: { dotacion: 200, min_he: 5 },
  restaurante: { dotacion: 200, min_he: 50 },
  hotel: { dotacion: 200, min_he: 10 },
  camping: { dotacion: 150, min_he: 10 },
  oficina: { dotacion: 100, min_he: 5 },
  industrial: { dotacion: 100, min_he: 5 },
};

// CTE DB-HS 5 minimum parameters
const CTE_MINIMOS = {
  profundidad_util: 1.0, // metros
  ancho_minimo: 0.75, // metros
  largo_minimo: 1.5, // metros
  tiempo_retencion_minimo: 1, // días
  tiempo_retencion_recomendado: 2, // días
  tablero_seguridad_minimo: 0.30, // metros (freeboard)
};

// Sludge accumulation rate per CTE DB-HS 5 (kg/(person·year))
const TASA_LODOS = 50; // kg/(person·year)

// Scum factor (relative to liquid volume)
const FACTOR_NATAS = 0.25; // 25% of liquid volume

// ─────────────────────────────────────────────────────────────────────────
// Main calculation function
// ─────────────────────────────────────────────────────────────────────────

export function calculateSepticTank(input: SepticTankInput): SepticTankResult {
  // Validate and normalize input
  const he = Math.max(input.habitantes_equivalentes, 1);

  // Get defaults for tipo_uso
  const defaults = DEFAULTS_POR_TIPO[input.tipo_uso] || DEFAULTS_POR_TIPO.vivienda_unifamiliar;

  const dotacion = input.dotacion_litros_hab_dia ?? defaults.dotacion;
  const tiempo_ret = input.tiempo_retencion_dias ?? CTE_MINIMOS.tiempo_retencion_recomendado;
  const profundidad = input.profundidad_m ?? 1.2;
  const num_compartimentos = input.numero_compartimentos ?? 2;

  // Enforce minimums per CTE
  const he_efectiva = Math.max(he, defaults.min_he);
  const tiempo_ret_efectivo = Math.max(tiempo_ret, CTE_MINIMOS.tiempo_retencion_minimo);
  const profundidad_efectiva = Math.max(profundidad, CTE_MINIMOS.profundidad_util);

  // Calculate flows and volumes
  const caudal_diario = he_efectiva * dotacion; // litros/día
  const caudal_segundos = caudal_diario / 86400; // L/s

  // Liquid volume: residence time × daily flow
  const volumen_liquido = caudal_diario * tiempo_ret_efectivo; // litros

  // Sludge volume: accumulated over 1 year cleaning cycle (CTE default)
  const volumen_lodos = (he_efectiva * TASA_LODOS * 1 * 1000) / 1000; // liters (1 year = 1 para cálculo)

  // Scum volume: fraction of liquid volume
  const volumen_natas = FACTOR_NATAS * volumen_liquido; // litros

  // Total useful volume
  let volumen_util = volumen_liquido + volumen_lodos + volumen_natas; // litros

  // Minimum volume per CTE (vivienda unifamiliar: typically 2000-3000L)
  const volumen_minimo = he_efectiva * 200 * 2; // empirical minimum: he × dotacion × 2 days

  let aplicado_minimo = false;
  if (volumen_util < volumen_minimo) {
    volumen_util = volumen_minimo;
    aplicado_minimo = true;
  }

  // Tank dimensions
  // Proportions: Length:Width:Height ≈ 2:1:1.3 (typical septic design)
  const volumen_m3 = volumen_util / 1000; // convert to m³
  const area = volumen_m3 / profundidad_efectiva; // m²
  const ancho = Math.sqrt(area / 2); // W = sqrt(A/2) for L=2W proportion
  const largo = 2 * ancho; // L = 2W

  // Total height includes freeboard (safety margin)
  const alto_total = profundidad_efectiva + CTE_MINIMOS.tablero_seguridad_minimo;

  // Validation against CTE DB-HS 5
  const validacion = {
    ok: true,
    avisos: [] as string[],
    cumple_minimo_he: he >= defaults.min_he,
    cumple_retencion: tiempo_ret >= CTE_MINIMOS.tiempo_retencion_minimo,
    cumple_profundidad: profundidad >= CTE_MINIMOS.profundidad_util,
  };

  if (he < defaults.min_he) {
    validacion.avisos.push(
      `Ocupación inferior a mínimo normativo (${defaults.min_he} h-e). ` +
      `Se normaliza a ${defaults.min_he} h-e.`
    );
    validacion.cumple_minimo_he = false;
  }

  if (tiempo_ret < CTE_MINIMOS.tiempo_retencion_minimo) {
    validacion.avisos.push(
      `Tiempo de retención menor al mínimo CTE (${CTE_MINIMOS.tiempo_retencion_minimo} día). ` +
      `Se usa valor mínimo.`
    );
    validacion.cumple_retencion = false;
  }

  if (profundidad < CTE_MINIMOS.profundidad_util) {
    validacion.avisos.push(
      `Profundidad útil menor al mínimo CTE (${CTE_MINIMOS.profundidad_util} m). ` +
      `Se usa valor mínimo.`
    );
    validacion.cumple_profundidad = false;
  }

  if (ancho < CTE_MINIMOS.ancho_minimo) {
    validacion.avisos.push(
      `Ancho calculado (${ancho.toFixed(2)} m) menor al mínimo normativo (${CTE_MINIMOS.ancho_minimo} m). ` +
      `Revisar profundidad o volumen.`
    );
    validacion.ok = false;
  }

  if (largo < CTE_MINIMOS.largo_minimo) {
    validacion.avisos.push(
      `Largo calculado (${largo.toFixed(2)} m) menor al mínimo normativo (${CTE_MINIMOS.largo_minimo} m). ` +
      `Revisar profundidad o volumen.`
    );
    validacion.ok = false;
  }

  return {
    volumen_util_litros: Math.round(volumen_util),
    volumen_total_litros: Math.round(volumen_util + (CTE_MINIMOS.tablero_seguridad_minimo * (largo * ancho) * 1000)),
    dimensiones: {
      largo_m: parseFloat(largo.toFixed(2)),
      ancho_m: parseFloat(ancho.toFixed(2)),
      alto_util_m: parseFloat(profundidad_efectiva.toFixed(2)),
      alto_total_m: parseFloat(alto_total.toFixed(2)),
    },
    num_compartimentos,
    tiempo_retencion_dias: parseFloat(tiempo_ret_efectivo.toFixed(1)),
    caudal_diario_litros: Math.round(caudal_diario),
    caudal_segundos: parseFloat(caudal_segundos.toFixed(3)),
    validacion_cte: validacion,
    _metadata: {
      volumen_liquido_litros: Math.round(volumen_liquido),
      volumen_lodos_litros: Math.round(volumen_lodos),
      volumen_natas_litros: Math.round(volumen_natas),
    },
  };
}
