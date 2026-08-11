import { describe, it, expect } from 'vitest';
import type { OferenteProfile, ExperienciaContrato } from '@/src/lib/oferente/types';

describe('OferenteProfile — campos RUP ampliados (Nivel 2)', () => {
  it('acepta un perfil sin experiencia ni indicadores ampliados (compatibilidad)', () => {
    const minimo: OferenteProfile = {
      id: 'x',
      tipoPersona: 'juridica',
      sectoresUnspsc: ['83101'],
      capacidadFinanciera: {
        capitalTrabajoCop: 0,
        indiceLiquidez: 0,
        indiceEndeudamiento: 0,
        razonCoberturaIntereses: 0,
        fuente: 'manual',
        vigenciaHasta: null,
      },
      kCapacidadResidualCop: null,
      cobertura: { departamentos: [], municipios: [] },
      cuantiaObjetivo: { minCop: 0, maxCop: 0 },
    };
    expect(minimo.experiencia).toBeUndefined();
  });

  it('acepta un perfil con experiencia e indicadores ampliados', () => {
    const contrato: ExperienciaContrato = {
      objeto: 'Optimización PTAP municipal',
      valorSmmlv: 1200,
      unspscCodigos: ['83101500'],
      anioTerminacion: 2024,
    };
    const completo: OferenteProfile = {
      id: 'x',
      tipoPersona: 'juridica',
      sectoresUnspsc: ['83101'],
      capacidadFinanciera: {
        capitalTrabajoCop: 0,
        indiceLiquidez: 1.5,
        indiceEndeudamiento: 0.4,
        razonCoberturaIntereses: 3,
        fuente: 'manual',
        vigenciaHasta: null,
        rentabilidadPatrimonio: 0.12,
        rentabilidadActivo: 0.08,
        patrimonioSmmlv: 5000,
        capitalTrabajoSmmlv: 3000,
      },
      kCapacidadResidualCop: null,
      cobertura: { departamentos: [], municipios: [] },
      cuantiaObjetivo: { minCop: 0, maxCop: 0 },
      experiencia: [contrato],
    };
    expect(completo.experiencia?.[0].valorSmmlv).toBe(1200);
    expect(completo.capacidadFinanciera.patrimonioSmmlv).toBe(5000);
  });
});
