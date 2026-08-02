import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSelectLimit = vi.fn();
const mockInsertReturning = vi.fn();

vi.mock('@/src/lib/db/client', () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: mockSelectLimit }) }) }),
    insert: () => ({ values: () => ({ onConflictDoUpdate: () => ({ returning: mockInsertReturning }) }) }),
  },
}));

import { getPreferencias, savePreferencias } from '@/src/lib/alertas/preferencias-store';

describe('getPreferencias', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sin fila guardada, devuelve los valores por defecto', async () => {
    mockSelectLimit.mockResolvedValue([]);
    const r = await getPreferencias('u1');
    expect(r).toEqual({ activo: true, horaEnvio: 7 });
  });

  it('con fila guardada, devuelve activo y horaEnvio de la fila', async () => {
    mockSelectLimit.mockResolvedValue([{ activo: false, horaEnvio: 19 }]);
    const r = await getPreferencias('u1');
    expect(r).toEqual({ activo: false, horaEnvio: 19 });
  });
});

describe('savePreferencias', () => {
  beforeEach(() => vi.clearAllMocks());

  it('hace upsert y devuelve la fila guardada', async () => {
    mockInsertReturning.mockResolvedValue([{ activo: false, horaEnvio: 20 }]);
    const r = await savePreferencias('u1', { activo: false, horaEnvio: 20 });
    expect(r).toEqual({ activo: false, horaEnvio: 20 });
  });
});
