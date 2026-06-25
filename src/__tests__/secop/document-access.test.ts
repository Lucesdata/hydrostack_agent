import { describe, it, expect } from 'vitest';
import {
  preclassify,
  accessMessage,
  secopPortal,
  extractUrl,
  classifyProbeResponse,
  probeDocument,
  canExtract,
  assertExtractable,
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

describe('classifyProbeResponse (C1)', () => {
  it('muro ReCaptcha por URL final tras redirect → RESTRICTED (caso real SECOP II)', () => {
    const r = classifyProbeResponse({
      ok: true,
      status: 200,
      finalUrl: 'https://community.secop.gov.co/Public/Common/GoogleReCaptcha/Index?previousUrl=...',
      contentType: 'text/html; charset=utf-8',
      bodySample: '<title>ReCaptcha</title>',
    });
    expect(r.state).toBe('RESTRICTED');
    expect(r.method).toBe('probe');
  });

  it('marcador recaptcha en el cuerpo → RESTRICTED', () => {
    expect(
      classifyProbeResponse({ ok: true, status: 200, finalUrl: 'https://x/y', contentType: 'text/html', bodySample: 'grecaptcha.execute()' }).state,
    ).toBe('RESTRICTED');
  });

  it('404 → NOT_PUBLISHED; 403 → RESTRICTED; 5xx → UNKNOWN', () => {
    const base = { ok: true, finalUrl: 'https://x/y', contentType: 'text/html', bodySample: '' };
    expect(classifyProbeResponse({ ...base, status: 404 }).state).toBe('NOT_PUBLISHED');
    expect(classifyProbeResponse({ ...base, status: 403 }).state).toBe('RESTRICTED');
    expect(classifyProbeResponse({ ...base, status: 502 }).state).toBe('UNKNOWN');
  });

  it('PDF descargable directo (200) → PUBLIC', () => {
    const r = classifyProbeResponse({ ok: true, status: 200, finalUrl: 'https://x/pliego.pdf', contentType: 'application/pdf', bodySample: null });
    expect(r.state).toBe('PUBLIC');
  });

  it('sin respuesta (error de red) → UNKNOWN', () => {
    expect(classifyProbeResponse({ ok: false, status: 0, finalUrl: 'https://x', contentType: null, error: 'AbortError' }).state).toBe('UNKNOWN');
  });
});

describe('probeDocument (C1, fetch inyectado)', () => {
  /** Construye un Response-like mínimo con lo que probeDocument lee. */
  function fakeRes(over: { status: number; url: string; contentType: string | null; body?: string }) {
    return {
      status: over.status,
      url: over.url,
      headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? over.contentType : null) },
      text: async () => over.body ?? '',
    } as unknown as Response;
  }

  it('reproduce el redirect a ReCaptcha de SECOP II → RESTRICTED', async () => {
    const fetchImpl = (async () =>
      fakeRes({
        status: 200,
        url: 'https://community.secop.gov.co/Public/Common/GoogleReCaptcha/Index?previousUrl=x',
        contentType: 'text/html',
        body: '<title>ReCaptcha</title>',
      })) as unknown as typeof fetch;
    const r = await probeDocument('https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.1', { fetchImpl });
    expect(r.state).toBe('RESTRICTED');
  });

  it('PDF directo → PUBLIC', async () => {
    const fetchImpl = (async () => fakeRes({ status: 200, url: 'https://x/d.pdf', contentType: 'application/pdf' })) as unknown as typeof fetch;
    expect((await probeDocument('https://x/d.pdf', { fetchImpl })).state).toBe('PUBLIC');
  });

  it('error de red → UNKNOWN', async () => {
    const fetchImpl = (async () => {
      throw new Error('boom');
    }) as unknown as typeof fetch;
    expect((await probeDocument('https://x', { fetchImpl })).state).toBe('UNKNOWN');
  });

  it('url nula → NOT_PUBLISHED (no hace red)', async () => {
    expect((await probeDocument(null)).state).toBe('NOT_PUBLISHED');
  });
});

describe('gate de extracción (C2)', () => {
  it('canExtract: solo PUBLIC pasa', () => {
    expect(canExtract('PUBLIC')).toBe(true);
    (['RESTRICTED', 'NOT_PUBLISHED', 'UNKNOWN'] as DocumentAccess[]).forEach((s) => expect(canExtract(s)).toBe(false));
  });

  it('assertExtractable: lanza para no-PUBLIC, no lanza para PUBLIC', () => {
    expect(() => assertExtractable('PUBLIC')).not.toThrow();
    expect(() => assertExtractable('RESTRICTED')).toThrow(/solo procesa documentos PUBLIC/);
  });
});
