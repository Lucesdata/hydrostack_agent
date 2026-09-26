import { describe, expect, it, vi } from "vitest";

const { resumenDepartamento } = vi.hoisted(() => ({ resumenDepartamento: vi.fn() }));
vi.mock("@/src/lib/secop/resumen-departamento", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/lib/secop/resumen-departamento")>()),
  resumenDepartamento,
}));

import { GET } from "@/app/api/departamento/[dpto]/resumen/route";

const pedir = (dpto: string) => GET(new Request("http://x"), { params: { dpto } });

describe("GET /api/departamento/[dpto]/resumen", () => {
  it("rechaza un código que no es de departamento sin tocar la base", async () => {
    const res = await pedir("abc");
    expect(res.status).toBe(400);
    expect(resumenDepartamento).not.toHaveBeenCalled();
  });

  it("devuelve el resumen con caché de CDN", async () => {
    resumenDepartamento.mockResolvedValue({ destacados: [], semanas: [1, 2] });
    const res = await pedir("05");
    expect(res.status).toBe(200);
    expect(resumenDepartamento).toHaveBeenCalledWith("05");
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=21600");
    expect(await res.json()).toEqual({ destacados: [], semanas: [1, 2] });
  });

  it("si la base falla, 503 y sin caché", async () => {
    resumenDepartamento.mockRejectedValue(new Error("base caída"));
    const res = await pedir("05");
    expect(res.status).toBe(503);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
