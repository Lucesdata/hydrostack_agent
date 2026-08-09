// src/__tests__/assistants/conversations.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

const selectMock = vi.fn();
const insertValuesMock = vi.fn();
const onConflictMock = vi.fn();
const returningMock = vi.fn();

vi.mock('@/src/lib/db/client', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: selectMock,
          orderBy: selectMock,
        }),
      }),
    }),
    insert: () => ({
      values: (v: unknown) => {
        insertValuesMock(v);
        return { onConflictDoNothing: onConflictMock };
      },
    }),
  },
}));

onConflictMock.mockReturnValue({ returning: returningMock });

describe('getOrCreateConversation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the existing conversation id without inserting', async () => {
    selectMock.mockResolvedValueOnce([{ id: 'conv-1' }]);
    const { getOrCreateConversation } = await import('@/src/lib/assistants/conversations');
    const id = await getOrCreateConversation('user-1', 'ejecucion');
    expect(id).toBe('conv-1');
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it('creates a new conversation when none exists', async () => {
    selectMock.mockResolvedValueOnce([]);
    returningMock.mockResolvedValueOnce([{ id: 'conv-2' }]);
    const { getOrCreateConversation } = await import('@/src/lib/assistants/conversations');
    const id = await getOrCreateConversation('user-1', 'operacion');
    expect(id).toBe('conv-2');
    expect(insertValuesMock).toHaveBeenCalledWith({ usuarioId: 'user-1', contexto: 'operacion' });
  });
});

describe('loadMessages', () => {
  beforeEach(() => vi.clearAllMocks());

  it('parses stored JSON content back into UIMessage objects', async () => {
    const stored = { id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hola' }] };
    selectMock.mockResolvedValueOnce([{ contenido: JSON.stringify(stored) }]);
    const { loadMessages } = await import('@/src/lib/assistants/conversations');
    const messages = await loadMessages('conv-1');
    expect(messages).toEqual([stored]);
  });
});
