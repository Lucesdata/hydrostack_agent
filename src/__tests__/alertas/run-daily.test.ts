import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Match } from "@/src/lib/matching/match";

const mockSelectResult = vi.fn();
const mockInsertReturning = vi.fn();
const mockUpdateWhere = vi.fn();

vi.mock("@/src/lib/db/client", () => ({
  db: {
    // Fase 6: el barrido pasó de `from(oferentePerfil).innerJoin(usuario)` a
    // `from(usuario).leftJoin(perfil).leftJoin(preferencias).where(...)`, para
    // incluir cuentas que solo tienen filtros.
    select: () => ({
      from: () => ({
        leftJoin: () => ({
          leftJoin: () => ({
            where: () => mockSelectResult(),
          }),
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
vi.mock("@/src/lib/matching/get-matches-for-perfil", () => ({
  getMatchesForPerfil: (p: unknown) => mockGetMatches(p),
}));

const mockRenderDigest = vi.fn();
vi.mock("@/src/lib/al/notificacion/digest-agregado", () => ({
  renderDigestAgregado: (...args: unknown[]) => mockRenderDigest(...args),
}));

const mockNovedades = vi.fn();
vi.mock("@/src/lib/al/notificacion/recopilar", () => ({
  recopilarNovedades: (...args: unknown[]) => mockNovedades(...args),
}));

vi.mock("@/src/lib/al/reportes/generar", () => ({
  generarReporte: async () => ({ id: "rep-1", slug: "digest-x", url: "http://x/reportes/digest-x" }),
  slugDigest: () => "digest-x",
}));

const mockSendDigestEmail = vi.fn();
vi.mock("@/src/lib/email/send", () => ({
  sendDigestEmail: (...args: unknown[]) => mockSendDigestEmail(...args),
}));

import { runDailyAlertas } from "@/src/lib/alertas/run-daily";

const cuenta = (over: Record<string, unknown> = {}) => ({
  usuarioId: "u1",
  email: "a@b.com",
  perfil: { id: "oferente-1", cuantiaObjetivo: { minCop: 0, maxCop: 1_000_000_000 } },
  activo: true,
  ...over,
});

const perfilMinimo = {
  id: "u1",
  sectoresUnspsc: ["83101"],
  cobertura: { departamentos: ["76"], municipios: [] },
};

const matches = [{ proceso: { id: "p1" }, verdict: { overall: "PASS" } }] as unknown as Match[];

describe("runDailyAlertas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateWhere.mockResolvedValue(undefined);
    mockNovedades.mockResolvedValue({ adendas: [], adjudicaciones: [], aperturas: [], total: 0 });
  });

  it("sin cuentas con perfil, no hace nada", async () => {
    mockSelectResult.mockResolvedValue([]);
    const r = await runDailyAlertas();
    expect(r).toEqual({ cuentas: 0, enviados: 0, sinCoincidencias: 0, saltados: 0, errores: 0 });
  });

  it("cuenta dada de baja (activo=false) se salta sin intentar reservar envio_log", async () => {
    mockSelectResult.mockResolvedValue([cuenta({ activo: false })]);
    const r = await runDailyAlertas();
    expect(r.saltados).toBe(1);
    expect(mockInsertReturning).not.toHaveBeenCalled();
  });

  it("cuenta dada de baja con perfil mínimo: se salta sin intentar matching (badge)", async () => {
    mockSelectResult.mockResolvedValue([cuenta({ activo: false, perfil: perfilMinimo })]);
    const r = await runDailyAlertas();
    expect(r.saltados).toBe(1);
    expect(mockGetMatches).not.toHaveBeenCalled();
  });

  it("perfil mínimo sin novedades: sin_coincidencias, no error y sin matching", async () => {
    // Cambió en la Fase 6: un perfil incompleto ya NO descarta la cuenta, porque
    // puede tener filtros y las novedades de un filtro no dependen del perfil de
    // elegibilidad. Sin novedades tampoco se envía correo.
    mockSelectResult.mockResolvedValue([cuenta({ perfil: perfilMinimo })]);
    mockInsertReturning.mockResolvedValue([{ id: "log-1" }]);
    const r = await runDailyAlertas();
    expect(r.sinCoincidencias).toBe(1);
    expect(r.errores).toBe(0);
    expect(mockGetMatches).not.toHaveBeenCalled();
    expect(mockSendDigestEmail).not.toHaveBeenCalled();
  });

  it("perfil mínimo PERO con novedades de filtros: sí envía", async () => {
    // El caso que la Fase 6 desbloquea: una cuenta que solo declaró filtros.
    mockSelectResult.mockResolvedValue([cuenta({ perfil: perfilMinimo })]);
    mockInsertReturning.mockResolvedValue([{ id: "log-1" }]);
    mockNovedades.mockResolvedValue({
      adendas: [{ secopProcesoId: "p9" }],
      adjudicaciones: [],
      aperturas: [],
      total: 1,
    });
    mockRenderDigest.mockReturnValue({ subject: "s", html: "h", text: "t", unsubscribeUrl: "u" });
    mockSendDigestEmail.mockResolvedValue(undefined);

    const r = await runDailyAlertas();
    expect(r.enviados).toBe(1);
    expect(mockGetMatches).not.toHaveBeenCalled();
  });

  it("sin fila de preferencias (activo=null) se trata como activa por defecto", async () => {
    mockSelectResult.mockResolvedValue([cuenta({ activo: null })]);
    mockInsertReturning.mockResolvedValue([]); // ya enviado hoy, simplifica el resto del camino
    const r = await runDailyAlertas();
    expect(r.saltados).toBe(1);
    expect(mockInsertReturning).toHaveBeenCalledTimes(1);
  });

  it("idempotencia: si el insert-first no inserta (ya había envio de hoy), no reenvía", async () => {
    mockSelectResult.mockResolvedValue([cuenta()]);
    mockInsertReturning.mockResolvedValue([]); // onConflictDoNothing sin fila devuelta
    const r = await runDailyAlertas();
    expect(r.saltados).toBe(1);
    expect(mockGetMatches).not.toHaveBeenCalled();
    expect(mockSendDigestEmail).not.toHaveBeenCalled();
  });

  it("sin coincidencias NI novedades → sin_coincidencias, no envía correo vacío", async () => {
    mockSelectResult.mockResolvedValue([cuenta()]);
    mockInsertReturning.mockResolvedValue([{ id: "log-1" }]);
    mockGetMatches.mockResolvedValue([]);
    const r = await runDailyAlertas();
    expect(r.sinCoincidencias).toBe(1);
    expect(mockSendDigestEmail).not.toHaveBeenCalled();
    expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
  });

  it("reserva ok + coincidencias → renderiza, envía y registra enviado", async () => {
    mockSelectResult.mockResolvedValue([cuenta()]);
    mockInsertReturning.mockResolvedValue([{ id: "log-1" }]);
    mockGetMatches.mockResolvedValue(matches);
    const digest = { subject: "s", html: "h", text: "t", unsubscribeUrl: "u" };
    mockRenderDigest.mockReturnValue(digest);
    mockSendDigestEmail.mockResolvedValue(undefined);

    const r = await runDailyAlertas();

    // Un solo correo con todo dentro: novedades + enlace al reporte + perfil.
    expect(mockRenderDigest).toHaveBeenCalledWith(
      expect.objectContaining({ total: 0 }),
      { id: "u1", email: "a@b.com" },
      "http://x/reportes/digest-x",
      matches
    );
    expect(mockSendDigestEmail).toHaveBeenCalledWith("a@b.com", digest);
    expect(r.enviados).toBe(1);
  });

  it("si el envío falla, cuenta como error y sigue sin lanzar", async () => {
    mockSelectResult.mockResolvedValue([cuenta()]);
    mockInsertReturning.mockResolvedValue([{ id: "log-1" }]);
    mockGetMatches.mockResolvedValue(matches);
    mockRenderDigest.mockReturnValue({ subject: "s", html: "h", text: "t", unsubscribeUrl: "u" });
    mockSendDigestEmail.mockRejectedValue(new Error("Resend caído"));

    const r = await runDailyAlertas();
    expect(r.errores).toBe(1);
    expect(r.enviados).toBe(0);
  });

  it("procesa varias cuentas en la misma corrida", async () => {
    mockSelectResult.mockResolvedValue([
      cuenta({ usuarioId: "u1" }),
      cuenta({ usuarioId: "u2", activo: false }),
    ]);
    mockInsertReturning.mockResolvedValue([{ id: "log-1" }]);
    mockGetMatches.mockResolvedValue([]);

    const r = await runDailyAlertas();
    expect(r.cuentas).toBe(2);
    expect(r.sinCoincidencias).toBe(1);
    expect(r.saltados).toBe(1);
  });
});
