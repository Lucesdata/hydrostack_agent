/**
 * Design validator — Res. 0330/2017 (Colombia) / CTE DB-HS 5 (Spain).
 *
 * Read-only: validates already-computed results. Does NOT recalculate.
 * Phase 1: integrates geospatial constraints via validateGeospatialConstraints().
 */

import type { SepticTankResult } from '@/src/lib/calculations/septicTank';
import type { DrainageFieldResult } from '@/src/lib/calculations/drainageField';
import { COLOMBIA_REFERENCIAS_NORMATIVAS } from '@/src/lib/config/regulatory_framework';
import {
  validateGeospatialConstraints,
  type GeospatialInput,
  type GeospatialResult,
} from '@/src/lib/validation/geospatialValidator';

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export interface ValidationContext {
  /** Distance from system to dwelling in meters. Min: 5 m */
  distancia_vivienda_m?: number;
  /** Distance from infiltration field to supply well in meters. Min: 30 m */
  distancia_pozo_m?: number;
  /** Site is in a protected zone (aquifer recharge, national park, etc.) */
  zona_protegida_bool?: boolean;
}

export interface CteValidatorInput {
  septic_tank?: SepticTankResult;
  drainage_field?: DrainageFieldResult;
  contexto?: ValidationContext;
  /** Geospatial site constraints (Phase 1) */
  geoespacial?: GeospatialInput;
  /** 'ras' for Colombia, 'cte' for Spain. Selects normative thresholds and references. */
  norm_code?: string;
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
  /** Geospatial checks block (present when geoespacial input was provided) */
  verificaciones_geoespaciales?: GeospatialResult;
}

// ─────────────────────────────────────────────────────────────────────────
// Thresholds
// ─────────────────────────────────────────────────────────────────────────

const LIMITES = {
  // CTE §3.3.1: 400 L/h-e. Res. 0330/2017 Art. 138: 1,500 L absolute.
  volumen_minimo_por_he_cte:         400,   // L per h-e
  volumen_minimo_absoluto_colombia:  1500,  // L
  trh_minimo_cte_dias:               1.0,
  trh_minimo_colombia_dias:          1.5,   // Res. 0330/2017 Art. 138
  distancia_vivienda_minima_m:       5,
  distancia_pozo_minima_m:           30,
  separacion_zanjas_minima_m:        1.5,   // Res. 0330/2017 Art. 143 (CTE uses 2.0 m)
};

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function septicTankChecks(
  tank: SepticTankResult,
  norm: string,
  bloqueantes: ValidationIssue[],
  advertencias: ValidationIssue[]
): void {
  const isCol = norm === 'ras';

  // Minimum volume
  const he_approx = Math.max(1, Math.round(tank.caudal_diario_litros / (200 * (tank.coeficiente_retorno ?? 0.85))));
  const v_min_cte = he_approx * LIMITES.volumen_minimo_por_he_cte;

  if (!isCol && tank.volumen_util_litros < v_min_cte) {
    bloqueantes.push({
      codigo: 'CTE-HS5-001',
      articulo: 'CTE DB-HS 5 §3.3.1',
      descripcion:
        `Volumen útil (${tank.volumen_util_litros} L) inferior al mínimo ` +
        `(${v_min_cte} L = ${he_approx} h-e × 200 L × 2 días).`,
    });
  }

  if (isCol && tank.volumen_util_litros < LIMITES.volumen_minimo_absoluto_colombia) {
    bloqueantes.push({
      codigo: 'RES-0330-138-001',
      articulo: 'Res. 0330/2017 Art. 138',
      descripcion:
        `Volumen útil (${tank.volumen_util_litros} L) inferior al mínimo absoluto ` +
        `(${LIMITES.volumen_minimo_absoluto_colombia} L) de la Res. 0330/2017.`,
    });
  }

  // Minimum TRH
  const trh_min = isCol ? LIMITES.trh_minimo_colombia_dias : LIMITES.trh_minimo_cte_dias;
  if (tank.tiempo_retencion_dias < trh_min) {
    bloqueantes.push({
      codigo: isCol ? 'RES-0330-138-002' : 'CTE-HS5-002',
      articulo: isCol ? 'Res. 0330/2017 Art. 138' : 'CTE DB-HS 5 §3.3.2',
      descripcion:
        `TRH (${tank.tiempo_retencion_dias} días) inferior al mínimo ` +
        `(${trh_min} días${isCol ? ' — Res. 0330/2017 Art. 138' : ''}).`,
    });
  }

  // Verify TRH under Q_max_horario (Phase 1)
  if (tank.trh_verificado_q_max_h_dias !== undefined && tank.trh_verificado_q_max_h_dias < 0.5) {
    advertencias.push({
      codigo: isCol ? 'RES-0330-138-003' : 'CTE-HS5-003',
      articulo: isCol ? 'Res. 0330/2017 Art. 138' : 'CTE DB-HS 5 §3.3.2',
      descripcion:
        `TRH en caudal máximo horario (${tank.trh_verificado_q_max_h_dias} días) muy reducido. ` +
        `Considerar aumentar el volumen del tanque para mejorar la retención en picos de flujo.`,
    });
  }

  // Propagate warnings from calculation engine
  const norm_art = isCol ? 'Res. 0330/2017 Art. 138–140' : 'CTE DB-HS 5 §3.3';
  for (const aviso of tank.validacion_cte.avisos) {
    advertencias.push({
      codigo: isCol ? 'RES-0330-AVISO' : 'CTE-HS5-AVISO',
      articulo: norm_art,
      descripcion: aviso,
    });
  }
}

function drainageFieldChecks(
  field: DrainageFieldResult,
  norm: string,
  bloqueantes: ValidationIssue[],
  advertencias: ValidationIssue[]
): void {
  const isCol = norm === 'ras';
  const art_prefix = isCol ? 'Res. 0330/2017 Art. 143' : 'CTE DB-HS 5 Anejo G';

  for (const b of field.validacion.bloqueantes) {
    let codigo = isCol ? 'RES-0330-143-001' : 'CTE-HS5-G-000';
    let articulo = art_prefix;
    if (b.includes('freático')) {
      codigo = isCol ? 'RES-0330-144-001' : 'CTE-HS5-G-004';
      articulo = isCol ? 'Res. 0330/2017 Art. 144' : 'CTE DB-HS 5 Anejo G.3';
    } else if (b.includes('Permeabilidad')) {
      codigo = isCol ? 'RES-0330-143-002' : 'CTE-HS5-G-005';
    }
    bloqueantes.push({ codigo, articulo, descripcion: b });
  }

  for (const a of field.validacion.avisos) {
    advertencias.push({
      codigo: isCol ? 'RES-0330-G-AVISO' : 'CTE-HS5-G-AVISO',
      articulo: art_prefix,
      descripcion: a,
    });
  }

  // Trench separation
  const sep_min = isCol ? LIMITES.separacion_zanjas_minima_m : 2.0;
  if (
    field.dimensiones.separacion_zanjas_m !== null &&
    field.dimensiones.separacion_zanjas_m < sep_min
  ) {
    bloqueantes.push({
      codigo: isCol ? 'RES-0330-143-003' : 'CTE-HS5-G-006',
      articulo: isCol ? 'Res. 0330/2017 Art. 143' : 'CTE DB-HS 5 Anejo G.4',
      descripcion:
        `Separación entre zanjas (${field.dimensiones.separacion_zanjas_m} m) inferior al mínimo ` +
        `(${sep_min} m).`,
    });
  }
}

function contextChecks(
  contexto: ValidationContext,
  norm: string,
  bloqueantes: ValidationIssue[],
  advertencias: ValidationIssue[]
): void {
  const isCol = norm === 'ras';

  if (
    contexto.distancia_vivienda_m !== undefined &&
    contexto.distancia_vivienda_m < LIMITES.distancia_vivienda_minima_m
  ) {
    bloqueantes.push({
      codigo: isCol ? 'RES-0330-143-004' : 'CTE-HS5-G-007',
      articulo: isCol ? 'Res. 0330/2017 Art. 143' : 'CTE DB-HS 5 Anejo G.2',
      descripcion:
        `Distancia a vivienda (${contexto.distancia_vivienda_m} m) inferior al mínimo ` +
        `(${LIMITES.distancia_vivienda_minima_m} m).`,
    });
  }

  if (
    contexto.distancia_pozo_m !== undefined &&
    contexto.distancia_pozo_m < LIMITES.distancia_pozo_minima_m
  ) {
    bloqueantes.push({
      codigo: isCol ? 'RES-0330-143-005' : 'CTE-HS5-G-003',
      articulo: isCol ? 'Res. 0330/2017 Art. 143' : 'CTE DB-HS 5 Anejo G.2',
      descripcion:
        `Distancia a pozo de agua (${contexto.distancia_pozo_m} m) inferior al mínimo ` +
        `(${LIMITES.distancia_pozo_minima_m} m). Riesgo de contaminación de captación.`,
    });
  }

  if (contexto.zona_protegida_bool === true) {
    bloqueantes.push({
      codigo: isCol ? 'DEC-1076-ZONA-001' : 'RD-1620-001',
      articulo: isCol ? 'Dec. 1076/2015 — Zonas de protección hídrica' : 'RD 1620/2007 Art. 9',
      descripcion:
        isCol
          ? 'Emplazamiento en zona de protección ambiental. Requiere autorización de la CAR o SDA y ' +
            'posiblemente tratamiento terciario. Verificar con Decreto 1076/2015 y POT local.'
          : 'Emplazamiento en zona protegida. Requiere autorización de la Confederación Hidrográfica.',
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Main validation function
// ─────────────────────────────────────────────────────────────────────────

export function validateAgainstCte(input: CteValidatorInput): CteValidationResult {
  const bloqueantes: ValidationIssue[] = [];
  const advertencias: ValidationIssue[] = [];
  const norm = input.norm_code ?? 'ras';

  if (input.septic_tank) {
    septicTankChecks(input.septic_tank, norm, bloqueantes, advertencias);
  }

  if (input.drainage_field) {
    drainageFieldChecks(input.drainage_field, norm, bloqueantes, advertencias);
  }

  if (input.contexto) {
    contextChecks(input.contexto, norm, bloqueantes, advertencias);
  }

  // Geospatial constraints (Phase 1)
  let verificaciones_geoespaciales: GeospatialResult | undefined;
  if (input.geoespacial) {
    verificaciones_geoespaciales = validateGeospatialConstraints(input.geoespacial);

    // Elevate geospatial blocking issues into main bloqueantes list
    for (const check of verificaciones_geoespaciales.checks) {
      if (check.estado === 'BLOQUEANTE') {
        bloqueantes.push({
          codigo: 'GEO-BLOQUEANTE',
          articulo: check.norma,
          descripcion: check.mensaje,
        });
      } else if (check.estado === 'ALERTA') {
        advertencias.push({
          codigo: 'GEO-ALERTA',
          articulo: check.norma,
          descripcion: check.mensaje + (check.sugerencia ? ` — ${check.sugerencia}` : ''),
        });
      }
    }
  }

  const referencias_normativas = norm === 'ras'
    ? COLOMBIA_REFERENCIAS_NORMATIVAS
    : [
        'CTE DB-HS 5 — Documento Básico de Salubridad, Sección 5: Evacuación de aguas',
        'CTE DB-HS 5 Anejo G — Sistemas individuales de tratamiento de aguas residuales',
        'RD 1620/2007 — Régimen jurídico de la reutilización de aguas depuradas',
      ];

  return {
    cumple: bloqueantes.length === 0,
    bloqueantes,
    advertencias,
    referencias_normativas,
    ...(verificaciones_geoespaciales && { verificaciones_geoespaciales }),
  };
}
