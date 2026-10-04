import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockEncaje = vi.fn();
vi.mock("@/src/lib/secop/encaje-vitrina", async (importar) => ({
  ...(await importar<typeof import("@/src/lib/secop/encaje-vitrina")>()),
  encajeDeProcesos: (...a: unknown[]) => mockEncaje(...a),
}));
vi.mock("@/src/lib/db/client", () => ({ db: {} }));

import { POST } from "@/app/api/vitrina/encaje/route";

const perfil = {
  id: "oferente-local",
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

function pedir(body: unknown) {
  return new NextRequest("http://localhost/api/vitrina/encaje", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  mockEncaje.mockReset();
});

describe("POST /api/vitrina/encaje", () => {
  it("devuelve el encaje, sin caché", async () => {
    mockEncaje.mockResolvedValue({
      "CO1.REQ.1": { cumple: 4, noCumple: 0, total: 5, overall: "UNKNOWN" },
    });
    const res = await POST(pedir({ ids: ["CO1.REQ.1"], perfil }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect((await res.json()).encaje["CO1.REQ.1"].cumple).toBe(4);
  });

  it("400 con JSON roto, ids inválidos o perfil inválido, sin calcular nada", async () => {
    expect((await POST(pedir("{"))).status).toBe(400);
    expect((await POST(pedir({ ids: [], perfil }))).status).toBe(400);
    expect((await POST(pedir({ ids: ["CO1.REQ.1"], perfil: { id: "x" } }))).status).toBe(400);
    expect(mockEncaje).not.toHaveBeenCalled();
  });

  it("502 si la base falla", async () => {
    mockEncaje.mockImplementation(async () => {
      throw new Error("caída");
    });
    expect((await POST(pedir({ ids: ["CO1.REQ.1"], perfil }))).status).toBe(502);
  });
});
