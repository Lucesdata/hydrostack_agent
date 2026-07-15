import { describe, it, expect } from 'vitest';
import { buildOferenteProfile, OFERENTE_LOCAL_ID, SECTOR_OPTIONS } from '@/src/lib/oferente/wizard';

const answers = {
  tipoPersona: 'juridica' as const,
  sectoresUnspsc: ['83101'],
  departamentos: ['76'],
  municipios: ['76001'],
  minCop: 100_000_000,
  maxCop: 1_000_000_000,
};

describe('buildOferenteProfile (wizard → OferenteProfile)', () => {
  it('mapea los campos que las compuertas Nivel 0 leen: sectoresUnspsc, cobertura, cuantiaObjetivo', () => {
    const p = buildOferenteProfile(answers);
    expect(p.sectoresUnspsc).toEqual(['83101']);
    expect(p.cobertura).toEqual({ departamentos: ['76'], municipios: ['76001'] });
    expect(p.cuantiaObjetivo).toEqual({ minCop: 100_000_000, maxCop: 1_000_000_000 });
  });

  it('conserva tipoPersona tal como lo respondió el usuario', () => {
    expect(buildOferenteProfile(answers).tipoPersona).toBe('juridica');
    expect(buildOferenteProfile({ ...answers, tipoPersona: 'natural' }).tipoPersona).toBe('natural');
  });

  it('usa el id local fijo (un solo perfil por navegador, sin cuenta)', () => {
    expect(buildOferenteProfile(answers).id).toBe(OFERENTE_LOCAL_ID);
  });

  it('deja capacidadFinanciera y kCapacidadResidualCop en placeholder (Nivel 2, no leídos en N0)', () => {
    const p = buildOferenteProfile(answers);
    expect(p.kCapacidadResidualCop).toBeNull();
    expect(p.capacidadFinanciera.fuente).toBe('manual');
    expect(p.capacidadFinanciera.vigenciaHasta).toBeNull();
  });

  it('municipios por defecto es arreglo vacío si no se provee', () => {
    const { municipios, ...rest } = answers;
    const p = buildOferenteProfile(rest as typeof answers);
    expect(p.cobertura.municipios).toEqual([]);
  });
});

describe('SECTOR_OPTIONS', () => {
  it('expone al menos un sector con código y etiqueta', () => {
    expect(SECTOR_OPTIONS.length).toBeGreaterThan(0);
    for (const opt of SECTOR_OPTIONS) {
      expect(typeof opt.codigo).toBe('string');
      expect(typeof opt.label).toBe('string');
    }
  });
});
