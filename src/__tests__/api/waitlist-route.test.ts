// src/__tests__/api/waitlist-route.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockAuth = vi.fn();
vi.mock('@/src/lib/supabase/get-session-user', () => ({
  getSessionUser: () => mockAuth(),
}));

const mockRecordSignal = vi.fn();
vi.mock('@/src/lib/signals/record-signal', () => ({
  recordUserSignal: (...args: unknown[]) => mockRecordSignal(...args),
}));

const onConflictMock = vi.fn();
vi.mock('@/src/lib/db/client', () => ({
  db: {
    insert: () => ({ values: () => ({ onConflictDoNothing: onConflictMock }) }),
  },
}));

describe('POST /api/mercado/waitlist', () => {
  beforeEach(() => vi.clearAllMocks());

  it('401 sin sesión', async () => {
    mockAuth.mockResolvedValue(null);
    const { POST } = await import('@/app/api/mercado/waitlist/route');
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it('guarda el interés y registra la señal proveedor', async () => {
    mockAuth.mockResolvedValue({ id: 'user-1', email: 'a@b.com' });
    onConflictMock.mockResolvedValue(undefined);
    const { POST } = await import('@/app/api/mercado/waitlist/route');
    const res = await POST();
    expect(res.status).toBe(200);
    expect(mockRecordSignal).toHaveBeenCalledWith('user-1', 'proveedor');
  });
});
