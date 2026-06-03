/**
 * Tests for calculateSepticTank()
 *
 * Three main scenarios:
 * 1. Vivienda unifamiliar (4 dormitorios = 6 h-e)
 * 2. Restaurante (50 comensales)
 * 3. Normalización de h-e bajo mínimo
 *
 * Run with: npm test __tests__/calculations/septicTank.test.ts
 * (Requires vitest or jest)
 */

import { describe, it, expect } from 'vitest';
import { calculateSepticTank, SepticTankResult } from '@/src/lib/calculations/septicTank';

describe('calculateSepticTank', () => {
  // ─────────────────────────────────────────────────────────────────────
  // Test 1: Vivienda unifamiliar de 4 dormitorios (6 h-e)
  // ─────────────────────────────────────────────────────────────────────

  it('should calculate septic tank for single-family home (4 bedrooms = 6 h-e)', () => {
    const result = calculateSepticTank({
      habitantes_equivalentes: 6,
      tipo_uso: 'vivienda_unifamiliar',
      dotacion_litros_hab_dia: 200,
      tiempo_retencion_dias: 2,
      numero_compartimentos: 2,
    });

    expect(result).toBeDefined();
    // Q_AR = n × q × Cr — default Cr = 0.85 (Res. 0330/2017 / RAS 2000)
    expect(result.caudal_diario_litros).toBe(Math.round(6 * 200 * 0.85)); // 1020 L/día
    expect(result.volumen_util_litros).toBeGreaterThan(0);

    // Useful volume includes V_L + V_S + V_N — always > V_L alone
    expect(result.volumen_util_litros).toBeGreaterThanOrEqual(2400);

    // Dimensions should respect L:W = 3:1 proportion (Res. 0330/2017 Art. 140)
    expect(result.dimensiones.largo_m).toBeCloseTo(3 * result.dimensiones.ancho_m, 0.2);

    // Should have 2 compartments
    expect(result.num_compartimentos).toBe(2);

    // Retention time should be 2 days
    expect(result.tiempo_retencion_dias).toBe(2);

    // Validation should pass
    expect(result.validacion_cte.ok).toBe(true);
    expect(result.validacion_cte.avisos.length).toBe(0);
  });

  // ─────────────────────────────────────────────────────────────────────
  // Test 2: Restaurante (50 comensales)
  // ─────────────────────────────────────────────────────────────────────

  it('should calculate septic tank for restaurant (50 diners)', () => {
    const result = calculateSepticTank({
      habitantes_equivalentes: 50,
      tipo_uso: 'restaurante',
      dotacion_litros_hab_dia: 200, // restaurant uses default
      tiempo_retencion_dias: 2,
      numero_compartimentos: 3, // high load → 3 chambers
    });

    expect(result).toBeDefined();

    // Q_AR = 50 × 200 × Cr(0.85) = 8,500 L/día
    expect(result.caudal_diario_litros).toBe(Math.round(50 * 200 * 0.85));

    // Useful volume should be larger
    expect(result.volumen_util_litros).toBeGreaterThanOrEqual(10000);

    // Should have 3 compartments (high load)
    expect(result.num_compartimentos).toBe(3);

    // Validation should pass
    expect(result.validacion_cte.ok).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────
  // Test 3: Normalization of sub-minimum h-e
  // ─────────────────────────────────────────────────────────────────────

  it('should normalize h-e below CTE minimum (vivienda: 5 h-e min)', () => {
    // Input: 2 h-e (below 5 h-e minimum for single-family)
    const result = calculateSepticTank({
      habitantes_equivalentes: 2,
      tipo_uso: 'vivienda_unifamiliar',
      dotacion_litros_hab_dia: 200,
      tiempo_retencion_dias: 1, // CTE minimum
    });

    expect(result).toBeDefined();

    // Should have at least one aviso (warning)
    expect(result.validacion_cte.avisos.length).toBeGreaterThan(0);

    // Should mention h-e normalization
    const he_aviso = result.validacion_cte.avisos.find((a) =>
      a.toLowerCase().includes('mínimo') && a.toLowerCase().includes('ocupación')
    );
    expect(he_aviso).toBeDefined();

    // cumple_minimo_he should be false (input 2 < minimum 5)
    expect(result.validacion_cte.cumple_minimo_he).toBe(false);

    // Retention time IS the CTE minimum (1 day), so no aviso
    // cumple_retencion should be true (1 day = CTE minimum)
    expect(result.validacion_cte.cumple_retencion).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────
  // Test 4: Volume and dimension consistency
  // ─────────────────────────────────────────────────────────────────────

  it('should maintain geometric consistency (L = 3W proportion)', () => {
    const result = calculateSepticTank({
      habitantes_equivalentes: 10,
      tipo_uso: 'vivienda_unifamiliar',
    });

    const { largo_m, ancho_m, alto_util_m } = result.dimensiones;

    // L = 3W (Res. 0330/2017 Art. 140 — range 2:1–4:1, design uses 3:1)
    expect(largo_m).toBeCloseTo(3 * ancho_m, 0.5);

    // Verify volume from dimensions
    const volumen_calculado_m3 = largo_m * ancho_m * alto_util_m;
    const volumen_esperado_m3 = result.volumen_util_litros / 1000;

    // Should match (within 10% tolerance due to freeboard)
    expect(volumen_calculado_m3).toBeCloseTo(volumen_esperado_m3, 0.1);
  });

  // ─────────────────────────────────────────────────────────────────────
  // Test 5: Caudal (flow rate) consistency
  // ─────────────────────────────────────────────────────────────────────

  it('should calculate flow rates consistently (daily vs per-second)', () => {
    const result = calculateSepticTank({
      habitantes_equivalentes: 5,
      tipo_uso: 'vivienda_unifamiliar',
      dotacion_litros_hab_dia: 150,
    });

    // Q_AR = 5 × 150 × Cr(0.85) = 637.5 → rounded 638 L/día
    expect(result.caudal_diario_litros).toBe(Math.round(5 * 150 * 0.85));

    // Per-second flow = Q_AR / 86400
    const caudal_esperado_s = (5 * 150 * 0.85) / 86400;
    // Allow 2 decimals of tolerance (function uses toFixed(3))
    expect(result.caudal_segundos).toBeCloseTo(caudal_esperado_s, 2);
  });

  // ─────────────────────────────────────────────────────────────────────
  // Test 6: Freeboard (safety margin)
  // ─────────────────────────────────────────────────────────────────────

  it('should include freeboard (safety margin) in total height', () => {
    const result = calculateSepticTank({
      habitantes_equivalentes: 8,
      tipo_uso: 'vivienda_unifamiliar',
      profundidad_m: 1.2,
    });

    const { alto_util_m, alto_total_m } = result.dimensiones;

    // Total height should be > useful height
    expect(alto_total_m).toBeGreaterThan(alto_util_m);

    // Difference should be approximately freeboard (0.30 m)
    expect(alto_total_m - alto_util_m).toBeCloseTo(0.30, 0.05);
  });

  // ─────────────────────────────────────────────────────────────────────
  // Test 7: Metadata sanity check
  // ─────────────────────────────────────────────────────────────────────

  it('should populate metadata for transparency', () => {
    const result = calculateSepticTank({
      habitantes_equivalentes: 6,
      tipo_uso: 'vivienda_unifamiliar',
    });

    expect(result._metadata).toBeDefined();
    expect(result._metadata?.volumen_liquido_litros).toBeGreaterThan(0);
    expect(result._metadata?.volumen_lodos_litros).toBeGreaterThan(0);
    expect(result._metadata?.volumen_natas_litros).toBeGreaterThan(0);

    // Sum of components should roughly equal useful volume
    const suma = (result._metadata?.volumen_liquido_litros ?? 0) +
                 (result._metadata?.volumen_lodos_litros ?? 0) +
                 (result._metadata?.volumen_natas_litros ?? 0);

    expect(suma).toBeCloseTo(result.volumen_util_litros, 10); // within 10 L
  });
});
