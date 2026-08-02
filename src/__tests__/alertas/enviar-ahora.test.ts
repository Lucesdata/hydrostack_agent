import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { OferenteProfile } from '@/src/lib/oferente/types';
import type { Match } from '@/src/lib/matching/match';

const mockSelectLimit = vi.fn();
const mockOnConflictDoUpdate = vi.fn();
vi.mock('@/src/lib/db/client', () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: mockSelectLimit }) }) }),
    insert: () => ({ values: () => ({ onConflictDoUpdate: mockOnConflictDoUpdate }) }),
  },
}));

const mockGetPerfilDb = vi.fn();
vi.mock('@/src/lib/oferente/perfil-store', () => ({ getPerfilDb: (id: string) => mockGetPerfilDb(id) }));

const mockGetMatches = vi.fn();
vi.mock('@/src/lib/matching/get-matches-for-perfil', () => ({
  getMatchesForPerfil: (p: unknown) => mockGetMatches(p),
}));

const mockRenderDigest = vi.fn();
vi.mock('@/src/lib/email/digest', () => ({
  renderDigest: (...args: unknown[]) => mockRenderDigest(...args),
}));

const mockSendDigestEmail = vi.fn();
vi.mock('@/src/lib/email/send', () => ({
  sendDigestEmail: (...args: unknown[]) => mockSendDigestEmail(...args),
}));

import { enviarDigestAhora } from '@/src/lib/alertas/enviar-ahora';

const perfil = { id: 'oferente-1' } as OferenteProfile;
const matches = [{ proceso: { id: 'p1' } }, { proceso: { id: 'p2' } }] as unknown as Match[];

describe('enviarDigestAhora', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnConflictDoUpdate.mockResolvedValue(undefined);
  });

  it('sin perfil de oferente → error, sin tocar matching ni DB', async () => {
    mockGetPerfilDb.mockResolvedValue(null);
    const r = await enviarDigestAhora('u1');
    expect(r).toEqual({ estado: 'error', matches: 0, error: expect.stringContaining('perfil') });
    expect(mockGetMatches).not.toHaveBeenCalled();
  });

  it('usuario no encontrado en DB → error', async () => {
    mockGetPerfilDb.mockResolvedValue(perfil);
    mockSelectLimit.mockResolvedValue([]);
    const r = await enviarDigestAhora('u1');
    expect(r.estado).toBe('error');
    expect(mockGetMatches).not.toHaveBeenCalled();
  });

  it('sin coincidencias → registra envio_log y no envía correo', async () => {
    mockGetPerfilDb.mockResolvedValue(perfil);
    mockSelectLimit.mockResolvedValue([{ id: 'u1', email: 'a@b.com' }]);
    mockGetMatches.mockResolvedValue([]);
    const r = await enviarDigestAhora('u1');
    expect(r).toEqual({ estado: 'sin_coincidencias', matches: 0 });
    expect(mockSendDigestEmail).not.toHaveBeenCalled();
    expect(mockOnConflictDoUpdate).toHaveBeenCalledTimes(1);
  });

  it('con coincidencias → renderiza, envía y registra enviado', async () => {
    mockGetPerfilDb.mockResolvedValue(perfil);
    mockSelectLimit.mockResolvedValue([{ id: 'u1', email: 'a@b.com' }]);
    mockGetMatches.mockResolvedValue(matches);
    const digest = { subject: 's', html: 'h', text: 't', unsubscribeUrl: 'u' };
    mockRenderDigest.mockReturnValue(digest);
    mockSendDigestEmail.mockResolvedValue(undefined);

    const r = await enviarDigestAhora('u1');

    expect(mockRenderDigest).toHaveBeenCalledWith(matches, { id: 'u1', email: 'a@b.com' });
    expect(mockSendDigestEmail).toHaveBeenCalledWith('a@b.com', digest);
    expect(r).toEqual({ estado: 'enviado', matches: 2 });
    expect(mockOnConflictDoUpdate).toHaveBeenCalledTimes(1);
  });

  it('si el envío falla, registra error y lo reporta sin lanzar', async () => {
    mockGetPerfilDb.mockResolvedValue(perfil);
    mockSelectLimit.mockResolvedValue([{ id: 'u1', email: 'a@b.com' }]);
    mockGetMatches.mockResolvedValue(matches);
    mockRenderDigest.mockReturnValue({ subject: 's', html: 'h', text: 't', unsubscribeUrl: 'u' });
    mockSendDigestEmail.mockRejectedValue(new Error('Resend caído'));

    const r = await enviarDigestAhora('u1');

    expect(r).toEqual({ estado: 'error', matches: 2, error: 'Resend caído' });
    expect(mockOnConflictDoUpdate).toHaveBeenCalledTimes(1);
  });
});
