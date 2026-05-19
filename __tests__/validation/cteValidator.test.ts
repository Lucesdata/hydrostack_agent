/**
 * Tests for validateAgainstCte()
 *
 * Three main scenarios:
 * 1. Design fully complies
 * 2. Design has soft warnings (advertencias)
 * 3. Design has blocking issue (e.g., distance to well < 30 m)
 */

import { describe, it, expect } from 'vitest';
import { validateAgainstCte } from '@/lib/validation/cteValidator';
import { calculateSepticTank } from '@/lib/calculations/septicTank';
import { calculateDrainageField } from '@/lib/calculations/drainageField';

describe('validateAgainstCte', () => {
  it('should validate a fully compliant design', () => {
    const tank = calculateSepticTank({
      habitantes_equivalentes: 6,
      tipo_uso: 'vivienda_unifamiliar',
      dotacion_litros_hab_dia: 200,
      tiempo_retencion_dias: 2,
    });

    const field = calculateDrainageField({
      caudal_diario_l: tank.caudal_diario_litros,
      permeabilidad_suelo_m_dia: 0.864, // medium soil
    });

    const result = validateAgainstCte({
      septic_tank: tank,
      drainage_field: field,
      contexto: {
        distancia_vivienda_m: 10,
        distancia_pozo_m: 50,
        zona_protegida_bool: false,
      },
    });

    expect(result.cumple).toBe(true);
    expect(result.bloqueantes.length).toBe(0);
    expect(result.referencias_normativas.length).toBeGreaterThanOrEqual(2);
  });

  it('should generate advertencias for borderline compliance', () => {
    // Design at the minimum h-e (2 below the required 5)
    const tank = calculateSepticTank({
      habitantes_equivalentes: 2,
      tipo_uso: 'vivienda_unifamiliar',
    });

    const field = calculateDrainageField({
      caudal_diario_l: tank.caudal_diario_litros,
      permeabilidad_suelo_m_dia: 0.864,
    });

    const result = validateAgainstCte({
      septic_tank: tank,
      drainage_field: field,
    });

    // The tank itself normalizes h-e and produces avisos
    expect(result.advertencias.length).toBeGreaterThan(0);
  });

  it('should produce blocking issue when distance to well < 30 m', () => {
    const tank = calculateSepticTank({
      habitantes_equivalentes: 6,
      tipo_uso: 'vivienda_unifamiliar',
    });

    const field = calculateDrainageField({
      caudal_diario_l: tank.caudal_diario_litros,
      permeabilidad_suelo_m_dia: 0.864,
    });

    const result = validateAgainstCte({
      septic_tank: tank,
      drainage_field: field,
      contexto: {
        distancia_pozo_m: 15, // BLOCKING: < 30 m
      },
    });

    expect(result.cumple).toBe(false);
    expect(result.bloqueantes.length).toBeGreaterThan(0);

    // Verify the issue has a code and article
    const pozo_issue = result.bloqueantes.find((b) =>
      b.descripcion.toLowerCase().includes('pozo')
    );
    expect(pozo_issue).toBeDefined();
    expect(pozo_issue?.codigo).toBeTruthy();
    expect(pozo_issue?.articulo).toContain('CTE DB-HS 5');
  });

  it('should produce blocking issue when distance to dwelling < 5 m', () => {
    const tank = calculateSepticTank({
      habitantes_equivalentes: 5,
      tipo_uso: 'vivienda_unifamiliar',
    });

    const result = validateAgainstCte({
      septic_tank: tank,
      contexto: {
        distancia_vivienda_m: 2, // BLOCKING: < 5 m
      },
    });

    expect(result.cumple).toBe(false);
    expect(result.bloqueantes.some((b) => b.descripcion.includes('vivienda'))).toBe(true);
  });

  it('should produce blocking issue for protected zone', () => {
    const tank = calculateSepticTank({
      habitantes_equivalentes: 5,
      tipo_uso: 'vivienda_unifamiliar',
    });

    const result = validateAgainstCte({
      septic_tank: tank,
      contexto: {
        zona_protegida_bool: true,
      },
    });

    expect(result.cumple).toBe(false);
    const protected_issue = result.bloqueantes.find((b) =>
      b.articulo.includes('RD 1620')
    );
    expect(protected_issue).toBeDefined();
  });

  it('should return cumple=true when no inputs provided', () => {
    const result = validateAgainstCte({});
    expect(result.cumple).toBe(true);
    expect(result.bloqueantes.length).toBe(0);
  });

  it('should propagate drainage field blocking issues', () => {
    const tank = calculateSepticTank({
      habitantes_equivalentes: 5,
      tipo_uso: 'vivienda_unifamiliar',
    });

    // Drainage with bad soil (will produce bloqueante)
    const field = calculateDrainageField({
      caudal_diario_l: tank.caudal_diario_litros,
      permeabilidad_suelo_m_dia: 0.05, // too low
    });

    const result = validateAgainstCte({
      septic_tank: tank,
      drainage_field: field,
    });

    expect(result.cumple).toBe(false);
    expect(result.bloqueantes.length).toBeGreaterThan(0);
  });
});
