import { describe, it, expect } from 'vitest';
import {
  classifySector,
  CLASIFICADOR_VERSION,
  type ClassifierInput,
} from '@/src/lib/classify/classifier';
import {
  classifierInputFromContratoRow,
  classifierInputFromProcesoRow,
} from '@/src/lib/classify/adapters';

const blank: ClassifierInput = {
  objeto: null,
  unspsc: null,
  entidadNit: null,
  entidadNombre: null,
  sector: null,
  tipoContrato: null,
};

describe('classifySector — señal A (objeto)', () => {
  it('a single domain keyword reaches alta (recall driver)', () => {
    const r = classifySector({ ...blank, objeto: 'Construcción de acueducto municipal' });
    expect(r.matchReason.A).toContain('acueducto');
    expect(r.sectorTier).toBe('alta');
    expect(r.sectorAgua).toBe(true);
  });

  it('does not fire on bare "agua" (avoids false positives)', () => {
    const r = classifySector({ ...blank, objeto: 'Suministro de agua embotellada' });
    expect(r.matchReason.A).toEqual([]);
    expect(r.sectorAgua).toBe(false);
  });

  it('stacks multiple keywords without exceeding the cap', () => {
    const r = classifySector({
      ...blank,
      objeto: 'Acueducto y alcantarillado, planta de tratamiento y red de distribucion',
    });
    expect(r.matchReason.A.length).toBeGreaterThanOrEqual(3);
    expect(r.sectorScore).toBeLessThanOrEqual(1);
    expect(r.sectorTier).toBe('alta');
  });
});

describe('classifySector — señal B (UNSPSC)', () => {
  it('strong family 83101x reinforces, stripping the V1. prefix', () => {
    const r = classifySector({ ...blank, objeto: 'acueducto', unspsc: 'V1.83101500' });
    expect(r.matchReason.B).toEqual({ codigo: '83101500', tipo: 'strong' });
  });

  it('context UNSPSC does not classify on its own', () => {
    const r = classifySector({ ...blank, unspsc: 'V1.72141119' });
    expect(r.matchReason.B?.tipo).toBe('context');
    expect(r.sectorTier).not.toBe('alta');
  });
});

describe('classifySector — señal C (entidad)', () => {
  it('matches a water utility by name pattern (low confidence)', () => {
    const r = classifySector({ ...blank, entidadNombre: 'Aguas de Manizales S.A. E.S.P.' });
    expect(r.matchReason.C?.via).toBe('nombre');
  });
});

describe('classifySector — caso difícil del §7', () => {
  it('catches temp-staff (generic UNSPSC) for a water utility whose objeto says acueducto', () => {
    const r = classifySector({
      objeto: 'Prestación de servicios de personal temporal para el acueducto',
      unspsc: 'V1.80111600', // personal temporal — genérico
      entidadNit: '890000001',
      entidadNombre: 'Empresa de Acueducto y Alcantarillado',
      sector: null,
      tipoContrato: 'Prestación de servicios',
    });
    expect(r.matchReason.A).toContain('acueducto'); // A lo rescata
    expect(r.matchReason.B).toBeNull(); // UNSPSC genérico NO suma (correcto)
    expect(r.matchReason.C?.via).toBe('nombre'); // entidad refuerza
    expect(r.sectorTier).toBe('alta');
    expect(r.sectorAgua).toBe(true);
  });
});

describe('classifySector — fuera de sector y metadata', () => {
  it('scores generic contracts as baja', () => {
    const r = classifySector({ ...blank, objeto: 'Mantenimiento de parque automotor' });
    expect(r.sectorTier).toBe('baja');
    expect(r.sectorAgua).toBe(false);
  });

  it('stamps the classifier version', () => {
    expect(classifySector(blank).clasificadorVersion).toBe(CLASIFICADOR_VERSION);
  });

  it('respects injected thresholds (D17 calibration is configurable)', () => {
    // single keyword (score 0.6) becomes media if alta threshold is raised above it
    const r = classifySector(
      { ...blank, objeto: 'acueducto' },
      {
        weights: {
          keywordBase: 0.6,
          keywordExtra: 0.1,
          keywordCap: 0.85,
          unspscStrong: 0.4,
          unspscContext: 0.1,
          entidadAllowlist: 0.5,
          entidadNombre: 0.2,
          contexto: 0.1,
        },
        thresholds: { alta: 0.8, media: 0.3 },
      },
    );
    expect(r.sectorTier).toBe('media');
    expect(r.sectorAgua).toBe(false);
  });
});

describe('adapters', () => {
  it('builds classifier input from a contrato row (incl. UNSPSC)', () => {
    const input = classifierInputFromContratoRow({
      objeto_del_contrato: 'Optimización del sistema de acueducto',
      codigo_de_categoria_principal: 'V1.83101500',
      nit_entidad: '899999063',
      nombre_entidad: 'Acueducto de Bogotá',
      sector: 'Servicios Públicos',
      tipo_de_contrato: 'Obra',
    });
    expect(input.unspsc).toBe('V1.83101500');
    expect(input.entidadNit).toBe('899999063');
    const r = classifySector(input);
    expect(r.sectorTier).toBe('alta');
  });

  it('builds classifier input from a proceso row', () => {
    const input = classifierInputFromProcesoRow({
      nombre_del_procedimiento: 'Construcción PTAR municipal',
      codigo_principal_de_categoria: 'V1.83101500',
      nit_entidad: '899999063',
      entidad: 'Gobernación',
    });
    expect(input.objeto).toBe('Construcción PTAR municipal');
    expect(input.sector).toBeNull();
    expect(classifySector(input).matchReason.A).toContain('ptar');
  });
});
