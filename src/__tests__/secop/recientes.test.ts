import { describe, it, expect } from 'vitest';
import {
  extractUrlProceso,
  mapRowToResumen,
  mapLiveToResumen,
  type RecienteRow,
} from '@/src/lib/secop/recientes';
import type { SecopProceso } from '@/src/lib/secop/types';

const baseRow: RecienteRow = {
  secopProcesoId: 'CO1.REQ.100',
  referencia: 'LP-001-2026',
  objeto: 'CONSTRUCCIÓN PTAP MUNICIPIO X',
  modalidad: 'Licitación pública',
  estado: 'Publicado',
  valorEstimado: '1500000000.00',
  fechaPublicacion: '2026-07-10',
  entidadNombre: 'ALCALDÍA DE X',
  departamento: 'VALLE DEL CAUCA',
  municipio: 'CALI',
  urlRaw: { url: 'https://community.secop.gov.co/x' },
};

describe('extractUrlProceso', () => {
  it('string http → tal cual', () => {
    expect(extractUrlProceso('https://a.co/p')).toBe('https://a.co/p');
  });
  it('objeto { url } → url interna', () => {
    expect(extractUrlProceso({ url: 'https://a.co/p' })).toBe('https://a.co/p');
  });
  it('basura → null', () => {
    expect(extractUrlProceso(null)).toBeNull();
    expect(extractUrlProceso('no-descargable')).toBeNull();
    expect(extractUrlProceso({ url: 42 })).toBeNull();
    expect(extractUrlProceso(7)).toBeNull();
  });
});

describe('mapRowToResumen', () => {
  it('mapea la fila completa, numeric pg (string) → number', () => {
    const r = mapRowToResumen(baseRow);
    expect(r.id).toBe('CO1.REQ.100');
    expect(r.valorEstimado).toBe(1500000000);
    expect(r.url).toBe('https://community.secop.gov.co/x');
    expect(r.municipio).toBe('CALI');
  });
  it('nulos degradan sin romper', () => {
    const r = mapRowToResumen({
      ...baseRow,
      objeto: null,
      valorEstimado: null,
      urlRaw: null,
      entidadNombre: null,
    });
    expect(r.objeto).toBe('');
    expect(r.valorEstimado).toBeNull();
    expect(r.url).toBeNull();
    expect(r.entidad).toBeNull();
  });
  it('numeric ilegible → null, no NaN', () => {
    const r = mapRowToResumen({ ...baseRow, valorEstimado: 'abc' });
    expect(r.valorEstimado).toBeNull();
  });
});

describe('mapLiveToResumen', () => {
  it('SecopProceso live → mismo DTO que la fila de base', () => {
    const p = {
      id: 'CO1.REQ.200',
      referencia: 'SA-9',
      nombre: 'Obra acueducto',
      descripcion: 'desc',
      entidad: 'Empresa Y ESP',
      departamento: 'CAUCA',
      ciudad: 'POPAYÁN',
      estado: 'Publicado',
      fase: '',
      modalidad: 'Selección abreviada',
      tipoContrato: 'Obra',
      fechaPublicacion: '2026-07-12',
      precioBase: 900000000,
      adjudicado: false,
      valorAdjudicacion: null,
      adjudicatario: null,
      unspsc: null,
      url: 'https://community.secop.gov.co/y',
      estadoApertura: 'Abierto',
      documentAccess: 'PUBLIC',
      accessMessage: '',
    } as unknown as SecopProceso;
    const r = mapLiveToResumen(p);
    expect(r.id).toBe('CO1.REQ.200');
    expect(r.objeto).toBe('Obra acueducto');
    expect(r.municipio).toBe('POPAYÁN');
    expect(r.valorEstimado).toBe(900000000);
  });
});
