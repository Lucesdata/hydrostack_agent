import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import type { SecopProceso } from '@/src/lib/secop/types';
import type { OferenteProfile } from '@/src/lib/oferente/types';
import { POST } from '@/app/api/secop/verdict/route';

const proceso: SecopProceso = {
  id: 'CO1.REQ.42', referencia: 'R42', nombre: 'Optimización acueducto', descripcion: '',
  entidad: 'Acuavalle', departamento: 'Valle del Cauca', ciudad: 'Cali', estado: 'Publicado',
  fase: '', modalidad: 'Licitación pública', tipoContrato: 'Obra', fechaPublicacion: null,
  precioBase: 200_000_000, adjudicado: false, valorAdjudicacion: null, adjudicatario: null,
  unspsc: 'V1.83101500', url: null, estadoApertura: 'Abierto', documentAccess: 'UNKNOWN',
  accessMessage: '',
};

const perfil: OferenteProfile = {
  id: 'oferente-local',
  tipoPersona: 'juridica',
  sectoresUnspsc: ['83101'],
  capacidadFinanciera: {
    capitalTrabajoCop: 0, indiceLiquidez: 0, indiceEndeudamiento: 0,
    razonCoberturaIntereses: 0, fuente: 'manual', vigenciaHasta: null,
  },
  kCapacidadResidualCop: null,
  cobertura: { departamentos: ['76'], municipios: ['76001'] },
  cuantiaObjetivo: { minCop: 100_000_000, maxCop: 1_000_000_000 },
};

const postReq = (body: unknown) =>
  new NextRequest('http://localhost/api/secop/verdict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('POST /api/secop/verdict — veredicto Nivel 0 on-demand', () => {
  it('devuelve el veredicto para un proceso y perfil válidos', async () => {
    const res = await POST(postReq({ proceso, perfil }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.verdict.procesoId).toBe('CO1.REQ.42');
    expect(body.verdict.level).toBe(0);
    expect(body.verdict.gates.habilitacion.status).toBe('UNKNOWN');
    expect(['PASS', 'WARN', 'FAIL', 'UNKNOWN']).toContain(body.verdict.overall);
  });

  it('recomputa (no persiste): dos llamadas con el mismo insumo dan el mismo resultado', async () => {
    const r1 = await (await POST(postReq({ proceso, perfil }))).json();
    const r2 = await (await POST(postReq({ proceso, perfil }))).json();
    expect(r1.verdict.overall).toBe(r2.verdict.overall);
  });

  it('400 si falta el perfil', async () => {
    const res = await POST(postReq({ proceso }));
    expect(res.status).toBe(400);
  });

  it('400 si falta el proceso', async () => {
    const res = await POST(postReq({ perfil }));
    expect(res.status).toBe(400);
  });

  it('400 si el JSON es inválido', async () => {
    const res = await POST(postReq('no-es-json'));
    expect(res.status).toBe(400);
  });
});
