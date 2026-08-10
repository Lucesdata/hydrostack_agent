import { describe, it, expect, vi } from 'vitest';
import type { RequisitosHabilitantes } from '@/src/lib/pliego/schema';

const mockGenerateContent = vi.fn();
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return { generateContent: mockGenerateContent };
    }
  },
}));

import { extractStructuredRequirements } from '@/src/lib/eligibility/extract-requirements';

const requisitos: RequisitosHabilitantes = {
  experiencia_especifica: 'Experiencia específica mínima de 3.000 SMMLV en construcción de redes de acueducto (UNSPSC 83101500), máximo 3 contratos.',
  capacidad_financiera: 'Índice de liquidez mayor o igual a 1.5.',
  capacidad_organizacional: 'NO_ENCONTRADO',
};

function mockResponse(json: unknown) {
  mockGenerateContent.mockResolvedValue({
    response: { candidates: [{ finishReason: 'STOP' }], text: () => JSON.stringify(json) },
  });
}

describe('extractStructuredRequirements', () => {
  it('lanza si no hay GEMINI_API_KEY', async () => {
    await expect(
      extractStructuredRequirements(requisitos, { apiKey: undefined }),
    ).rejects.toThrow(/GEMINI_API_KEY/);
  });

  it('estructura el texto libre en requisitos cuantificados', async () => {
    mockResponse({
      experiencia: {
        valor_min_smmlv: 3000,
        unspsc_exigidos: ['83101500'],
        max_contratos_aportables: 3,
        verificar_manual: false,
        cita_textual: 'Experiencia específica mínima de 3.000 SMMLV',
      },
      indicadores_financieros: [
        {
          indicador: 'indice_liquidez',
          operador: 'gte',
          valor: 1.5,
          verificar_manual: false,
          cita_textual: 'Índice de liquidez mayor o igual a 1.5',
        },
      ],
    });
    const r = await extractStructuredRequirements(requisitos, { apiKey: 'k' });
    expect(r.experiencia.valor_min_smmlv).toBe(3000);
    expect(r.indicadores_financieros[0].indicador).toBe('indice_liquidez');
  });

  it('propaga error si la salida no es JSON válido', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { candidates: [{ finishReason: 'STOP' }], text: () => 'no es json' },
    });
    await expect(extractStructuredRequirements(requisitos, { apiKey: 'k' })).rejects.toThrow();
  });
});
