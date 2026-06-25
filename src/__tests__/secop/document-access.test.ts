import { describe, it, expect } from 'vitest';
import {
  preclassify,
  accessMessage,
  secopPortal,
  extractUrl,
  type DocumentAccess,
} from '@/src/lib/secop/document-access';
import { FIELDS_PROCESOS } from '@/src/lib/secop/config';

const F = FIELDS_PROCESOS;
const SECOP_II = 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.123';
const SECOP_I = 'https://www.contratos.gov.co/consultas/detalleProceso.do?numConstancia=07-1-99';

function row(over: Record<string, unknown>) {
  return { [F.fase]: '', [F.estado]: '', [F.modalidad]: 'Licitación pública', [F.url]: SECOP_II, ...over } as Record<
    string,
    unknown
  >;
}

describe('preclassify (B2 — solo metadata)', () => {
  it('fase de pre-publicación → NOT_PUBLISHED (aunque haya url)', () => {
    const r = preclassify(row({ [F.fase]: 'Planeación', [F.url]: SECOP_II }));
    expect(r.state).toBe<DocumentAccess>('NOT_PUBLISHED');
    expect(r.reason).toContain('pre-publicación');
    expect(r.method).toBe('metadata');
  });

  it('estado "Borrador" → NOT_PUBLISHED', () => {
    expect(preclassify(row({ [F.estado]: 'Borrador de pliego' })).state).toBe('NOT_PUBLISHED');
  });

  it('sin urlproceso → NOT_PUBLISHED', () => {
    const r = preclassify(row({ [F.estado]: 'Convocado', [F.url]: null }));
    expect(r.state).toBe('NOT_PUBLISHED');
    expect(r.reason).toContain('sin urlproceso');
  });

  it('SECOP II publicado → UNKNOWN (nunca PUBLIC sin probe)', () => {
    const r = preclassify(row({ [F.estado]: 'Adjudicado', [F.url]: { url: SECOP_II } }));
    expect(r.state).toBe('UNKNOWN');
    expect(r.reason).toContain('SECOP II');
  });

  it('SECOP I (contratos.gov.co) → UNKNOWN con nota de portal distinto', () => {
    const r = preclassify(row({ [F.estado]: 'Celebrado', [F.url]: SECOP_I }));
    expect(r.state).toBe('UNKNOWN');
    expect(r.reason).toContain('SECOP I');
  });

  it('dominio no reconocido → UNKNOWN', () => {
    const r = preclassify(row({ [F.estado]: 'Convocado', [F.url]: 'https://example.org/x' }));
    expect(r.state).toBe('UNKNOWN');
    expect(r.reason).toContain('no reconocido');
  });

  it('nunca devuelve PUBLIC ni RESTRICTED (eso es Fase C)', () => {
    const states = [
      preclassify(row({ [F.estado]: 'Adjudicado' })).state,
      preclassify(row({ [F.estado]: 'Convocado', [F.url]: SECOP_I })).state,
      preclassify(row({ [F.fase]: 'Planeación' })).state,
    ];
    expect(states).not.toContain('PUBLIC');
    expect(states).not.toContain('RESTRICTED');
  });
});

describe('secopPortal', () => {
  it('clasifica por dominio', () => {
    expect(secopPortal(SECOP_II)).toBe('secop_ii');
    expect(secopPortal(SECOP_I)).toBe('secop_i');
    expect(secopPortal('https://example.org/x')).toBe('otro');
  });
});

describe('extractUrl', () => {
  it('acepta string, objeto {url} y nulos', () => {
    expect(extractUrl(SECOP_II)).toBe(SECOP_II);
    expect(extractUrl({ url: SECOP_II })).toBe(SECOP_II);
    expect(extractUrl(null)).toBeNull();
    expect(extractUrl({})).toBeNull();
  });
});

describe('accessMessage', () => {
  it('da un mensaje no vacío y distinto por estado', () => {
    const msgs = (['PUBLIC', 'RESTRICTED', 'NOT_PUBLISHED', 'UNKNOWN'] as DocumentAccess[]).map(accessMessage);
    msgs.forEach((m) => expect(m.length).toBeGreaterThan(0));
    expect(new Set(msgs).size).toBe(4); // los cuatro mensajes son distintos
  });
});
