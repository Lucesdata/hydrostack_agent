import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EnvioResultado } from '@/src/lib/alertas/enviar-ahora';

// auth() y enviarDigestAhora hacen IO real (sesión, DB, Resend). Se mockean
// para probar SOLO el route: el gate de sesión y el mapeo estado → status HTTP.
const mockAuth = vi.fn();
vi.mock('@/src/lib/auth/config', () => ({ auth: () => mockAuth() }));

const mockEnviar = vi.fn();
vi.mock('@/src/lib/alertas/enviar-ahora', () => ({ enviarDigestAhora: (id: string) => mockEnviar(id) }));

import { POST } from '@/app/api/alertas/enviar-ahora/route';

describe('POST /api/alertas/enviar-ahora', () => {
  beforeEach(() => vi.clearAllMocks());

  it('401 sin sesión', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST();
    expect(res.status).toBe(401);
    expect(mockEnviar).not.toHaveBeenCalled();
  });

  it('200 con estado enviado', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } });
    const resultado: EnvioResultado = { estado: 'enviado', matches: 3 };
    mockEnviar.mockResolvedValue(resultado);
    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(resultado);
    expect(mockEnviar).toHaveBeenCalledWith('u1');
  });

  it('200 con estado sin_coincidencias', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } });
    mockEnviar.mockResolvedValue({ estado: 'sin_coincidencias', matches: 0 });
    const res = await POST();
    expect(res.status).toBe(200);
  });

  it('502 cuando enviarDigestAhora devuelve estado error', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } });
    mockEnviar.mockResolvedValue({ estado: 'error', matches: 0, error: 'boom' });
    const res = await POST();
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe('boom');
  });
});
