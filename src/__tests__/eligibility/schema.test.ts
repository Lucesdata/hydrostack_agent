import { describe, it, expect } from 'vitest';
import { parseRequisitosEstructurados } from '@/src/lib/eligibility/schema';

describe('parseRequisitosEstructurados', () => {
  const valido = {
    experiencia: {
      valor_min_smmlv: 3000,
      unspsc_exigidos: ['83101500'],
      max_contratos_aportables: 3,
      verificar_manual: false,
      cita_textual: 'experiencia específica mínima de 3.000 SMMLV',
    },
    indicadores_financieros: [
      {
        indicador: 'indice_liquidez',
        operador: 'gte',
        valor: 1.5,
        verificar_manual: false,
        cita_textual: 'índice de liquidez mayor o igual a 1.5',
      },
    ],
  };

  it('parsea una estructura válida', () => {
    const r = parseRequisitosEstructurados(valido);
    expect(r.experiencia.valor_min_smmlv).toBe(3000);
    expect(r.indicadores_financieros).toHaveLength(1);
  });

  it('lanza si experiencia falta', () => {
    expect(() => parseRequisitosEstructurados({ indicadores_financieros: [] })).toThrow();
  });

  it('lanza si un indicador tiene operador inválido', () => {
    const invalido = {
      ...valido,
      indicadores_financieros: [{ ...valido.indicadores_financieros[0], operador: 'igual' }],
    };
    expect(() => parseRequisitosEstructurados(invalido)).toThrow();
  });

  it('acepta verificar_manual=true sin valores numéricos', () => {
    const r = parseRequisitosEstructurados({
      experiencia: {
        valor_min_smmlv: null,
        unspsc_exigidos: [],
        max_contratos_aportables: null,
        verificar_manual: true,
        cita_textual: 'el pliego remite a un anexo no incluido',
      },
      indicadores_financieros: [],
    });
    expect(r.experiencia.verificar_manual).toBe(true);
    expect(r.experiencia.valor_min_smmlv).toBeNull();
  });

  it('lanza si un indicador tiene valor=NaN', () => {
    const invalido = {
      ...valido,
      indicadores_financieros: [{ ...valido.indicadores_financieros[0], valor: NaN }],
    };
    expect(() => parseRequisitosEstructurados(invalido)).toThrow();
  });

  it('lanza si unspsc_exigidos no es un array', () => {
    const invalido = {
      ...valido,
      experiencia: {
        ...valido.experiencia,
        unspsc_exigidos: 'no es array',
      },
    };
    expect(() => parseRequisitosEstructurados(invalido)).toThrow();
  });

  it('lanza si un indicador tiene indicador con código inválido', () => {
    const invalido = {
      ...valido,
      indicadores_financieros: [{ ...valido.indicadores_financieros[0], indicador: 'codigo_inexistente' }],
    };
    expect(() => parseRequisitosEstructurados(invalido)).toThrow();
  });
});
