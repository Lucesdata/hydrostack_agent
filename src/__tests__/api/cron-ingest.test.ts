import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RunOutput } from '@/src/lib/ingest/pipeline';

// El pipeline hace IO de red + base. Se mockea para probar SOLO el route:
// el gate de auth, el cableado de opciones y el mapeo de error → 500.
vi.mock('@/src/lib/ingest/pipeline', () => ({
  runIngestPipeline: vi.fn(),
}));

import { GET } from '@/app/api/cron/ingest/route';
import { runIngestPipeline } from '@/src/lib/ingest/pipeline';

const mockedPipeline = vi.mocked(runIngestPipeline);

const SAMPLE: RunOutput = {
  startedAt: '2026-06-23T00:00:00.000Z',
  durationMs: 12,
  procesos: null,
  contratos: null,
  transform: null,
};

function req(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/cron/ingest', { headers });
}

describe('GET /api/cron/ingest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 's3cret';
    mockedPipeline.mockResolvedValue(SAMPLE);
  });

  it('rechaza con 401 cuando falta Authorization', async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(mockedPipeline).not.toHaveBeenCalled();
  });

  it('rechaza con 401 con secreto incorrecto', async () => {
    const res = await GET(req({ authorization: 'Bearer nope' }));
    expect(res.status).toBe(401);
    expect(mockedPipeline).not.toHaveBeenCalled();
  });

  it('ejecuta el pipeline con el secreto correcto y cap de páginas', async () => {
    const res = await GET(req({ authorization: 'Bearer s3cret' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.summary.durationMs).toBe(12);
    expect(mockedPipeline).toHaveBeenCalledWith({ source: 'both', maxPages: 200 });
  });

  it('mapea un fallo del pipeline a 500 con el mensaje de error', async () => {
    mockedPipeline.mockRejectedValueOnce(new Error('boom'));
    const res = await GET(req({ authorization: 'Bearer s3cret' }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('boom');
  });

  it('sin CRON_SECRET definido, permite la corrida (con warning)', async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(mockedPipeline).toHaveBeenCalledTimes(1);
  });
});
