import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockExchange = vi.fn();
vi.mock("@/src/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { exchangeCodeForSession: mockExchange } }),
}));

const mockSync = vi.fn();
vi.mock("@/src/lib/supabase/sync-usuario", () => ({
  syncUsuario: (...args: unknown[]) => mockSync(...args),
}));

const mockReclamar = vi.fn();
vi.mock("@/src/lib/diagnostico/reclamar", () => ({
  reclamarDiagnosticoAnonimo: (...args: unknown[]) => mockReclamar(...args),
}));

import { GET } from "@/app/auth/callback/route";

const req = (url: string) => new NextRequest(url);

beforeEach(() => {
  vi.clearAllMocks();
  mockReclamar.mockResolvedValue(1);
});

describe("GET /auth/callback", () => {
  it("tras crear la sesión, reclama el diagnóstico anónimo", async () => {
    mockExchange.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const res = await GET(req("http://localhost/auth/callback?code=abc&next=/diagnostico"));

    expect(mockSync).toHaveBeenCalled();
    expect(mockReclamar).toHaveBeenCalledWith("u1");
    expect(res.headers.get("location")).toBe("http://localhost/diagnostico");
  });

  it("no reclama nada si el intercambio falla", async () => {
    mockExchange.mockResolvedValue({ data: {}, error: new Error("bad code") });
    const res = await GET(req("http://localhost/auth/callback?code=abc"));

    expect(mockReclamar).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toContain("/login?error=oauth_error");
  });
});
