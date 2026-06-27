import { describe, it, expect } from 'vitest';
import {
  sectorialGate,
  cuantiaGate,
  plazoGate,
  ubicacionGate,
  habilitacionGate,
  aggregateVerdict,
  buildVerdict,
  toVerdictInput,
  DEFAULT_CUANTIA_BANDS,
  type VerdictProcessInput,
} from '@/src/lib/secop/verdict';
import type { OferenteProfile } from '@/src/lib/oferente/types';
import type { SecopProceso } from '@/src/lib/secop/types';

const NOW = new Date('2026-06-27T00:00:00Z');
const DAY = 86_400_000;
const iso = (offsetDays: number) => new Date(NOW.getTime() + offsetDays * DAY).toISOString();

const profile: OferenteProfile = {
  id: 'oferente-piloto',
  tipoPersona: 'juridica',
  sectoresUnspsc: ['83101'], // familia acueducto/alcantarillado
  capacidadFinanciera: {
    capitalTrabajoCop: 500_000_000,
    indiceLiquidez: 2,
    indiceEndeudamiento: 0.4,
    razonCoberturaIntereses: 3,
    fuente: 'manual',
    vigenciaHasta: '2026-12-31',
  },
  kCapacidadResidualCop: 1_000_000_000,
  cobertura: { departamentos: ['76'], municipios: ['76001'] },
  cuantiaObjetivo: { minCop: 100_000_000, maxCop: 1_000_000_000 },
};

function proc(over: Partial<VerdictProcessInput> = {}): VerdictProcessInput {
  return {
    id: 'CO1.REQ.1',
    referencia: 'REF-1',
    nombre: 'Optimización del sistema de acueducto',
    descripcion: 'Obras de acueducto',
    entidad: 'Acuavalle',
    departamento: 'Valle del Cauca',
    ciudad: 'Cali',
    estado: 'Publicado',
    fase: '',
    modalidad: 'Licitación pública',
    tipoContrato: 'Obra',
    fechaPublicacion: '2026-06-01',
    precioBase: 500_000_000,
    adjudicado: false,
    valorAdjudicacion: null,
    adjudicatario: null,
    unspsc: 'V1.83101500',
    url: null,
    estadoApertura: 'Abierto',
    documentAccess: 'UNKNOWN',
    accessMessage: '',
    fechaCierre: null,
    sectorAgua: true,
    ...over,
  };
}

describe('sectorialGate (L0 — UNSPSC ∩ perfil)', () => {
  it('código del proceso dentro de la familia del perfil → PASS', () => {
    const r = sectorialGate(profile, proc({ unspsc: 'V1.83101500' }));
    expect(r.status).toBe('PASS');
    expect(r.resolvedBy).toBe('metadata');
    expect(r.requiredLevel).toBe(0);
  });

  it('código del proceso fuera de los sectores del perfil → FAIL', () => {
    expect(sectorialGate(profile, proc({ unspsc: 'V1.80111600' })).status).toBe('FAIL');
  });

  it('D2: sin código pero sectorAgua=true → WARN (intersección por confirmar)', () => {
    const r = sectorialGate(profile, proc({ unspsc: null, sectorAgua: true }));
    expect(r.status).toBe('WARN');
  });

  it('D2: UNSPECIFIED y sin clasificación → UNKNOWN', () => {
    const r = sectorialGate(profile, proc({ unspsc: 'UNSPECIFIED', sectorAgua: null }));
    expect(r.status).toBe('UNKNOWN');
    expect(r.requiredLevel).toBe(0);
  });
});

describe('cuantiaGate (L0 — 3 bandas, D5)', () => {
  it('valor dentro del rango objetivo → PASS', () => {
    expect(cuantiaGate(profile, proc({ precioBase: 500_000_000 }), DEFAULT_CUANTIA_BANDS).status).toBe('PASS');
  });

  it('valor en el margen ±20% del borde → WARN', () => {
    // maxCop = 1.000M; +20% = 1.200M; 1.150M cae en la banda amarilla
    expect(cuantiaGate(profile, proc({ precioBase: 1_150_000_000 }), DEFAULT_CUANTIA_BANDS).status).toBe('WARN');
  });

  it('valor muy fuera del rango → FAIL', () => {
    expect(cuantiaGate(profile, proc({ precioBase: 5_000_000_000 }), DEFAULT_CUANTIA_BANDS).status).toBe('FAIL');
  });

  it('proceso sin valor en metadata → UNKNOWN', () => {
    expect(cuantiaGate(profile, proc({ precioBase: null, valorAdjudicacion: null }), DEFAULT_CUANTIA_BANDS).status).toBe('UNKNOWN');
  });
});

describe('plazoGate (L0 parcial, D1)', () => {
  it('estadoApertura Cerrado → FAIL (metadata)', () => {
    const r = plazoGate(proc({ estadoApertura: 'Cerrado', fechaCierre: null }), NOW);
    expect(r.status).toBe('FAIL');
    expect(r.resolvedBy).toBe('metadata');
    expect(r.requiredLevel).toBe(0);
  });

  it('estadoApertura Abierto sin fecha → WARN (fecha exacta en el cronograma)', () => {
    const r = plazoGate(proc({ estadoApertura: 'Abierto', fechaCierre: null }), NOW);
    expect(r.status).toBe('WARN');
    expect(r.requiredLevel).toBe(0);
  });

  it('sin apertura ni fecha → UNKNOWN', () => {
    expect(plazoGate(proc({ estadoApertura: null, fechaCierre: null }), NOW).status).toBe('UNKNOWN');
  });

  it('fechaCierre futura amplia → PASS (resuelto por documento = L2)', () => {
    const r = plazoGate(proc({ fechaCierre: iso(10) }), NOW);
    expect(r.status).toBe('PASS');
    expect(r.resolvedBy).toBe('document');
    expect(r.requiredLevel).toBe(2);
  });

  it('fechaCierre próxima → WARN', () => {
    expect(plazoGate(proc({ fechaCierre: iso(2) }), NOW).status).toBe('WARN');
  });

  it('fechaCierre vencida → FAIL', () => {
    expect(plazoGate(proc({ fechaCierre: iso(-1) }), NOW).status).toBe('FAIL');
  });

  it('#1 fechaCierre inválida → UNKNOWN (no PASS con NaN)', () => {
    expect(plazoGate(proc({ fechaCierre: 'no-es-fecha' }), NOW).status).toBe('UNKNOWN');
  });
});

describe('ubicacionGate (L0 — DIVIPOLA depto)', () => {
  it('departamento del proceso dentro de la cobertura → PASS', () => {
    expect(ubicacionGate(profile, proc({ departamento: 'Valle del Cauca' })).status).toBe('PASS');
  });

  it('departamento fuera de la cobertura → FAIL', () => {
    expect(ubicacionGate(profile, proc({ departamento: 'Antioquia' })).status).toBe('FAIL');
  });

  it('departamento no reconocido → UNKNOWN', () => {
    expect(ubicacionGate(profile, proc({ departamento: 'Tierra del Nunca' })).status).toBe('UNKNOWN');
  });

  it('#2 cobertura solo por municipio (departamentos:[]) → PASS si el municipio coincide', () => {
    const soloMuni = { ...profile, cobertura: { departamentos: [], municipios: ['76001'] } };
    expect(ubicacionGate(soloMuni, proc({ departamento: 'Valle del Cauca', ciudad: 'Cali' })).status).toBe('PASS');
  });

  it('#2 cobertura solo por municipio → FAIL si el municipio no coincide', () => {
    const soloMuni = { ...profile, cobertura: { departamentos: [], municipios: ['76001'] } };
    expect(ubicacionGate(soloMuni, proc({ departamento: 'Valle del Cauca', ciudad: 'Palmira' })).status).toBe('FAIL');
  });
});

describe('habilitacionGate (L2 — siempre requiere pliego en N0)', () => {
  it('siempre UNKNOWN con requiredLevel 2', () => {
    const r = habilitacionGate(profile, proc());
    expect(r.status).toBe('UNKNOWN');
    expect(r.requiredLevel).toBe(2);
    expect(r.resolvedBy).toBe('document');
  });
});

describe('aggregateVerdict (D6 — worst-of, UNKNOWN aparte)', () => {
  const g = (status: 'PASS' | 'WARN' | 'FAIL' | 'UNKNOWN') =>
    ({ status, reason: '', resolvedBy: 'metadata' as const, requiredLevel: 0 as const });

  it('todas PASS → PASS', () => {
    expect(aggregateVerdict({ sectorial: g('PASS'), cuantia: g('PASS'), plazo: g('PASS'), ubicacion: g('PASS'), habilitacion: g('PASS') })).toBe('PASS');
  });

  it('una FAIL → FAIL', () => {
    expect(aggregateVerdict({ sectorial: g('PASS'), cuantia: g('FAIL'), plazo: g('PASS'), ubicacion: g('PASS'), habilitacion: g('UNKNOWN') })).toBe('FAIL');
  });

  it('WARN sin FAIL → WARN', () => {
    expect(aggregateVerdict({ sectorial: g('PASS'), cuantia: g('WARN'), plazo: g('PASS'), ubicacion: g('PASS'), habilitacion: g('UNKNOWN') })).toBe('WARN');
  });

  it('UNKNOWN no fuerza rojo: PASS + UNKNOWN → PASS', () => {
    expect(aggregateVerdict({ sectorial: g('PASS'), cuantia: g('PASS'), plazo: g('PASS'), ubicacion: g('PASS'), habilitacion: g('UNKNOWN') })).toBe('PASS');
  });

  it('todas UNKNOWN → UNKNOWN', () => {
    expect(aggregateVerdict({ sectorial: g('UNKNOWN'), cuantia: g('UNKNOWN'), plazo: g('UNKNOWN'), ubicacion: g('UNKNOWN'), habilitacion: g('UNKNOWN') })).toBe('UNKNOWN');
  });
});

describe('toVerdictInput (adaptador SecopProceso → VerdictProcessInput)', () => {
  const baseProceso: SecopProceso = {
    id: 'CO1.REQ.9', referencia: 'R9', nombre: 'X', descripcion: '', entidad: 'E',
    departamento: 'Valle del Cauca', ciudad: 'Cali', estado: 'Publicado', fase: '',
    modalidad: 'Lic', tipoContrato: 'Obra', fechaPublicacion: null, precioBase: 200_000_000,
    adjudicado: false, valorAdjudicacion: null, adjudicatario: null, unspsc: 'V1.83101500',
    url: null, estadoApertura: 'Abierto', documentAccess: 'UNKNOWN', accessMessage: '',
  };

  it('conserva los campos del proceso y rellena defaults (sectorAgua/fechaCierre null)', () => {
    const vi = toVerdictInput(baseProceso);
    expect(vi.id).toBe('CO1.REQ.9');
    expect(vi.estadoApertura).toBe('Abierto');
    expect(vi.sectorAgua).toBeNull();
    expect(vi.fechaCierre).toBeNull();
  });

  it('aplica los extras cuando se proveen', () => {
    const vi = toVerdictInput(baseProceso, { sectorAgua: true, fechaCierre: '2026-07-01' });
    expect(vi.sectorAgua).toBe(true);
    expect(vi.fechaCierre).toBe('2026-07-01');
  });
});

describe('buildVerdict (orquestador)', () => {
  it('compone las 5 compuertas, overall = agregación, level 0', () => {
    const v = buildVerdict(profile, proc(), NOW);
    expect(v.procesoId).toBe('CO1.REQ.1');
    expect(v.level).toBe(0);
    expect(v.evaluatedAt).toBe(NOW.toISOString());
    expect(Object.keys(v.gates).sort()).toEqual(['cuantia', 'habilitacion', 'plazo', 'sectorial', 'ubicacion']);
    expect(v.gates.habilitacion.status).toBe('UNKNOWN');
    // proc por defecto: sectorial PASS, cuantia PASS, plazo WARN (abierto), ubicacion PASS → overall WARN
    expect(v.overall).toBe('WARN');
  });
});
