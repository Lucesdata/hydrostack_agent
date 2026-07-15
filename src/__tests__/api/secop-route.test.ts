import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { SecopProceso } from '@/src/lib/secop/types';

// La búsqueda hace IO de red a Socrata. Se mockea para probar SOLO el route:
// que adjunta el veredicto Nivel 0 a cada proceso.
vi.mock('@/src/lib/secop/client', () => ({
  searchProcesos: vi.fn(),
  searchContratos: vi.fn(),
  countProcesos: vi.fn(),
}));

import { GET } from '@/app/api/secop/route';
import { searchProcesos, countProcesos } from '@/src/lib/secop/client';

const mockedSearch = vi.mocked(searchProcesos);
const mockedCount = vi.mocked(countProcesos);

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

describe('GET /api/secop — lista sin veredicto (Fase 2: veredicto es on-demand)', () => {
  it('no adjunta verdict a los items; el semáforo se computa aparte en POST /api/secop/verdict', async () => {
    mockedSearch.mockResolvedValue({ items: [sampleProceso], page: 1, pageSize: 25 });
    mockedCount.mockResolvedValue(1);
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].id).toBe('CO1.REQ.42');
    expect(body.items[0].verdict).toBeUndefined();
  });
});
