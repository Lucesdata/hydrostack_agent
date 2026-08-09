import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
vi.mock("@/src/lib/supabase/get-session-user", () => ({ getSessionUser: () => mockAuth() }));

const mockGet = vi.fn();
const mockSave = vi.fn();
vi.mock("@/src/lib/alertas/preferencias-store", () => ({
  getPreferencias: (id: string) => mockGet(id),
  savePreferencias: (id: string, p: unknown) => mockSave(id, p),
}));

import { GET, PUT } from "@/app/api/alertas/preferencias/route";

function putReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/alertas/preferencias", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

describe("GET /api/alertas/preferencias", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("200 con las preferencias de la cuenta", async () => {
    mockAuth.mockResolvedValue({ id: "u1", email: "u1@example.com" });
    mockGet.mockResolvedValue({ activo: true, horaEnvio: 7 });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ preferencias: { activo: true, horaEnvio: 7 } });
  });
});

describe("PUT /api/alertas/preferencias", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PUT(putReq({ activo: false, horaEnvio: 8 }));
    expect(res.status).toBe(401);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("400 si horaEnvio está fuera de rango", async () => {
    mockAuth.mockResolvedValue({ id: "u1", email: "u1@example.com" });
    const res = await PUT(putReq({ activo: true, horaEnvio: 24 }));
    expect(res.status).toBe(400);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("400 si falta un campo", async () => {
    mockAuth.mockResolvedValue({ id: "u1", email: "u1@example.com" });
    const res = await PUT(putReq({ activo: true }));
    expect(res.status).toBe(400);
  });

  it("200 y guarda con datos válidos", async () => {
    mockAuth.mockResolvedValue({ id: "u1", email: "u1@example.com" });
    mockSave.mockResolvedValue({ activo: false, horaEnvio: 20 });
    const res = await PUT(putReq({ activo: false, horaEnvio: 20 }));
    expect(res.status).toBe(200);
    expect(mockSave).toHaveBeenCalledWith("u1", { activo: false, horaEnvio: 20 });
    expect(await res.json()).toEqual({ preferencias: { activo: false, horaEnvio: 20 } });
  });
});
