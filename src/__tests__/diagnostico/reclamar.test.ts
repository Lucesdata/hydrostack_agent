import { describe, it, expect, vi, beforeEach } from "vitest";

// next/headers solo existe dentro de un request de Next; se mockea el store de
// cookies para probar el helper aislado.
const cookieGet = vi.fn();
const cookieDelete = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: cookieGet, delete: cookieDelete }),
}));

const mockReclamar = vi.fn();
vi.mock("@/src/lib/diagnostico/diagnostico-store", () => ({
  reclamarDiagnosticos: (...args: unknown[]) => mockReclamar(...args),
}));

import { reclamarDiagnosticoAnonimo } from "@/src/lib/diagnostico/reclamar";
import { DIAGNOSTICO_COOKIE, nuevoSessionToken } from "@/src/lib/diagnostico/session-token";

const TOKEN = nuevoSessionToken();

beforeEach(() => {
  vi.clearAllMocks();
  mockReclamar.mockResolvedValue(1);
});

describe("reclamarDiagnosticoAnonimo", () => {
  it("reclama con el token de la cookie y la borra", async () => {
    cookieGet.mockReturnValue({ value: TOKEN });
    const n = await reclamarDiagnosticoAnonimo("u1");

    expect(n).toBe(1);
    expect(mockReclamar).toHaveBeenCalledWith(TOKEN, "u1");
    // Sin borrarla, en un navegador compartido la siguiente cuenta heredaría
    // el diagnóstico de otra persona.
    expect(cookieDelete).toHaveBeenCalledWith(DIAGNOSTICO_COOKIE);
  });

  it("no hace nada si no hay cookie", async () => {
    cookieGet.mockReturnValue(undefined);
    expect(await reclamarDiagnosticoAnonimo("u1")).toBe(0);
    expect(mockReclamar).not.toHaveBeenCalled();
  });

  it("ignora una cookie manipulada sin consultar la base", async () => {
    cookieGet.mockReturnValue({ value: "' OR 1=1 --" });
    expect(await reclamarDiagnosticoAnonimo("u1")).toBe(0);
    expect(mockReclamar).not.toHaveBeenCalled();
  });

  it("no lanza si la base falla: no puede bloquear un registro", async () => {
    cookieGet.mockReturnValue({ value: TOKEN });
    mockReclamar.mockRejectedValueOnce(new Error("connection refused"));
    await expect(reclamarDiagnosticoAnonimo("u1")).resolves.toBe(0);
  });

  it("no lanza si el contexto no permite borrar cookies", async () => {
    cookieGet.mockReturnValue({ value: TOKEN });
    cookieDelete.mockImplementationOnce(() => {
      throw new Error("Cookies can only be modified in a Server Action");
    });
    // Una cookie que sobreviva es inofensiva: el siguiente reclamo no
    // encuentra filas sin dueño.
    await expect(reclamarDiagnosticoAnonimo("u1")).resolves.toBe(1);
  });
});
