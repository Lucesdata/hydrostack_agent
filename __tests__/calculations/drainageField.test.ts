/**
 * Tests for calculateDrainageField()
 *
 * Three main scenarios:
 * 1. K in mid range → zanjas filtrantes
 * 2. K high → lecho filtrante
 * 3. K too low → rejection with bloqueante
 */

import { describe, it, expect } from 'vitest';
import { calculateDrainageField } from '@/lib/calculations/drainageField';

describe('calculateDrainageField', () => {
  // K = 1e-5 m/s = ~0.864 m/day → medium (zanjas)
  // K = 5e-4 m/s = ~43.2 m/day → high (lecho)
  // K = 1e-7 m/s = ~0.00864 m/day → too low (rejected)

  it('should size filter trenches for medium permeability soil', () => {
    const result = calculateDrainageField({
      caudal_diario_l: 1200, // 6 h-e × 200 L/d
      permeabilidad_suelo_m_dia: 0.864, // ≈ 1e-5 m/s
    });

    expect(result).toBeDefined();
    expect(result.tipo_sistema).toBe('zanjas_filtrantes');
    expect(result.dimensiones.superficie_infiltracion_m2).toBeGreaterThan(0);
    expect(result.dimensiones.longitud_total_zanjas_m).not.toBeNull();
    expect(result.dimensiones.num_zanjas).toBeGreaterThanOrEqual(1);
    expect(result.dimensiones.separacion_zanjas_m).toBe(2.0);
    expect(result.dimensiones.ancho_zanja_m).toBe(0.6);
    expect(result.validacion.ok).toBe(true);
    expect(result.validacion.bloqueantes.length).toBe(0);
  });

  it('should size filter bed for high permeability soil', () => {
    const result = calculateDrainageField({
      caudal_diario_l: 1200,
      permeabilidad_suelo_m_dia: 50, // ≈ 5.8e-4 m/s → > 1e-4
    });

    expect(result).toBeDefined();
    expect(result.tipo_sistema).toBe('lecho_filtrante');
    expect(result.dimensiones.superficie_infiltracion_m2).toBeGreaterThan(0);
    expect(result.dimensiones.longitud_total_zanjas_m).toBeNull();
    expect(result.dimensiones.num_zanjas).toBeNull();
    expect(result.dimensiones.profundidad_m).toBe(1.0);
    expect(result.validacion.ok).toBe(true);
  });

  it('should reject soil with insufficient permeability', () => {
    const result = calculateDrainageField({
      caudal_diario_l: 1200,
      permeabilidad_suelo_m_dia: 0.05, // ≈ 5.8e-7 m/s → < 1e-6
    });

    expect(result).toBeDefined();
    expect(result.validacion.ok).toBe(false);
    expect(result.validacion.bloqueantes.length).toBeGreaterThan(0);

    // Should mention permeability
    const has_perm_bloqueante = result.validacion.bloqueantes.some((b) =>
      b.toLowerCase().includes('permeabilidad')
    );
    expect(has_perm_bloqueante).toBe(true);
  });

  it('should flag low water table as blocking', () => {
    const result = calculateDrainageField({
      caudal_diario_l: 1200,
      permeabilidad_suelo_m_dia: 0.864,
      nivel_freatico_m: 0.5, // below CTE minimum of 1.0 m
    });

    expect(result.validacion.ok).toBe(false);
    expect(result.validacion.bloqueantes.some((b) => b.includes('freático'))).toBe(true);
  });

  it('should flag distance to water well as blocking', () => {
    const result = calculateDrainageField({
      caudal_diario_l: 1200,
      permeabilidad_suelo_m_dia: 0.864,
      distancia_pozo_agua_m: 15, // below CTE minimum of 30 m
    });

    expect(result.validacion.ok).toBe(false);
    expect(result.validacion.bloqueantes.some((b) => b.includes('pozo'))).toBe(true);
  });

  it('should respect user-specified tipo_sistema override', () => {
    const result = calculateDrainageField({
      caudal_diario_l: 1200,
      permeabilidad_suelo_m_dia: 0.864, // would auto-select zanjas
      tipo_sistema: 'lecho_filtrante', // user override
    });

    expect(result.tipo_sistema).toBe('lecho_filtrante');
  });

  it('should compute number of trenches when total length exceeds 30m', () => {
    const result = calculateDrainageField({
      caudal_diario_l: 10000, // restaurant or large facility
      permeabilidad_suelo_m_dia: 0.864,
    });

    expect(result.dimensiones.num_zanjas).toBeGreaterThan(1);
    expect(result.dimensiones.longitud_total_zanjas_m).toBeGreaterThan(30);
  });
});
