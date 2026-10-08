import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockVerify = vi.fn();
vi.mock("@/src/lib/email/unsubscribe-token", () => ({
  verifyUnsubscribeToken: (t: string) => mockVerify(t),
}));

const mockOnConflictDoUpdate = vi.fn();
vi.mock("@/src/lib/db/client", () => ({
  db: {
    insert: () => ({ values: () => ({ onConflictDoUpdate: mockOnConflictDoUpdate }) }),
  },
}));

import * as route from "@/app/api/alertas/unsubscribe/route";
const { GET } = route;

const req = (token?: string) =>
  new NextRequest(`http://localhost/api/alertas/unsubscribe${token ? `?token=${token}` : ""}`);

describe("GET /api/alertas/unsubscribe", () => {
  beforeEach(() => vi.clearAllMocks());

  it("token inválido: no escribe en DB y responde 200 con mensaje de error", async () => {
    mockVerify.mockReturnValue(null);
    const res = await GET(req("malo"));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("inválido");
    expect(mockOnConflictDoUpdate).not.toHaveBeenCalled();
  });

  it("sin token: mismo camino que inválido", async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("inválido");
  });

  it("GET válido muestra confirmación sin dar de baja al abrirlo un escáner", async () => {
    mockVerify.mockReturnValue("u1");
    mockOnConflictDoUpdate.mockResolvedValue(undefined);
    const res = await GET(req("u1.abc"));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('method="post"');
    expect(mockOnConflictDoUpdate).not.toHaveBeenCalled();
  });
});

describe("POST /api/alertas/unsubscribe", () => {
  beforeEach(() => vi.clearAllMocks());
  it("la baja de un clic válida desactiva las alertas", async () => {
    mockVerify.mockReturnValue("u1");
    expect(typeof route.POST).toBe("function");
    const res = await route.POST(
      new NextRequest("http://localhost/api/alertas/unsubscribe?token=u1.abc", {
        method: "POST",
        body: "List-Unsubscribe=One-Click",
      })
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("ya no recibirás alertas");
    expect(mockOnConflictDoUpdate).toHaveBeenCalledTimes(1);
  });
  it("rechaza un token inválido sin cambiar preferencias", async () => {
    mockVerify.mockReturnValue(null);
    expect(typeof route.POST).toBe("function");
    const res = await route.POST(
      new NextRequest("http://localhost/api/alertas/unsubscribe?token=bad", { method: "POST" })
    );
    expect(res.status).toBe(400);
    expect(mockOnConflictDoUpdate).not.toHaveBeenCalled();
  });
});
