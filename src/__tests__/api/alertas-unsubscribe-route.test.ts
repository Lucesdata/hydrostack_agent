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

import { GET } from "@/app/api/alertas/unsubscribe/route";

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

  it("token válido: hace upsert de alerta_preferencias y confirma la baja", async () => {
    mockVerify.mockReturnValue("u1");
    mockOnConflictDoUpdate.mockResolvedValue(undefined);
    const res = await GET(req("u1.abc"));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("ya no recibirás alertas");
    expect(mockOnConflictDoUpdate).toHaveBeenCalledTimes(1);
  });
});
