// src/__tests__/assistants/documents.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

const pdfToTextMock = vi.fn();
vi.mock('@/src/lib/pliego/rules/pdfToText', () => ({ pdfToText: pdfToTextMock }));

const storageUploadMock = vi.fn();
vi.mock('@/src/lib/supabase/server', () => ({
  createClient: async () => ({
    storage: { from: () => ({ upload: storageUploadMock }) },
  }),
}));

const selectMock = vi.fn();
const returningMock = vi.fn();
vi.mock('@/src/lib/db/client', () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: selectMock }), limit: selectMock }) }) }),
    insert: () => ({ values: () => ({ returning: returningMock }) }),
  },
}));

describe('uploadDocument', () => {
  beforeEach(() => vi.clearAllMocks());

  it('extracts text, uploads to storage, and persists the row', async () => {
    pdfToTextMock.mockResolvedValue('texto del contrato');
    storageUploadMock.mockResolvedValue({ error: null });
    returningMock.mockResolvedValue([{ id: 'doc-1' }]);

    const { uploadDocument } = await import('@/src/lib/assistants/documents');
    const result = await uploadDocument({
      usuarioId: 'user-1',
      contexto: 'ejecucion',
      tipo: 'contrato',
      file: Buffer.from('%PDF-1.4 fake'),
      nombreArchivo: 'contrato.pdf',
    });

    expect(result).toEqual({ id: 'doc-1', textoExtraido: 'texto del contrato' });
    expect(storageUploadMock).toHaveBeenCalled();
  });

  it('throws DocumentUploadError when storage upload fails', async () => {
    pdfToTextMock.mockResolvedValue('texto');
    storageUploadMock.mockResolvedValue({ error: { message: 'bucket lleno' } });

    const { uploadDocument, DocumentUploadError } = await import('@/src/lib/assistants/documents');
    await expect(
      uploadDocument({
        usuarioId: 'user-1',
        contexto: 'ejecucion',
        tipo: 'contrato',
        file: Buffer.from('%PDF-1.4 fake'),
        nombreArchivo: 'contrato.pdf',
      }),
    ).rejects.toThrow(DocumentUploadError);
  });

  it('throws DocumentUploadError when pdfToText fails', async () => {
    pdfToTextMock.mockRejectedValue(new Error('escaneo sin OCR'));

    const { uploadDocument, DocumentUploadError } = await import('@/src/lib/assistants/documents');
    await expect(
      uploadDocument({
        usuarioId: 'user-1',
        contexto: 'ejecucion',
        tipo: 'contrato',
        file: Buffer.from('%PDF-1.4 fake'),
        nombreArchivo: 'contrato.pdf',
      }),
    ).rejects.toThrow(DocumentUploadError);
  });
});

describe('getLatestDocument', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when the user has no documents in this context', async () => {
    selectMock.mockResolvedValue([]);
    const { getLatestDocument } = await import('@/src/lib/assistants/documents');
    expect(await getLatestDocument('user-1', 'operacion')).toBeNull();
  });

  it('returns the row when present', async () => {
    selectMock.mockResolvedValue([{ nombreArchivo: 'ref.pdf', textoExtraido: 'texto' }]);
    const { getLatestDocument } = await import('@/src/lib/assistants/documents');
    expect(await getLatestDocument('user-1', 'operacion')).toEqual({
      nombreArchivo: 'ref.pdf',
      textoExtraido: 'texto',
    });
  });

  it('truncates textoExtraido to MAX_PROMPT_CHARS when the document is longer', async () => {
    const longText = 'a'.repeat(400_001);
    selectMock.mockResolvedValue([{ nombreArchivo: 'ref.pdf', textoExtraido: longText }]);
    const { getLatestDocument } = await import('@/src/lib/assistants/documents');
    const result = await getLatestDocument('user-1', 'operacion');
    expect(result?.textoExtraido.length).toBe(400_000);
  });
});

describe('getDocumentById', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when no matching document exists', async () => {
    selectMock.mockResolvedValue([]);
    const { getDocumentById } = await import('@/src/lib/assistants/documents');
    expect(await getDocumentById('user-1', 'ejecucion', 'doc-1')).toBeNull();
  });

  it('returns the row when present', async () => {
    selectMock.mockResolvedValue([{ nombreArchivo: 'contrato.pdf', textoExtraido: 'texto' }]);
    const { getDocumentById } = await import('@/src/lib/assistants/documents');
    expect(await getDocumentById('user-1', 'ejecucion', 'doc-1')).toEqual({
      nombreArchivo: 'contrato.pdf',
      textoExtraido: 'texto',
    });
  });
});
