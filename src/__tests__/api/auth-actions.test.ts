import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Los dos caminos de sesión que NO pasan por /auth/callback: alta con
 * contraseña y login normal. Eran los únicos enganches del reclamo sin
 * ninguna prueba, y son dos de los tres.
 */

// `redirect` de Next corta la ejecución lanzando; se imita para que el flujo
// del action se detenga igual que en producción.
class RedirectError extends Error {
  constructor(public destino: string) {
    super(`REDIRECT ${destino}`);
  }
}
const mockRedirect = vi.fn((destino: string) => {
  throw new RedirectError(destino);
});
vi.mock("next/navigation", () => ({ redirect: (d: string) => mockRedirect(d) }));

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockReset = vi.fn();
const mockUpdateUser = vi.fn();
const mockGetUser = vi.fn();
const mockSignOut = vi.fn();
vi.mock("@/src/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      signInWithPassword: mockSignIn,
      signUp: mockSignUp,
      resetPasswordForEmail: mockReset,
      updateUser: mockUpdateUser,
      getUser: mockGetUser,
      signOut: mockSignOut,
    },
  }),
}));

// Cookie de recuperación simulada: `hayCookie` decide si el jar la tiene.
let hayCookie = true;
const mockDelete = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (n: string) => (hayCookie && n === "aq_recuperacion" ? { value: "1" } : undefined),
    delete: (n: string) => mockDelete(n),
  }),
}));

const mockSync = vi.fn();
vi.mock("@/src/lib/supabase/sync-usuario", () => ({
  syncUsuario: (...a: unknown[]) => mockSync(...a),
}));

const mockReclamar = vi.fn();
vi.mock("@/src/lib/diagnostico/reclamar", () => ({
  reclamarDiagnosticoAnonimo: (...a: unknown[]) => mockReclamar(...a),
}));

import {
  requestPasswordResetAction,
  signInWithPasswordAction,
  signUpAction,
  updatePasswordAction,
} from "@/src/lib/supabase/actions";

const form = (campos: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) fd.set(k, v);
  return fd;
};
/** Ejecuta el action y devuelve a dónde redirigió. */
const correr = async (fn: () => Promise<void>) => {
  try {
    await fn();
    return null;
  } catch (e) {
    if (e instanceof RedirectError) return e.destino;
    throw e;
  }
};

beforeEach(() => {
  vi.clearAllMocks();
  hayCookie = true;
});

describe("signInWithPasswordAction", () => {
  it("tras entrar, reclama el diagnóstico anónimo", async () => {
    mockSignIn.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const destino = await correr(() =>
      signInWithPasswordAction(
        form({ email: "a@b.com", password: "12345678", next: "/diagnostico" })
      )
    );

    expect(mockSync).toHaveBeenCalled();
    expect(mockReclamar).toHaveBeenCalledWith("u1");
    expect(destino).toBe("/diagnostico");
  });

  it("con credenciales malas no reclama nada", async () => {
    mockSignIn.mockResolvedValue({ data: {}, error: { message: "Invalid login credentials" } });
    const destino = await correr(() =>
      signInWithPasswordAction(form({ email: "a@b.com", password: "malaclave" }))
    );

    expect(mockReclamar).not.toHaveBeenCalled();
    expect(destino).toContain("error=invalid_credentials");
  });
});

describe("signUpAction", () => {
  it("si el alta abre sesión de una vez, reclama y entra", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "u2" }, session: { access_token: "t" } },
      error: null,
    });
    const destino = await correr(() =>
      signUpAction(
        form({ fullName: "Ana", email: "a@b.com", password: "12345678", next: "/diagnostico" })
      )
    );

    expect(mockReclamar).toHaveBeenCalledWith("u2");
    expect(destino).toBe("/diagnostico");
  });

  it("si hay que verificar el correo NO reclama todavía", async () => {
    // Supabase devuelve `user` pero `session: null` cuando la confirmación por
    // correo está activa. Reclamar aquí borraría la cookie del anónimo y su
    // resultado desaparecería del navegador hasta que verificara: el reclamo
    // le toca a /auth/callback, que es por donde vuelve tras confirmar.
    mockSignUp.mockResolvedValue({ data: { user: { id: "u3" }, session: null }, error: null });
    const destino = await correr(() =>
      signUpAction(form({ fullName: "Ana", email: "a@b.com", password: "12345678" }))
    );

    expect(mockSync).toHaveBeenCalled();
    expect(mockReclamar).not.toHaveBeenCalled();
    expect(destino).toContain("notice=check_email");
  });

  it("manda el correo de confirmación de vuelta a /auth/callback", async () => {
    // Sin esto el enlace vuelve al Site URL de Supabase, el callback no corre
    // y el diagnóstico de ese usuario no se reclama nunca — el camino de
    // Google sí fijaba su redirect, y esa asimetría era el agujero.
    mockSignUp.mockResolvedValue({ data: { user: { id: "u4" }, session: null }, error: null });
    await correr(() =>
      signUpAction(form({ email: "a@b.com", password: "12345678", next: "/diagnostico" }))
    );

    const opciones = mockSignUp.mock.calls[0][0].options;
    expect(opciones.emailRedirectTo).toContain("/auth/callback");
    expect(opciones.emailRedirectTo).toContain("next=%2Fdiagnostico");
  });

  it("con contraseña corta no llega ni a Supabase", async () => {
    const destino = await correr(() => signUpAction(form({ email: "a@b.com", password: "123" })));
    expect(mockSignUp).not.toHaveBeenCalled();
    expect(mockReclamar).not.toHaveBeenCalled();
    expect(destino).toContain("error=weak_password");
  });

  it("si el correo ya existe no reclama nada", async () => {
    mockSignUp.mockResolvedValue({ data: {}, error: { message: "User already registered" } });
    const destino = await correr(() =>
      signUpAction(form({ email: "a@b.com", password: "12345678" }))
    );
    expect(mockReclamar).not.toHaveBeenCalled();
    expect(destino).toContain("error=email_exists");
  });
});

describe("requestPasswordResetAction", () => {
  it("responde lo mismo exista o no la cuenta", async () => {
    mockReset.mockResolvedValue({ error: null });
    const ok = await correr(() => requestPasswordResetAction(form({ email: "a@b.com" })));
    mockReset.mockResolvedValue({ error: { message: "User not found" } });
    const noExiste = await correr(() => requestPasswordResetAction(form({ email: "x@y.com" })));

    expect(ok).toContain("notice=reset_sent");
    expect(noExiste).toBe(ok);
  });

  it("pide el enlace de vuelta por /auth/callback hacia /restablecer", async () => {
    mockReset.mockResolvedValue({ error: null });
    await correr(() =>
      requestPasswordResetAction(form({ email: "a@b.com", next: "/mis-procesos" }))
    );

    const opts = mockReset.mock.calls[0][1];
    expect(opts.redirectTo).toContain("/auth/callback?next=");
    // El callback decodifica una vez: lo que recibe como `next` es
    // `/restablecer?next=%2Fmis-procesos`, y la página lee `next=/mis-procesos`.
    const next = new URL(opts.redirectTo).searchParams.get("next");
    expect(next).toBe("/restablecer?next=%2Fmis-procesos");
    expect(new URL(next!, "https://aqualicita.com").searchParams.get("next")).toBe("/mis-procesos");
  });

  it("el límite de un correo por minuto se muestra aparte", async () => {
    mockReset.mockResolvedValue({
      error: { message: "For security purposes, you can only request this after 57 seconds." },
    });
    const destino = await correr(() => requestPasswordResetAction(form({ email: "a@b.com" })));
    expect(destino).toContain("error=rate_limit");
  });

  it("sin correo no llama a Supabase", async () => {
    const destino = await correr(() => requestPasswordResetAction(form({ email: "  " })));
    expect(mockReset).not.toHaveBeenCalled();
    expect(destino).toContain("error=email_required");
  });

  it("un next externo no se respeta (open redirect)", async () => {
    mockReset.mockResolvedValue({ error: null });
    const destino = await correr(() =>
      requestPasswordResetAction(form({ email: "a@b.com", next: "//evil.com" }))
    );
    expect(destino).toContain("next=%2F&");
  });
});

describe("updatePasswordAction", () => {
  const datos = { password: "claveNueva1", confirmar: "claveNueva1", next: "/" };

  it("sin la cookie del enlace no cambia nada, aunque haya sesión", async () => {
    hayCookie = false;
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const destino = await correr(() => updatePasswordAction(form(datos)));

    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(destino).toContain("error=link_invalid");
  });

  it("sin sesión no cambia nada, aunque haya cookie", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const destino = await correr(() => updatePasswordAction(form(datos)));

    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(destino).toContain("error=link_invalid");
  });

  it("rechaza una contraseña corta o que no coincide", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const corta = await correr(() =>
      updatePasswordAction(form({ ...datos, password: "corta", confirmar: "corta" }))
    );
    const distinta = await correr(() =>
      updatePasswordAction(form({ ...datos, confirmar: "otraClave99" }))
    );

    expect(corta).toContain("error=weak_password");
    expect(distinta).toContain("error=password_mismatch");
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("cambia la contraseña, borra la cookie y cierra las otras sesiones", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockUpdateUser.mockResolvedValue({ error: null });
    const destino = await correr(() => updatePasswordAction(form(datos)));

    expect(mockUpdateUser).toHaveBeenCalledWith({ password: "claveNueva1" });
    expect(mockDelete).toHaveBeenCalledWith("aq_recuperacion");
    expect(mockSignOut).toHaveBeenCalledWith({ scope: "others" });
    expect(destino).toContain("notice=password_updated");
  });

  it("la misma contraseña de antes tiene mensaje propio", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockUpdateUser.mockResolvedValue({
      error: { message: "New password should be different from the old password." },
    });
    const destino = await correr(() => updatePasswordAction(form(datos)));

    expect(destino).toContain("error=same_password");
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
