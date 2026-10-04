import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockAutorizar = vi.fn();
vi.mock("@/src/lib/al/filtros/guard", () => ({
  autorizar: (...a: unknown[]) => mockAutorizar(...a),
}));

const mockSeguir = vi.fn();
const mockDejar = vi.fn();
const mockSeguidos = vi.fn();
vi.mock("@/src/lib/seguir/store", async (importar) => ({
  ...(await importar<typeof import("@/src/lib/seguir/store")>()),
  seguir: (...a: unknown[]) => mockSeguir(...a),
  dejarDeSeguir: (...a: unknown[]) => mockDejar(...a),
  seguidos: (...a: unknown[]) => mockSeguidos(...a),
}));
vi.mock("@/src/lib/db/client", () => ({ db: {} }));

import { DELETE, GET, POST } from "@/app/api/seguir/route";

const AUTH = { accountId: "cuenta-1", usuarioId: "u-1" };

function pedir(metodo: string, body?: unknown, tipo = "application/json") {
  return new NextRequest("http://localhost/api/seguir", {
    method: metodo,
    headers: { "content-type": tipo },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  mockAutorizar.mockReset();
  mockSeguir.mockReset();
  mockDejar.mockReset();
  mockSeguidos.mockReset();
});

describe("/api/seguir", () => {
  it("sin sesión responde 401 y no toca nada", async () => {
    mockAutorizar.mockResolvedValue(null);
    expect((await POST(pedir("POST", { procesoId: "CO1.REQ.1" }))).status).toBe(401);
    expect((await DELETE(pedir("DELETE", { procesoId: "CO1.REQ.1" }))).status).toBe(401);
    expect((await GET(new NextRequest("http://localhost/api/seguir?ids=CO1.REQ.1"))).status).toBe(
      401
    );
    expect(mockSeguir).not.toHaveBeenCalled();
    expect(mockDejar).not.toHaveBeenCalled();
    expect(mockAutorizar).toHaveBeenCalledWith("seguir");
  });

  it("sigue con la cuenta de la sesión, no con una del cuerpo", async () => {
    mockAutorizar.mockResolvedValue(AUTH);
    mockSeguir.mockResolvedValue("siguiendo");
    const res = await POST(pedir("POST", { procesoId: "CO1.REQ.1", accountId: "otra" }));
    expect(res.status).toBe(201);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(mockSeguir).toHaveBeenCalledWith("cuenta-1", "u-1", "CO1.REQ.1");
  });

  it("ya lo seguía: 200; no existe: 404", async () => {
    mockAutorizar.mockResolvedValue(AUTH);
    mockSeguir.mockResolvedValueOnce("ya-lo-seguia").mockResolvedValueOnce("no-existe");
    expect((await POST(pedir("POST", { procesoId: "CO1.REQ.1" }))).status).toBe(200);
    expect((await POST(pedir("POST", { procesoId: "CO1.REQ.9" }))).status).toBe(404);
  });

  it("las escrituras exigen JSON y un id con forma de id", async () => {
    mockAutorizar.mockResolvedValue(AUTH);
    expect((await POST(pedir("POST", '{"procesoId":"CO1.REQ.1"}', "text/plain"))).status).toBe(415);
    expect((await POST(pedir("POST", "{"))).status).toBe(400);
    expect((await POST(pedir("POST", { procesoId: "x' or 1=1" }))).status).toBe(400);
    expect(mockSeguir).not.toHaveBeenCalled();
  });

  it("dejar de seguir devuelve qué pasó", async () => {
    mockAutorizar.mockResolvedValue(AUTH);
    mockDejar.mockResolvedValue("no-era-manual");
    const res = await DELETE(pedir("DELETE", { procesoId: "CO1.REQ.2" }));
    expect(await res.json()).toEqual({ estado: "no-era-manual" });
    expect(mockDejar).toHaveBeenCalledWith("cuenta-1", "CO1.REQ.2");
  });

  it("GET lee los ids de la query y los valida", async () => {
    mockAutorizar.mockResolvedValue(AUTH);
    mockSeguidos.mockResolvedValue({ "CO1.REQ.1": { siguiendo: true, manual: true } });
    const ok = await GET(new NextRequest("http://localhost/api/seguir?ids=CO1.REQ.1,CO1.REQ.2"));
    expect(ok.status).toBe(200);
    expect(mockSeguidos).toHaveBeenCalledWith("cuenta-1", ["CO1.REQ.1", "CO1.REQ.2"]);
    expect((await GET(new NextRequest("http://localhost/api/seguir"))).status).toBe(400);
  });
});
