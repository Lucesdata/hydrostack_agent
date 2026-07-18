/**
 * Tipos y lógica pura (sin red, sin DB) de la matriz de métricas
 * interactivas del landing. Los nombres de propiedad son snake_case a
 * propósito: mapean 1:1 al JSON servido por `/api/landing-metrics` (spec
 * §5) — no hay capa de traducción entre "forma interna" y "forma de red".
 */
import type { SectorKey } from './sectorKeywords';

/** Mínimo de contratos firmados en la ventana para reportar promedio/mediana
 *  con confianza; si no, `muestra_suficiente: false`. */
export const MIN_SAMPLE_SIZE = 5;

export interface OportunidadActiva {
  valor_cop: number;
  n_procesos: number;
}

export interface CicloProceso {
  promedio_dias: number | null;
  mediana_dias: number | null;
  n_muestra: number;
  muestra_suficiente: boolean;
}

export interface Combinacion {
  departamento: string;
  sector: SectorKey;
  oportunidad_activa: OportunidadActiva;
  ciclo_proceso: CicloProceso;
}

export interface LandingMetricsPayload {
  fecha_corte: string; // YYYY-MM-DD
  combinaciones: Combinacion[];
  nacional: {
    oportunidad_activa: OportunidadActiva;
    ciclo_proceso: CicloProceso;
  };
}

/** Mediana de una lista de números. No muta el array de entrada. */
export function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function average(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * Arma el bloque `ciclo_proceso` a partir de la lista cruda de días
 * (fecha_de_fin_del_contrato − fecha_de_firma) de una combinación.
 */
export function buildCicloProceso(diasArray: number[]): CicloProceso {
  const n = diasArray.length;
  if (n === 0) {
    return { promedio_dias: null, mediana_dias: null, n_muestra: 0, muestra_suficiente: false };
  }
  return {
    promedio_dias: Math.round(average(diasArray)),
    mediana_dias: Math.round(median(diasArray)),
    n_muestra: n,
    muestra_suficiente: n >= MIN_SAMPLE_SIZE,
  };
}
