import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { SecopProceso } from '@/src/lib/secop/types';

// La búsqueda hace IO (Postgres y/o red a Socrata). Se mockean ambas fuentes
// para probar SOLO el route: que Postgres es la fuente primaria (Fase 3) y
// que Socrata live es el fallback si la base falla.
vi.mock('@/src/lib/secop/client', () => ({
  searchProcesos: vi.fn(),
  searchContratos: vi.fn(),
  countProcesos: vi.fn(),
}));
vi.mock('@/src/lib/secop/cached-db-search', () => ({
  searchProcesosDbCached: vi.fn(),
  countProcesosDbCached: vi.fn(),
}));

import { GET } from '@/app/api/secop/route';
import { searchProcesos, countProcesos } from '@/src/lib/secop/client';
import { searchProcesosDbCached, countProcesosDbCached } from '@/src/lib/secop/cached-db-search';

const mockedSearch = vi.mocked(searchProcesos);
const mockedCount = vi.mocked(countProcesos);
const mockedSearchDb = vi.mocked(searchProcesosDbCached);
const mockedCountDb = vi.mocked(countProcesosDbCached);

const sampleProceso: SecopProceso = {
  id: 'CO1.REQ.42', referencia: 'R42', nombre: 'Optimización acueducto', descripcion: '',
  entidad: 'Acuavalle', departamento: 'Valle del Cauca', ciudad: 'Cali', estado: 'Publicado',
  fase: '', modalidad: 'Licitación pública', tipoContrato: 'Obra', fechaPublicacion: null,
  precioBase: 200_000_000, adjudicado: false, valorAdjudicacion: null, adjudicatario: null,
  unspsc: 'V1.83101500', url: null, estadoApertura: 'Abierto', documentAccess: 'UNKNOWN',
  accessMessage: '',
};

const req = (qs = 'tipo=procesos') => new NextRequest(`http://localhost/api/secop?${qs}`);

beforeEach(() => vi.clearAllMocks());

describe('GET /api/secop — Postgres primero, Socrata como fallback (Fase 3)', () => {
  it('usa Postgres cuando responde bien, sin tocar Socrata', async () => {
    mockedSearchDb.mockResolvedValue({ items: [sampleProceso], page: 1, pageSize: 25 });
    mockedCountDb.mockResolvedValue(1);
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.items[0].id).toBe('CO1.REQ.42');
    expect(mockedSearch).not.toHaveBeenCalled();
    expect(mockedCount).not.toHaveBeenCalled();
  });

  it('no adjunta verdict a los items; el semáforo se computa aparte en POST /api/secop/verdict', async () => {
    mockedSearchDb.mockResolvedValue({ items: [sampleProceso], page: 1, pageSize: 25 });
    mockedCountDb.mockResolvedValue(1);
    const res = await GET(req());
    const body = await res.json();
    expect(body.items[0].verdict).toBeUndefined();
  });

  it('cae a Socrata live si Postgres falla (sin DATABASE_URL, error de conexión/consulta)', async () => {
    mockedSearchDb.mockRejectedValue(new Error('no DATABASE_URL'));
    mockedCountDb.mockRejectedValue(new Error('no DATABASE_URL'));
    mockedSearch.mockResolvedValue({ items: [sampleProceso], page: 1, pageSize: 25 });
    mockedCount.mockResolvedValue(7);
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(7);
    expect(body.items[0].id).toBe('CO1.REQ.42');
  });

  it('un total vacío en Postgres (filtros muy angostos) NO cae a Socrata', async () => {
    mockedSearchDb.mockResolvedValue({ items: [], page: 1, pageSize: 25 });
    mockedCountDb.mockResolvedValue(0);
    const res = await GET(req());
    const body = await res.json();
    expect(body.total).toBe(0);
    expect(body.items).toHaveLength(0);
    expect(mockedSearch).not.toHaveBeenCalled();
  });
});
