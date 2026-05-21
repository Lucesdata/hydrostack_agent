/**
 * CTE DB-HS 5 and RD 1620/2007 validator.
 *
 * Read-only validator that checks an already-computed septic tank + drainage
 * field design against Spanish regulatory requirements and returns a
 * structured compliance report.
 *
 * This module does NOT recalculate anything. It only validates existing results.
 */

import type { SepticTankResult } from '@/src/lib/calculations/septicTank';
import type { DrainageFieldResult } from '@/src/lib/calculations/drainageField';

export interface ValidationContext {
  /** Distance from system to dwelling in meters */
  distancia_vivienda_m?: number;
  /** Distance from infiltration field to water well in meters */
  distancia_pozo_m?: number;
  /** Whether the site is in a protected zone (e.g., aquifer recharge area) */
  zona_protegida_bool?: boolean;
}

export interface CteValidatorInput {
  septic_tank?: SepticTankResult;
  drainage_field?: DrainageFieldResult;
  contexto?: ValidationContext;
}

export interface ValidationIssue {
  codigo: string;
  articulo: string;
  descripcion: string;
}

export interface CteValidationResult {
  cumple: boolean;
  bloqueantes: ValidationIssue[];
  advertencias: ValidationIssue[];
  referencias_normativas: string[];
}

// ─────────────────────────────────────────────────────────────────────────
// CTE DB-HS 5 minimum thresholds
// ─────────────────────────────────────────────────────────────────────────

const CTE_LIMITES = {
  /** Min volume per CTE §3.3.1: h-e × 200 L × 2 días */
  volumen_minimo_por_he: 200 * 2, // 400 L per h-e
  /** Min distance from system to dwelling (CTE Anejo G) */
  distancia_vivienda_minima_m: 5,
  /** Min distance from infiltration to water well (CTE Anejo G) */
  distancia_pozo_minima_m: 30,
  /** Min water table depth below infiltration system */
  nivel_freatico_minimo_m: 1.0,
  /** Min retention time (CTE) */
  tiempo_retencion_minimo_dias: 1,
};

// ─────────────────────────────────────────────────────────────────────────
// Validation rules
// ─────────────────────────────────────────────────────────────────────────

function validateSepticTank(
  tank: SepticTankResult,
  bloqueantes: ValidationIssue[],
  advertencias: ValidationIssue[]
): void {
  // Rule: CTE §3.3.1 — minimum useful volume
  const he = Math.round(tank.caudal_diario_litros / 200); // approximate h-e
  const volumen_minimo = he * CTE_LIMITES.volumen_minimo_por_he;

  if (tank.volumen_util_litros < volumen_minimo) {
    bloqueantes.push({
      codigo: 'CTE-HS5-001',
      articulo: 'CTE DB-HS 5 §3.3.1',
      descripcion:
        `Volumen útil (${tank.volumen_util_litros} L) inferior al mínimo normativo ` +
        `(${volumen_minimo} L = ${he} h-e × 200 L/día × 2 días).`,
    });
  }

  // Rule: CTE — minimum retention time
  if (tank.tiempo_retencion_dias < CTE_LIMITES.tiempo_retencion_minimo_dias) {
    bloqueantes.push({
      codigo: 'CTE-HS5-002',
      articulo: 'CTE DB-HS 5 §3.3.2',
      descripcion:
        `Tiempo de retención hidráulica (${tank.tiempo_retencion_dias} días) inferior al mínimo CTE ` +
        `(${CTE_LIMITES.tiempo_retencion_minimo_dias} día).`,
    });
  }

  // Propagate warnings from septic tank's own validation
  for (const aviso of tank.validacion_cte.avisos) {
    advertencias.push({
      codigo: 'CTE-HS5-AVISO',
      articulo: 'CTE DB-HS 5 §3.3',
      descripcion: aviso,
    });
  }
}

function validateDrainageField(
  field: DrainageFieldResult,
  bloqueantes: ValidationIssue[],
  advertencias: ValidationIssue[]
): void {
  // Propagate blocking issues from drainage field calculation
  for (const bloqueante of field.validacion.bloqueantes) {
    // Categorize by content
    if (bloqueante.includes('pozo')) {
      bloqueantes.push({
        codigo: 'CTE-HS5-G-003',
        articulo: 'CTE DB-HS 5 Anejo G.2',
        descripcion: bloqueante,
      });
    } else if (bloqueante.includes('freático')) {
      bloqueantes.push({
        codigo: 'CTE-HS5-G-004',
        articulo: 'CTE DB-HS 5 Anejo G.3',
        descripcion: bloqueante,
      });
    } else if (bloqueante.includes('Permeabilidad')) {
      bloqueantes.push({
        codigo: 'CTE-HS5-G-005',
        articulo: 'CTE DB-HS 5 Anejo G.1',
        descripcion: bloqueante,
      });
    } else {
      bloqueantes.push({
        codigo: 'CTE-HS5-G-000',
        articulo: 'CTE DB-HS 5 Anejo G',
        descripcion: bloqueante,
      });
    }
  }

  // Propagate warnings
  for (const aviso of field.validacion.avisos) {
    advertencias.push({
      codigo: 'CTE-HS5-G-AVISO',
      articulo: 'CTE DB-HS 5 Anejo G',
      descripcion: aviso,
    });
  }

  // Additional check: separación between trenches
  if (
    field.dimensiones.separacion_zanjas_m !== null &&
    field.dimensiones.separacion_zanjas_m < 2.0
  ) {
    bloqueantes.push({
      codigo: 'CTE-HS5-G-006',
      articulo: 'CTE DB-HS 5 Anejo G.4',
      descripcion:
        `Separación entre zanjas (${field.dimensiones.separacion_zanjas_m} m) inferior al mínimo ` +
        `normativo (2 m).`,
    });
  }
}

function validateContext(
  contexto: ValidationContext,
  bloqueantes: ValidationIssue[],
  advertencias: ValidationIssue[]
): void {
  // Rule: CTE Anejo G — distance to dwelling
  if (
    contexto.distancia_vivienda_m !== undefined &&
    contexto.distancia_vivienda_m < CTE_LIMITES.distancia_vivienda_minima_m
  ) {
    bloqueantes.push({
      codigo: 'CTE-HS5-G-007',
      articulo: 'CTE DB-HS 5 Anejo G.2',
      descripcion:
        `Distancia a vivienda (${contexto.distancia_vivienda_m} m) inferior al mínimo CTE ` +
        `(${CTE_LIMITES.distancia_vivienda_minima_m} m).`,
    });
  }

  // Rule: CTE Anejo G — distance to water well (context-level)
  if (
    contexto.distancia_pozo_m !== undefined &&
    contexto.distancia_pozo_m < CTE_LIMITES.distancia_pozo_minima_m
  ) {
    bloqueantes.push({
      codigo: 'CTE-HS5-G-003',
      articulo: 'CTE DB-HS 5 Anejo G.2',
      descripcion:
        `Distancia a pozo de agua (${contexto.distancia_pozo_m} m) inferior al mínimo CTE ` +
        `(${CTE_LIMITES.distancia_pozo_minima_m} m). Riesgo de contaminación de la captación.`,
    });
  }

  // Rule: RD 1620/2007 — protected zones
  if (contexto.zona_protegida_bool === true) {
    bloqueantes.push({
      codigo: 'RD-1620-001',
      articulo: 'RD 1620/2007 Art. 9',
      descripcion:
        'Emplazamiento en zona protegida. Requiere autorización específica de la Confederación ' +
        'Hidrográfica y posiblemente tratamiento terciario adicional.',
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Main validation function
// ─────────────────────────────────────────────────────────────────────────

export function validateAgainstCte(input: CteValidatorInput): CteValidationResult {
  const bloqueantes: ValidationIssue[] = [];
  const advertencias: ValidationIssue[] = [];

  if (input.septic_tank) {
    validateSepticTank(input.septic_tank, bloqueantes, advertencias);
  }

  if (input.drainage_field) {
    validateDrainageField(input.drainage_field, bloqueantes, advertencias);
  }

  if (input.contexto) {
    validateContext(input.contexto, bloqueantes, advertencias);
  }

  const referencias_normativas = [
    'CTE DB-HS 5 — Documento Básico de Salubridad, Sección 5: Evacuación de aguas',
    'CTE DB-HS 5 Anejo G — Sistemas individuales de tratamiento de aguas residuales',
    'RD 1620/2007 — Régimen jurídico de la reutilización de aguas depuradas',
  ];

  return {
    cumple: bloqueantes.length === 0,
    bloqueantes,
    advertencias,
    referencias_normativas,
  };
}
