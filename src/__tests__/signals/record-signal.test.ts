import { describe, expect, it, vi } from 'vitest';

const insertMock = vi.fn();
const valuesMock = vi.fn(() => Promise.resolve());

vi.mock('@/src/lib/db/client', () => ({
  db: { insert: insertMock },
}));

insertMock.mockReturnValue({ values: valuesMock });

describe('recordUserSignal', () => {
  it('inserts a row with the given usuarioId and signal', async () => {
    const { recordUserSignal } = await import('@/src/lib/signals/record-signal');
    await recordUserSignal('user-123', 'oferente');
    expect(valuesMock).toHaveBeenCalledWith({ usuarioId: 'user-123', senal: 'oferente' });
  });

  it('swallows errors instead of throwing', async () => {
    valuesMock.mockRejectedValueOnce(new Error('db down'));
    const { recordUserSignal } = await import('@/src/lib/signals/record-signal');
    await expect(recordUserSignal('user-123', 'comunidad')).resolves.toBeUndefined();
  });

  it('accepts the Fase 1 assistant signals', async () => {
    const { recordUserSignal } = await import('@/src/lib/signals/record-signal');
    await recordUserSignal('user-123', 'ejecutor');
    expect(valuesMock).toHaveBeenCalledWith({ usuarioId: 'user-123', senal: 'ejecutor' });
  });
});
