import { describe, it, expect, vi } from "vitest";

// `vi.hoisted` y no un `const` simple: el factory de `vi.mock` se hoistea por
// encima de los imports — ver el mismo patrón en src/__tests__/landing/cifras.test.ts.
const { getProcesosVigilados } = vi.hoisted(() => ({ getProcesosVigilados: vi.fn() }));
vi.mock("@/src/lib/landing/cifras", () => ({ getProcesosVigilados }));

import { GET } from "@/app/api/landing-stats/route";

describe("GET /api/landing-stats", () => {
  it("sirve solo la cifra que lee la portada, en `sector.procesosVigilados`", async () => {
    getProcesosVigilados.mockResolvedValue(90076);

    const body = await (await GET()).json();

    expect(body).toEqual({ sector: { procesosVigilados: 90076 } });
  });

  it("si la base falla, responde 200 con la cifra en null", async () => {
    getProcesosVigilados.mockRejectedValue(new Error("base caída"));

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sector: { procesosVigilados: null } });
  });
});
