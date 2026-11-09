import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionUser = vi.fn();
const guardarEmpresa = vi.fn();
const obtenerEmpresa = vi.fn();

vi.mock("@/src/lib/supabase/get-session-user", () => ({ getSessionUser: () => getSessionUser() }));
vi.mock("@/src/lib/empresa/servicio", () => ({
  guardarEmpresa: (...a: unknown[]) => guardarEmpresa(...a),
  obtenerEmpresa: (...a: unknown[]) => obtenerEmpresa(...a),
}));

import { guardarEmpresaAction, leerMiEmpresaAction } from "@/src/lib/empresa/actions";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("guardarEmpresaAction", () => {
  it("sin sesión no llega al servicio", async () => {
    getSessionUser.mockResolvedValue(null);
    expect(await guardarEmpresaAction({ razonSocial: "X" })).toEqual({
      ok: false,
      error: "SIN_SESION",
    });
    expect(guardarEmpresa).not.toHaveBeenCalled();
  });

  it("con sesión, el usuario sale de la SESIÓN aunque la entrada traiga otro id", async () => {
    getSessionUser.mockResolvedValue({ id: "u-sesion", email: "a@b.test" });
    guardarEmpresa.mockResolvedValue({ ok: true, creada: true, empresa: {} });
    const entrada = { razonSocial: "X", pais: "DE", usuarioId: "u-ajeno" };
    await guardarEmpresaAction(entrada);
    expect(guardarEmpresa).toHaveBeenCalledTimes(1);
    expect(guardarEmpresa.mock.calls[0][0]).toBe("u-sesion");
  });

  it("propaga los errores de validación tal cual", async () => {
    getSessionUser.mockResolvedValue({ id: "u1", email: "a@b.test" });
    const errores = [{ campo: "pais", codigo: "invalido" }];
    guardarEmpresa.mockResolvedValue({ ok: false, error: "VALIDACION", errores });
    expect(await guardarEmpresaAction({})).toEqual({ ok: false, error: "VALIDACION", errores });
  });
});

describe("leerMiEmpresaAction", () => {
  it("sin sesión no consulta", async () => {
    getSessionUser.mockResolvedValue(null);
    expect(await leerMiEmpresaAction()).toEqual({ ok: false, error: "SIN_SESION" });
    expect(obtenerEmpresa).not.toHaveBeenCalled();
  });

  it("lee solo la empresa del usuario de la sesión", async () => {
    getSessionUser.mockResolvedValue({ id: "u-sesion", email: "a@b.test" });
    obtenerEmpresa.mockResolvedValue(null);
    expect(await leerMiEmpresaAction()).toEqual({ ok: true, empresa: null });
    expect(obtenerEmpresa).toHaveBeenCalledWith("u-sesion");
  });
});
