import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Match } from '@/src/lib/matching/match';

const mockSelectResult = vi.fn();
const mockInsertReturning = vi.fn();
const mockUpdateWhere = vi.fn();

vi.mock('@/src/lib/db/client', () => ({
  db: {
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          leftJoin: () => mockSelectResult(),
        }),
      }),
    }),
    insert: () => ({
      values: () => ({
        onConflictDoNothing: () => ({ returning: mockInsertReturning }),
      }),
    }),
    update: () => ({
      set: () => ({ where: mockUpdateWhere }),
    }),
  },
}));

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

import { runDailyAlertas } from '@/src/lib/alertas/run-daily';

const cuenta = (over: Record<string, unknown> = {}) => ({
  usuarioId: 'u1',
  email: 'a@b.com',
  perfil: { id: 'oferente-1' },
  activo: true,
  ...over,
});

const matches = [{ proceso: { id: 'p1' } }] as unknown as Match[];

describe('runDailyAlertas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateWhere.mockResolvedValue(undefined);
  });

  it('sin cuentas con perfil, no hace nada', async () => {
    mockSelectResult.mockResolvedValue([]);
    const r = await runDailyAlertas();
    expect(r).toEqual({ cuentas: 0, enviados: 0, sinCoincidencias: 0, saltados: 0, errores: 0 });
  });

  it('cuenta dada de baja (activo=false) se salta sin intentar reservar envio_log', async () => {
    mockSelectResult.mockResolvedValue([cuenta({ activo: false })]);
    const r = await runDailyAlertas();
    expect(r.saltados).toBe(1);
    expect(mockInsertReturning).not.toHaveBeenCalled();
  });

  it('sin fila de preferencias (activo=null) se trata como activa por defecto', async () => {
    mockSelectResult.mockResolvedValue([cuenta({ activo: null })]);
    mockInsertReturning.mockResolvedValue([]); // ya enviado hoy, simplifica el resto del camino
    const r = await runDailyAlertas();
    expect(r.saltados).toBe(1);
    expect(mockInsertReturning).toHaveBeenCalledTimes(1);
  });

  it('idempotencia: si el insert-first no inserta (ya había envio de hoy), no reenvía', async () => {
    mockSelectResult.mockResolvedValue([cuenta()]);
    mockInsertReturning.mockResolvedValue([]); // onConflictDoNothing sin fila devuelta
    const r = await runDailyAlertas();
    expect(r.saltados).toBe(1);
    expect(mockGetMatches).not.toHaveBeenCalled();
    expect(mockSendDigestEmail).not.toHaveBeenCalled();
  });

  it('reserva ok + sin coincidencias → registra sin_coincidencias, no envía correo', async () => {
    mockSelectResult.mockResolvedValue([cuenta()]);
    mockInsertReturning.mockResolvedValue([{ id: 'log-1' }]);
    mockGetMatches.mockResolvedValue([]);
    const r = await runDailyAlertas();
    expect(r.sinCoincidencias).toBe(1);
    expect(mockSendDigestEmail).not.toHaveBeenCalled();
    expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
  });

  it('reserva ok + coincidencias → renderiza, envía y registra enviado', async () => {
    mockSelectResult.mockResolvedValue([cuenta()]);
    mockInsertReturning.mockResolvedValue([{ id: 'log-1' }]);
    mockGetMatches.mockResolvedValue(matches);
    const digest = { subject: 's', html: 'h', text: 't', unsubscribeUrl: 'u' };
    mockRenderDigest.mockReturnValue(digest);
    mockSendDigestEmail.mockResolvedValue(undefined);

    const r = await runDailyAlertas();

    expect(mockRenderDigest).toHaveBeenCalledWith(matches, { id: 'u1', email: 'a@b.com' });
    expect(mockSendDigestEmail).toHaveBeenCalledWith('a@b.com', digest);
    expect(r.enviados).toBe(1);
  });

  it('si el envío falla, cuenta como error y sigue sin lanzar', async () => {
    mockSelectResult.mockResolvedValue([cuenta()]);
    mockInsertReturning.mockResolvedValue([{ id: 'log-1' }]);
    mockGetMatches.mockResolvedValue(matches);
    mockRenderDigest.mockReturnValue({ subject: 's', html: 'h', text: 't', unsubscribeUrl: 'u' });
    mockSendDigestEmail.mockRejectedValue(new Error('Resend caído'));

    const r = await runDailyAlertas();
    expect(r.errores).toBe(1);
    expect(r.enviados).toBe(0);
  });

  it('procesa varias cuentas en la misma corrida', async () => {
    mockSelectResult.mockResolvedValue([cuenta({ usuarioId: 'u1' }), cuenta({ usuarioId: 'u2', activo: false })]);
    mockInsertReturning.mockResolvedValue([{ id: 'log-1' }]);
    mockGetMatches.mockResolvedValue([]);

    const r = await runDailyAlertas();
    expect(r.cuentas).toBe(2);
    expect(r.sinCoincidencias).toBe(1);
    expect(r.saltados).toBe(1);
  });
});
