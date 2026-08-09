// src/__tests__/api/assistant-route.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockAuth = vi.fn();
vi.mock('@/src/lib/supabase/get-session-user', () => ({
  getSessionUser: () => mockAuth(),
}));

vi.mock('@/src/lib/signals/record-signal', () => ({
  recordUserSignal: vi.fn(),
}));

vi.mock('@/src/lib/assistants/conversations', () => ({
  getOrCreateConversation: vi.fn().mockResolvedValue('conv-1'),
  loadMessages: vi.fn().mockResolvedValue([]),
  saveMessages: vi.fn(),
}));

vi.mock('@/src/lib/assistants/documents', () => ({
  getDocumentById: vi.fn().mockResolvedValue(null),
  getLatestDocument: vi.fn().mockResolvedValue(null),
}));

vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn(() => 'mock-model'),
}));

vi.mock('ai', async () => {
  const actual = await vi.importActual<typeof import('ai')>('ai');
  return {
    ...actual,
    streamText: vi.fn(() => ({
      stream: new ReadableStream(),
      consumeStream: vi.fn(),
    })),
  };
});

const postReq = (body: unknown) =>
  new NextRequest('http://localhost/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('POST /api/assistant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  it('500 sin ANTHROPIC_API_KEY', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { POST } = await import('@/app/api/assistant/route');
    const res = await POST(postReq({ context: 'ejecucion', messages: [] }));
    expect(res.status).toBe(500);
  });

  it('401 sin sesión', async () => {
    mockAuth.mockResolvedValue(null);
    const { POST } = await import('@/app/api/assistant/route');
    const res = await POST(postReq({ context: 'ejecucion', messages: [] }));
    expect(res.status).toBe(401);
  });

  it('400 con contexto desconocido', async () => {
    mockAuth.mockResolvedValue({ id: 'user-1', email: 'a@b.com' });
    const { POST } = await import('@/app/api/assistant/route');
    const res = await POST(postReq({ context: 'inventado', messages: [{ id: '1', role: 'user', parts: [] }] }));
    expect(res.status).toBe(400);
  });

  it('400 sin messages', async () => {
    mockAuth.mockResolvedValue({ id: 'user-1', email: 'a@b.com' });
    const { POST } = await import('@/app/api/assistant/route');
    const res = await POST(postReq({ context: 'ejecucion', messages: [] }));
    expect(res.status).toBe(400);
  });

  it('200 con contexto y mensajes válidos', async () => {
    mockAuth.mockResolvedValue({ id: 'user-1', email: 'a@b.com' });
    const { POST } = await import('@/app/api/assistant/route');
    const res = await POST(
      postReq({ context: 'ejecucion', messages: [{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hola' }] }] }),
    );
    expect(res.status).toBe(200);
  });
});
