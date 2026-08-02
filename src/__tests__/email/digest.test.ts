import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderDigest } from '@/src/lib/email/digest';
import { buildVerdict, toVerdictInput } from '@/src/lib/secop/verdict';
import type { OferenteProfile } from '@/src/lib/oferente/types';
import type { SecopProceso } from '@/src/lib/secop/types';
import type { Match } from '@/src/lib/matching/match';

const ORIGINAL_SECRET = process.env.AUTH_SECRET;
const ORIGINAL_URL = process.env.NEXT_PUBLIC_APP_URL;

const perfil: OferenteProfile = {
  id: 'oferente-1',
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
  cobertura: { departamentos: ['76'], municipios: ['76001'] },
  cuantiaObjetivo: { minCop: 0, maxCop: 1_000_000_000 },
};

function proceso(over: Partial<SecopProceso> = {}): SecopProceso {
  return {
    id: 'CO1.REQ.1',
    referencia: 'REF-1',
    nombre: 'OPTIMIZACIÓN DEL SISTEMA DE ACUEDUCTO',
    descripcion: '',
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
    url: 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.1',
    estadoApertura: 'Abierto',
    documentAccess: 'UNKNOWN',
    accessMessage: '',
    ...over,
  };
}

function match(over: Partial<SecopProceso> = {}): Match {
  const p = proceso(over);
  return { proceso: p, verdict: buildVerdict(perfil, toVerdictInput(p), new Date('2026-06-27T00:00:00Z')) };
}

describe('renderDigest', () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = 'test-secret';
    process.env.NEXT_PUBLIC_APP_URL = 'https://hydrostacks.vercel.app';
  });

  afterEach(() => {
    process.env.AUTH_SECRET = ORIGINAL_SECRET;
    process.env.NEXT_PUBLIC_APP_URL = ORIGINAL_URL;
  });

  it('asunto en singular con 1 coincidencia', () => {
    const d = renderDigest([match()], { id: 'u1', email: 'a@b.com' });
    expect(d.subject).toContain('1 licitación');
  });

  it('asunto en plural con varias coincidencias', () => {
    const d = renderDigest([match({ id: 'A' }), match({ id: 'B' })], { id: 'u1', email: 'a@b.com' });
    expect(d.subject).toContain('2 licitaciones');
  });

  it('incluye el título y el link con UTM de cada proceso en html y text', () => {
    const d = renderDigest([match()], { id: 'u1', email: 'a@b.com' });
    expect(d.html).toContain('Optimización del sistema de acueducto');
    expect(d.html).toContain('utm_source=hydrostack');
    expect(d.text).toContain('utm_source=hydrostack');
  });

  it('el link de unsubscribe usa el usuarioId y aparece en html, text y unsubscribeUrl', () => {
    const d = renderDigest([match()], { id: 'u1', email: 'a@b.com' });
    expect(d.unsubscribeUrl).toContain('/api/alertas/unsubscribe?token=u1.');
    expect(d.html).toContain(d.unsubscribeUrl);
    expect(d.text).toContain(d.unsubscribeUrl);
  });

  it('usa http://localhost:3000 si NEXT_PUBLIC_APP_URL no está definida', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const d = renderDigest([match()], { id: 'u1', email: 'a@b.com' });
    expect(d.unsubscribeUrl.startsWith('http://localhost:3000')).toBe(true);
  });
});
