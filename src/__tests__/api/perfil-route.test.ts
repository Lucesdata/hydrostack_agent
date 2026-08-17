import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { OferenteProfile } from "@/src/lib/oferente/types";

// Auth y DB hacen IO real (cookies/Postgres). Se mockean para probar SOLO el
// route: el gate de sesión, la validación del body y el mapeo select/upsert →
// respuesta. Mismo patrón que src/__tests__/api/cron-ingest.test.ts.
const mockAuth = vi.fn();
vi.mock("@/src/lib/supabase/get-session-user", () => ({
  getSessionUser: () => mockAuth(),
}));

const mockLimit = vi.fn();
const mockReturning = vi.fn();
vi.mock("@/src/lib/db/client", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: mockLimit }) }) }),
    insert: () => ({
      values: () => ({ onConflictDoUpdate: () => ({ returning: mockReturning }) }),
    }),
  },
}));

import { GET, PUT } from "@/app/api/perfil/route";

const perfil: OferenteProfile = {
  id: "oferente-1",
  tipoPersona: "juridica",
  sectoresUnspsc: ["83101"],
  capacidadFinanciera: {
    capitalTrabajoCop: 0,
    indiceLiquidez: 0,
    indiceEndeudamiento: 0,
    razonCoberturaIntereses: 0,
    fuente: "manual",
    vigenciaHasta: null,
  },
  kCapacidadResidualCop: null,
  cobertura: { departamentos: ["76"], municipios: ["76001"] },
  cuantiaObjetivo: { minCop: 100_000_000, maxCop: 1_000_000_000 },
};

const putReq = (body: unknown) =>
  new NextRequest("http://localhost/api/perfil", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("GET/PUT /api/perfil", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET devuelve null si la cuenta no tiene perfil aún", async () => {
    mockAuth.mockResolvedValue({ id: "u1", email: "u1@example.com" });
    mockLimit.mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).perfil).toBeNull();
  });

  it("GET devuelve el perfil guardado", async () => {
    mockAuth.mockResolvedValue({ id: "u1", email: "u1@example.com" });
    mockLimit.mockResolvedValue([{ perfil }]);
    const res = await GET();
    const body = await res.json();
    expect(body.perfil.id).toBe("oferente-1");
  });

  it("GET devuelve perfil:null si lo guardado es un PerfilMinimo (sin cuantiaObjetivo)", async () => {
    mockAuth.mockResolvedValue({ id: "u1", email: "u1@example.com" });
    const perfilMinimo = {
      id: "u1",
      sectoresUnspsc: ["83101"],
      cobertura: { departamentos: ["76"], municipios: [] },
    };
    mockLimit.mockResolvedValue([{ perfil: perfilMinimo }]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.perfil).toBeNull();
  });

  it("PUT 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PUT(putReq(perfil));
    expect(res.status).toBe(401);
  });

  it("PUT 400 con JSON inválido", async () => {
    mockAuth.mockResolvedValue({ id: "u1", email: "u1@example.com" });
    const res = await PUT(putReq("no-es-json"));
    expect(res.status).toBe(400);
  });

  it("PUT 400 con perfil inválido", async () => {
    mockAuth.mockResolvedValue({ id: "u1", email: "u1@example.com" });
    const res = await PUT(putReq({ id: "x" }));
    expect(res.status).toBe(400);
  });

  it("PUT hace upsert y devuelve el perfil guardado", async () => {
    mockAuth.mockResolvedValue({ id: "u1", email: "u1@example.com" });
    mockReturning.mockResolvedValue([{ perfil }]);
    const res = await PUT(putReq(perfil));
    expect(res.status).toBe(200);
    expect((await res.json()).perfil.id).toBe("oferente-1");
  });

  it("PUT 503 + eco del perfil si la escritura falla (base inalcanzable — modo concierge)", async () => {
    mockAuth.mockResolvedValue({ id: "u1", email: "u1@example.com" });
    mockReturning.mockRejectedValue(new Error("connection refused"));
    const res = await PUT(putReq(perfil));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("DB_UNAVAILABLE");
    expect(body.perfil.id).toBe("oferente-1");
  });
});
