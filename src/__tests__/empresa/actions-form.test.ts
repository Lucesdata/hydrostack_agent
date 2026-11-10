import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionUser = vi.fn();
const guardarEmpresa = vi.fn();
const obtenerEmpresa = vi.fn();

vi.mock("@/src/lib/supabase/get-session-user", () => ({ getSessionUser: () => getSessionUser() }));
vi.mock("@/src/lib/empresa/servicio", () => ({
  guardarEmpresa: (...a: unknown[]) => guardarEmpresa(...a),
  obtenerEmpresa: (...a: unknown[]) => obtenerEmpresa(...a),
}));
// redirect/notFound lanzan en Next: se imita para capturar el destino.
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

import { guardarEmpresaFormAction } from "@/src/lib/empresa/actions";

function fd(pares: [string, string][]): FormData {
  const f = new FormData();
  for (const [k, v] of pares) f.append(k, v);
  return f;
}
const valido = fd([
  ["razonSocial", "Acme"],
  ["pais", "DE"],
  ["rol", "importador"],
  ["usuarioId", "otro-usuario"],
]);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CI_COMERCIAL_HABILITADO = "1";
  obtenerEmpresa.mockResolvedValue(null);
});

describe("guardarEmpresaFormAction", () => {
  it("con la bandera apagada responde 404 y no toca nada", async () => {
    delete process.env.CI_COMERCIAL_HABILITADO;
    await expect(guardarEmpresaFormAction(valido)).rejects.toThrow("NOT_FOUND");
    expect(getSessionUser).not.toHaveBeenCalled();
    expect(guardarEmpresa).not.toHaveBeenCalled();
  });

  it("sin sesión redirige al login y no guarda", async () => {
    getSessionUser.mockResolvedValue(null);
    await expect(guardarEmpresaFormAction(valido)).rejects.toThrow(
      "REDIRECT:/login?next=/comercial/perfil"
    );
    expect(guardarEmpresa).not.toHaveBeenCalled();
  });

  it("guarda con el usuario de la SESIÓN (no el del formulario) y redirige a ?ok=1", async () => {
    getSessionUser.mockResolvedValue({ id: "u-sesion", email: "a@b.test" });
    guardarEmpresa.mockResolvedValue({ ok: true, creada: true, empresa: {} });
    await expect(guardarEmpresaFormAction(valido)).rejects.toThrow(
      "REDIRECT:/comercial/perfil?ok=1"
    );
    expect(guardarEmpresa).toHaveBeenCalledTimes(1);
    const [usuarioId, entrada] = guardarEmpresa.mock.calls[0];
    expect(usuarioId).toBe("u-sesion");
    expect(entrada).toMatchObject({ razonSocial: "Acme", pais: "DE", roles: ["importador"] });
    expect(JSON.stringify(entrada)).not.toContain("otro-usuario");
  });

  it("pasa el perfil existente al parser para conservar especificaciones y municipios", async () => {
    getSessionUser.mockResolvedValue({ id: "u1", email: "a@b.test" });
    const existente = {
      capacidades: [],
      cobertura: [{ divipola: "05001", estadoDato: "declarado" }],
    };
    obtenerEmpresa.mockResolvedValue(existente);
    guardarEmpresa.mockResolvedValue({ ok: true, creada: false, empresa: {} });
    await expect(guardarEmpresaFormAction(valido)).rejects.toThrow(
      "REDIRECT:/comercial/perfil?ok=1"
    );
    expect(obtenerEmpresa).toHaveBeenCalledWith("u1");
    expect(guardarEmpresa.mock.calls[0][1].cobertura).toEqual(["05001"]);
  });

  it("con errores de validación redirige con los campos, sin duplicados", async () => {
    getSessionUser.mockResolvedValue({ id: "u1", email: "a@b.test" });
    guardarEmpresa.mockResolvedValue({
      ok: false,
      error: "VALIDACION",
      errores: [
        { campo: "pais", codigo: "invalido" },
        { campo: "capacidades", codigo: "precio_no_permitido" },
        { campo: "capacidades", codigo: "nodo_desconocido" },
      ],
    });
    await expect(guardarEmpresaFormAction(valido)).rejects.toThrow(
      "REDIRECT:/comercial/perfil?error=pais%2Ccapacidades"
    );
  });
});
