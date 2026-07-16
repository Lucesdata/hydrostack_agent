import { describe, it, expect } from 'vitest';
import { mapDbRowToProceso, type DbProcesoRow } from '@/src/lib/secop/db-search';

function row(over: Partial<DbProcesoRow> = {}): DbProcesoRow {
  return {
    secopProcesoId: 'CO1.REQ.42',
    referencia: 'R42',
    objeto: 'Optimización acueducto',
    modalidad: 'Licitación pública',
    tipoContrato: 'Obra',
    fechaPublicacion: '2026-06-01',
    precioBase: '200000000',
    estadoActual: 'Publicado',
    documentAccess: 'UNKNOWN',
    entidadNombre: 'Acuavalle',
    departamento: 'Valle del Cauca',
    ciudad: 'Cali',
    nombreRaw: 'Optimización del sistema de acueducto',
    descripcionRaw: 'Obras de acueducto y alcantarillado',
    faseRaw: 'Presentación de oferta',
    unspscRaw: 'V1.83101500',
    adjudicadoRaw: 'No',
    valorAdjudicacionRaw: '0',
    adjudicatarioRaw: 'No Adjudicado',
    estadoAperturaRaw: 'Abierto',
    urlRaw: { url: 'https://community.secop.gov.co/x' },
    ...over,
  };
}

describe('mapDbRowToProceso (fila DB → SecopProceso)', () => {
  it('mapea los campos normalizados y los extraídos del JSON crudo', () => {
    const p = mapDbRowToProceso(row());
    expect(p.id).toBe('CO1.REQ.42');
    expect(p.referencia).toBe('R42');
    expect(p.nombre).toBe('Optimización del sistema de acueducto');
    expect(p.descripcion).toBe('Obras de acueducto y alcantarillado');
    expect(p.entidad).toBe('Acuavalle');
    expect(p.departamento).toBe('Valle del Cauca');
    expect(p.ciudad).toBe('Cali');
    expect(p.estado).toBe('Publicado');
    expect(p.fase).toBe('Presentación de oferta');
    expect(p.modalidad).toBe('Licitación pública');
    expect(p.tipoContrato).toBe('Obra');
    expect(p.fechaPublicacion).toBe('2026-06-01');
    expect(p.precioBase).toBe(200_000_000);
    expect(p.unspsc).toBe('V1.83101500');
    expect(p.estadoApertura).toBe('Abierto');
    expect(p.url).toBe('https://community.secop.gov.co/x');
  });

  it('nombre cae a objeto (columna normalizada) si el JSON crudo no lo trae', () => {
    const p = mapDbRowToProceso(row({ nombreRaw: null, objeto: 'Fallback objeto' }));
    expect(p.nombre).toBe('Fallback objeto');
  });

  it('adjudicado: "Si" (case-insensitive) → true, cualquier otro valor → false', () => {
    expect(mapDbRowToProceso(row({ adjudicadoRaw: 'Si' })).adjudicado).toBe(true);
    expect(mapDbRowToProceso(row({ adjudicadoRaw: 'SI' })).adjudicado).toBe(true);
    expect(mapDbRowToProceso(row({ adjudicadoRaw: 'No' })).adjudicado).toBe(false);
    expect(mapDbRowToProceso(row({ adjudicadoRaw: null })).adjudicado).toBe(false);
  });

  it('valorAdjudicacion numérico desde texto; null si no parsea', () => {
    expect(mapDbRowToProceso(row({ valorAdjudicacionRaw: '450000000' })).valorAdjudicacion).toBe(450_000_000);
    expect(mapDbRowToProceso(row({ valorAdjudicacionRaw: null })).valorAdjudicacion).toBeNull();
  });

  it('estadoApertura solo acepta Abierto/Cerrado; cualquier otra cosa → null', () => {
    expect(mapDbRowToProceso(row({ estadoAperturaRaw: 'Cerrado' })).estadoApertura).toBe('Cerrado');
    expect(mapDbRowToProceso(row({ estadoAperturaRaw: 'raro' })).estadoApertura).toBeNull();
    expect(mapDbRowToProceso(row({ estadoAperturaRaw: null })).estadoApertura).toBeNull();
  });

  it('url soporta objeto {url} o string; basura → null', () => {
    expect(mapDbRowToProceso(row({ urlRaw: 'https://x.test' })).url).toBe('https://x.test');
    expect(mapDbRowToProceso(row({ urlRaw: { url: 'https://y.test' } })).url).toBe('https://y.test');
    expect(mapDbRowToProceso(row({ urlRaw: 'basura' })).url).toBeNull();
    expect(mapDbRowToProceso(row({ urlRaw: null })).url).toBeNull();
  });

  it('documentAccess: usa la columna del pipeline; UNKNOWN si viene null', () => {
    expect(mapDbRowToProceso(row({ documentAccess: 'PUBLIC' })).documentAccess).toBe('PUBLIC');
    expect(mapDbRowToProceso(row({ documentAccess: null })).documentAccess).toBe('UNKNOWN');
  });

  it('accessMessage es el mensaje amigable correspondiente al estado, no la razón cruda', () => {
    expect(mapDbRowToProceso(row({ documentAccess: 'PUBLIC' })).accessMessage).toMatch(/públicos/i);
    expect(mapDbRowToProceso(row({ documentAccess: 'UNKNOWN' })).accessMessage).toMatch(/confirmar/i);
  });

  it('campos de texto ausentes degradan a cadena vacía, no a "null"/"undefined"', () => {
    const p = mapDbRowToProceso(
      row({
        referencia: null,
        objeto: null,
        nombreRaw: null,
        descripcionRaw: null,
        entidadNombre: null,
        departamento: null,
        ciudad: null,
        estadoActual: null,
        faseRaw: null,
        modalidad: null,
        tipoContrato: null,
      }),
    );
    expect(p.referencia).toBe('');
    expect(p.nombre).toBe('');
    expect(p.descripcion).toBe('');
    expect(p.entidad).toBe('');
    expect(p.departamento).toBe('');
    expect(p.ciudad).toBe('');
    expect(p.estado).toBe('');
    expect(p.fase).toBe('');
    expect(p.modalidad).toBe('');
    expect(p.tipoContrato).toBe('');
  });
});
