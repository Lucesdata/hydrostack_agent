import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("@/src/lib/supabase/get-session-user", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/src/lib/mis-procesos/store", () => ({
  guardarProceso: vi.fn(),
  quitarProceso: vi.fn(),
  registrarVisita: vi.fn(),
  borrarRecientes: vi.fn(),
  listarMisProcesos: vi.fn(),
  estadoGuardados: vi.fn(),
}));
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import * as store from "@/src/lib/mis-procesos/store";
import { GET } from "@/app/api/mis-procesos/route";
import { PUT, DELETE } from "@/app/api/mis-procesos/guardados/[id]/route";
import { ProcesoNoDisponibleError } from "@/src/lib/mis-procesos/validacion";
const req = (origin = "http://localhost:3000") =>
  new NextRequest("http://localhost:3000/api/mis-procesos/guardados/CO1.REQ.42", {
    method: "PUT",
    headers: { origin },
    body: JSON.stringify({ usuarioId: "victima" }),
  });
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getSessionUser).mockResolvedValue({ id: "cuenta-a", email: "a@test.co" });
});
describe("API privada de procesos", () => {
  it("anónimo devuelve401 y no consulta datos", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const r = await GET(new NextRequest("http://localhost:3000/api/mis-procesos"));
    expect(r.status).toBe(401);
    expect(store.listarMisProcesos).not.toHaveBeenCalled();
    expect(r.headers.get("cache-control")).toBe("private, no-store");
  });
  it("guardar usa sesión, nunca la cuenta enviada", async () => {
    const r = await PUT(req(), { params: { id: "CO1.REQ.42" } });
    expect(r.status).toBe(200);
    expect(store.guardarProceso).toHaveBeenCalledWith({ usuarioId: "cuenta-a" }, "CO1.REQ.42");
  });
  it("rechaza origen externo e identificador inválido", async () => {
    expect((await PUT(req("https://externo.test"), { params: { id: "CO1.REQ.42" } })).status).toBe(
      403
    );
    expect((await PUT(req(), { params: { id: "referencia" } })).status).toBe(400);
    expect(store.guardarProceso).not.toHaveBeenCalled();
  });
  it("quitar es idempotente y privado", async () => {
    const r = await DELETE(req(), { params: { id: "CO1.REQ.42" } });
    expect(await r.json()).toEqual({ guardado: false });
    expect(r.headers.get("cache-control")).toBe("private, no-store");
  });
  it("un proceso no disponible responde404, una base caída503 sin detalle", async () => {
    vi.mocked(store.guardarProceso).mockRejectedValueOnce(
      new ProcesoNoDisponibleError("No disponible")
    );
    expect((await PUT(req(), { params: { id: "CO1.REQ.42" } })).status).toBe(404);
    vi.mocked(store.guardarProceso).mockRejectedValueOnce(new Error("credencial interna"));
    const r = await PUT(req(), { params: { id: "CO1.REQ.42" } });
    expect(r.status).toBe(503);
    expect(JSON.stringify(await r.json())).not.toContain("credencial");
  });
  it("lista por sesión y valida paginación y lote de ids", async () => {
    vi.mocked(store.listarMisProcesos).mockResolvedValue({
      guardados: [],
      recientes: [],
      pagina: 2,
      totalGuardados: 0,
    });
    expect(
      (
        await GET(
          new NextRequest("http://localhost:3000/api/mis-procesos?page=2&usuarioId=victima")
        )
      ).status
    ).toBe(200);
    expect(store.listarMisProcesos).toHaveBeenCalledWith("cuenta-a", 2);
    expect(
      (await GET(new NextRequest("http://localhost:3000/api/mis-procesos?page=-1"))).status
    ).toBe(400);
  });
});
