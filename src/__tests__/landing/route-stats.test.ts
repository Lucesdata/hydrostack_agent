import { describe, it, expect, vi } from "vitest";

vi.mock("@/src/lib/secop/landingStats", () => ({
  getNuevos7d: vi.fn().mockResolvedValue(12),
  getEnJuegoMes: vi.fn().mockResolvedValue({ totalCop: 5_000_000, procesos: 3 }),
  getDestacado: vi.fn().mockResolvedValue(null),
}));

// `getCifrasSector` vive en un `vi.hoisted` en vez de un `const` simple:
// con vitest@4.1.6, referenciar una variable de módulo dentro del factory
// de `vi.mock` (que se hoistea por encima de los imports) revienta con
// "Cannot access before initialization" — ver el mismo patrón en
// src/__tests__/landing/cifras.test.ts.
const { getCifrasSector } = vi.hoisted(() => ({ getCifrasSector: vi.fn() }));
vi.mock("@/src/lib/landing/cifras", () => ({ getCifrasSector }));

import { GET } from "@/app/api/landing-stats/route";

describe("GET /api/landing-stats", () => {
  it("añade el bloque sector sin alterar el contrato existente", async () => {
    getCifrasSector.mockResolvedValue({
      procesosVigilados: 90076,
      oferentesHistoricos: 27035,
      sanciones: 2114,
    });

    const body = await (await GET()).json();

    expect(body.sector).toEqual({
      procesosVigilados: 90076,
      oferentesHistoricos: 27035,
      sanciones: 2114,
    });
    expect(body.nuevos7d).toBe(12);
    expect(body.enJuego).toEqual({ totalCop: 5_000_000, procesos: 3 });
    expect(body).toHaveProperty("destacado");
  });

  it("si las cifras del sector fallan, el resto de la respuesta sigue sirviendo", async () => {
    getCifrasSector.mockRejectedValue(new Error("base caída"));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.nuevos7d).toBe(12);
    expect(body.sector).toEqual({
      procesosVigilados: null,
      oferentesHistoricos: null,
      sanciones: null,
    });
  });
});
