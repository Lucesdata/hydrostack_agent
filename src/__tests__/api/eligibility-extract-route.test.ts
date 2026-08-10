import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { PliegoExtraction } from '@/src/lib/pliego/schema';

const mockOnConflict = vi.fn();
vi.mock('@/src/lib/db/client', () => ({
  db: {
    insert: () => ({ values: () => ({ onConflictDoUpdate: mockOnConflict }) }),
  },
}));

const mockExtract = vi.fn();
vi.mock('@/src/lib/eligibility/extract-requirements', () => ({
  extractStructuredRequirements: (...args: unknown[]) => mockExtract(...args),
}));

import { POST } from '@/app/api/eligibility/extract/route';

const extraction = {
  requisitos_habilitantes: {
    experiencia_especifica: 'mínimo 3.000 SMMLV',
    capacidad_financiera: 'liquidez >= 1.5',
    capacidad_organizacional: 'NO_ENCONTRADO',
  },
} as unknown as PliegoExtraction;

const postReq = (body: unknown) =>
  new NextRequest('http://localhost/api/eligibility/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('POST /api/eligibility/extract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('400 si falta procesoId', async () => {
    const res = await POST(postReq({ extraction }));
    expect(res.status).toBe(400);
  });

  it('400 si falta extraction', async () => {
    const res = await POST(postReq({ procesoId: 'CO1.REQ.1' }));
    expect(res.status).toBe(400);
  });

  it('estructura, cachea y devuelve los requisitos', async () => {
    mockExtract.mockResolvedValue({
      experiencia: { valor_min_smmlv: 3000, unspsc_exigidos: [], max_contratos_aportables: null, verificar_manual: false, cita_textual: 'x' },
      indicadores_financieros: [],
    });
    mockOnConflict.mockResolvedValue(undefined);
    const res = await POST(postReq({ procesoId: 'CO1.REQ.1', extraction }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.requisitos.experiencia.valor_min_smmlv).toBe(3000);
    expect(mockExtract).toHaveBeenCalledWith(extraction.requisitos_habilitantes);
  });

  it('502 si la estructuración falla', async () => {
    mockExtract.mockRejectedValue(new Error('GEMINI_API_KEY no definida'));
    const res = await POST(postReq({ procesoId: 'CO1.REQ.1', extraction }));
    expect(res.status).toBe(502);
  });
});
