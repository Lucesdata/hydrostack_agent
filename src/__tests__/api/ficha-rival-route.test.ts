import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/src/lib/supabase/get-session-user", () => ({
  getSessionUser: () => mockAuth(),
}));

const mockProceso = vi.fn();
vi.mock("@/src/lib/secop/ficha", () => ({
  procesoPorSlug: (...args: unknown[]) => mockProceso(...args),
}));

const mockHistorial = vi.fn();
vi.mock("@/src/lib/al/consulta/competidor", () => ({
  historialComparable: (...args: unknown[]) => mockHistorial(...args),
}));

import { GET } from "@/app/api/ficha/[id]/rival/[key]/route";

const llamar = (id: string, key: string) =>
  GET(new Request("http://localhost/x"), { params: { id, key: encodeURIComponent(key) } });

const PROCESO = { id: "uuid-1", tipoProyecto: "ptar", departamentoCodigo: "05" };

describe("GET /api/ficha/[id]/rival/[key]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ id: "u1", email: "a@b.co" });
    mockProceso.mockResolvedValue(PROCESO);
  });

  it("400 con un id de proceso o una llave de rival que no tienen forma", async () => {
    expect((await llamar("no-es-un-id", "nit:900")).status).toBe(400);
    expect((await llamar("CO1.REQ.1", "cualquier cosa")).status).toBe(400);
    expect(mockHistorial).not.toHaveBeenCalled();
  });

  it("401 sin sesión, sin consultar la base: el historial pide cuenta", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await llamar("CO1.REQ.1", "nit:900");
    expect(res.status).toBe(401);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(mockProceso).not.toHaveBeenCalled();
  });

  it("200 con el historial recortado al tipo y departamento de la ficha, en caché privada", async () => {
    mockHistorial.mockResolvedValue({ proveedorKey: "nom:obras del norte", participaciones: 3 });
    const res = await llamar("CO1.REQ.1", "nom:obras del norte");

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toMatch(/^private/);
    expect(mockHistorial).toHaveBeenCalledWith("nom:obras del norte", {
      id: "uuid-1",
      tipoProyecto: "ptar",
      departamentoCodigo: "05",
    });
    expect((await res.json()).participaciones).toBe(3);
  });

  it("404 si el proceso no tiene tipo o departamento, o el rival no tiene comparables", async () => {
    mockProceso.mockResolvedValueOnce({ ...PROCESO, tipoProyecto: null });
    expect((await llamar("CO1.REQ.1", "nit:900")).status).toBe(404);

    mockHistorial.mockResolvedValueOnce(null);
    expect((await llamar("CO1.REQ.1", "nit:900")).status).toBe(404);
  });

  it("503 sin caché si la base falla", async () => {
    mockHistorial.mockRejectedValueOnce(new Error("caída"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await llamar("CO1.REQ.1", "nit:900");
    expect(res.status).toBe(503);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    error.mockRestore();
  });
});
