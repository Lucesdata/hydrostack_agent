/**
 * `sincronizarPerfilConCuenta`: la reconciliación del perfil del navegador con
 * el de la cuenta, que comparten el explorador y el bloque de decisión de la
 * ficha. El caso que importa es el de D1: definir el perfil sin cuenta en la
 * ficha, registrarse para subir el pliego y que el perfil llegue a la cuenta.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getOferentePerfil, sincronizarPerfilConCuenta } from "@/src/lib/state/clientStore";
import type { OferenteProfile } from "@/src/lib/oferente/types";

const CLAVE = "aqualicita_oferente_perfil";
const local = { id: "perfil-local" } as unknown as OferenteProfile;
const remoto = { id: "perfil-cuenta" } as unknown as OferenteProfile;

let store: Map<string, string>;
const fetchMock = vi.fn();

beforeEach(() => {
  store = new Map();
  (globalThis as Record<string, unknown>).window = globalThis;
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).window;
  delete (globalThis as Record<string, unknown>).localStorage;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const respuesta = (status: number, body?: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe("sincronizarPerfilConCuenta", () => {
  it("sin sesión (401) manda el perfil local y no escribe nada", async () => {
    store.set(CLAVE, JSON.stringify(local));
    fetchMock.mockResolvedValueOnce(respuesta(401));
    await expect(sincronizarPerfilConCuenta()).resolves.toEqual({
      perfil: local,
      conCuenta: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sin red manda el perfil local", async () => {
    store.set(CLAVE, JSON.stringify(local));
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await expect(sincronizarPerfilConCuenta()).resolves.toEqual({
      perfil: local,
      conCuenta: false,
    });
  });

  it("la cuenta con perfil es la fuente de verdad y se copia al navegador", async () => {
    store.set(CLAVE, JSON.stringify(local));
    fetchMock.mockResolvedValueOnce(respuesta(200, { perfil: remoto }));
    await expect(sincronizarPerfilConCuenta()).resolves.toEqual({
      perfil: remoto,
      conCuenta: true,
    });
    expect(getOferentePerfil()).toEqual(remoto);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("cuenta nueva sin perfil y perfil local: lo sube una vez con PUT", async () => {
    store.set(CLAVE, JSON.stringify(local));
    fetchMock
      .mockResolvedValueOnce(respuesta(200, { perfil: null }))
      .mockResolvedValueOnce(respuesta(200, {}));
    await expect(sincronizarPerfilConCuenta()).resolves.toEqual({
      perfil: local,
      conCuenta: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("/api/perfil");
    expect(init).toMatchObject({ method: "PUT", body: JSON.stringify(local) });
  });

  it("cuenta sin perfil y sin perfil local: no sube nada", async () => {
    fetchMock.mockResolvedValueOnce(respuesta(200, { perfil: null }));
    await expect(sincronizarPerfilConCuenta()).resolves.toEqual({
      perfil: null,
      conCuenta: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
