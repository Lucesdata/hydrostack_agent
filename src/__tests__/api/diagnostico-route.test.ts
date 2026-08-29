import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Auth, DB y señales hacen IO real. Se mockean para probar SOLO el route: la
// validación del body, el gate de sesión, la cookie del anónimo y el modo
// concierge. Mismo patrón que src/__tests__/api/perfil-route.test.ts.
const mockAuth = vi.fn();
vi.mock("@/src/lib/supabase/get-session-user", () => ({
  getSessionUser: () => mockAuth(),
}));

const mockSignal = vi.fn();
vi.mock("@/src/lib/signals/record-signal", () => ({
  recordUserSignal: (...args: unknown[]) => mockSignal(...args),
}));

const mockGuardar = vi.fn();
vi.mock("@/src/lib/diagnostico/diagnostico-store", () => ({
  guardarDiagnostico: (...args: unknown[]) => mockGuardar(...args),
}));

import { POST } from "@/app/api/diagnostico/route";
import { DIAGNOSTICO_COOKIE, nuevoSessionToken } from "@/src/lib/diagnostico/session-token";
import type { RespuestasDiagnostico } from "@/src/lib/diagnostico/types";

const RESPUESTAS: RespuestasDiagnostico = {
  rup: 0,
  unspsc: 0,
  exp: 0,
  fin: 0,
  secop: 0,
  poliza: 0,
  tec: 0,
  pila: 0,
  antec: 0,
  union: 0,
};

const post = (body: unknown, cookie?: string) => {
  const req = new NextRequest("http://localhost/api/diagnostico", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  if (cookie) req.cookies.set(DIAGNOSTICO_COOKIE, cookie);
  return req;
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue(null);
  mockGuardar.mockResolvedValue({ ok: true, id: "d1" });
});

describe("POST /api/diagnostico", () => {
  it("responde el resultado a un anónimo y lo persiste", async () => {
    const res = await POST(post({ respuestas: RESPUESTAS }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.guardado).toBe(true);
    expect(body.diagnosticoId).toBe("d1");
    expect(body.resultado.puntajeTotal).toBe(100);
    expect(body.resultado.banda).toBe("listo");
    expect(mockGuardar).toHaveBeenCalledTimes(1);
  });

  it("emite la cookie httpOnly cuando no hay sesión", async () => {
    const res = await POST(post({ respuestas: RESPUESTAS }));
    const cookie = res.cookies.get(DIAGNOSTICO_COOKIE);

    expect(cookie?.httpOnly).toBe(true);
    expect(mockGuardar.mock.calls[0][0].sessionToken).toBe(cookie?.value);
    expect(mockGuardar.mock.calls[0][0].usuarioId).toBeNull();
  });

  it("reutiliza la cookie existente en vez de emitir otra", async () => {
    const token = nuevoSessionToken();
    const res = await POST(post({ respuestas: RESPUESTAS }, token));

    expect(mockGuardar.mock.calls[0][0].sessionToken).toBe(token);
    expect(res.cookies.get(DIAGNOSTICO_COOKIE)?.value).toBe(token);
  });

  it("descarta una cookie manipulada y emite una nueva", async () => {
    const res = await POST(post({ respuestas: RESPUESTAS }, "' OR 1=1 --"));
    const emitida = res.cookies.get(DIAGNOSTICO_COOKIE)?.value;

    expect(emitida).not.toBe("' OR 1=1 --");
    expect(mockGuardar.mock.calls[0][0].sessionToken).toBe(emitida);
  });

  it("con sesión guarda con usuarioId, sin cookie, y registra la señal", async () => {
    mockAuth.mockResolvedValue({ id: "u1", email: "a@b.com" });
    const res = await POST(post({ respuestas: RESPUESTAS }));

    expect(mockGuardar.mock.calls[0][0].usuarioId).toBe("u1");
    expect(mockGuardar.mock.calls[0][0].sessionToken).toBeNull();
    expect(res.cookies.get(DIAGNOSTICO_COOKIE)).toBeUndefined();
    expect(mockSignal).toHaveBeenCalledWith("u1", "oferente");
  });

  it("400 con respuestas incompletas, fuera de rango o body no-JSON", async () => {
    const { rup, ...incompletas } = RESPUESTAS;
    expect((await POST(post({ respuestas: incompletas }))).status).toBe(400);
    expect((await POST(post({ respuestas: { ...RESPUESTAS, rup: 99 } }))).status).toBe(400);
    expect((await POST(post({}))).status).toBe(400);
    expect((await POST(post("{no json"))).status).toBe(400);
    expect(mockGuardar).not.toHaveBeenCalled();
  });

  it("503 pero con el resultado si la base no está disponible (modo concierge)", async () => {
    mockGuardar.mockResolvedValue({ ok: false, error: "DB_UNAVAILABLE" });
    const res = await POST(post({ respuestas: RESPUESTAS }));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.guardado).toBe(false);
    // Lo importante: el resultado ya calculado no se pierde.
    expect(body.resultado.puntajeTotal).toBe(100);
  });

  it("acepta una variante registrada y guarda con SU versión", async () => {
    const respuestasEsp = { registro: 0, exp: 0, fin: 0, flujo: 0, tec: 0, puerta: 0 };
    const res = await POST(post({ respuestas: respuestasEsp, version: "co-esp-v1" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.resultado.version).toBe("co-esp-v1");
    // Sin escalera: no se inventa un escalón de la Ley 80.
    expect(body.resultado.escalon).toBeNull();
    expect(mockGuardar.mock.calls[0][0].resultado.version).toBe("co-esp-v1");
  });

  it("400 ante una versión desconocida, sin caer al cuestionario vigente", async () => {
    // Un fallback silencioso guardaría respuestas de un cuestionario bajo la
    // versión de otro, y el resultado quedaría ilegible para siempre.
    const res = await POST(post({ respuestas: RESPUESTAS, version: "co-esp-v99" }));
    expect(res.status).toBe(400);
    expect(mockGuardar).not.toHaveBeenCalled();
  });

  it("400 si las respuestas son de otro cuestionario que el declarado", async () => {
    const res = await POST(post({ respuestas: RESPUESTAS, version: "co-esp-v1" }));
    expect(res.status).toBe(400);
    expect(mockGuardar).not.toHaveBeenCalled();
  });

  it("nunca redirige: siempre responde JSON", async () => {
    // Un redirect de middleware rompería este fetch (ver docstring del route).
    mockGuardar.mockResolvedValueOnce({ ok: false, error: "DB_UNAVAILABLE" });
    for (const res of [
      await POST(post({ respuestas: RESPUESTAS })), // camino DB caída
      await POST(post({ respuestas: RESPUESTAS })), // camino feliz
      await POST(post({})), // camino de error de validación
    ]) {
      expect([200, 400, 503]).toContain(res.status);
      expect(res.headers.get("location")).toBeNull();
      expect(res.headers.get("content-type")).toContain("application/json");
    }
  });
});
