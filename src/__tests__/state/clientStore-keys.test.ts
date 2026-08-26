/**
 * Blindaje de las claves de localStorage del clientStore.
 *
 * Estas claves viven en el navegador del usuario, no en el repo: renombrarlas
 * no es un refactor, es una migración de datos. Tras el rebrand HydroStack →
 * AquaLicita (2026-08-26) el prefijo `hydrostack_` se conservó a propósito —
 * cambiarlo borraría en silencio el perfil de todo oferente anónimo que ya
 * completó el mini-wizard y rompería la migración localStorage → cuenta
 * (docs/plan-arquitectura-roadmap.md).
 *
 * Si este test falla, la pregunta no es "¿cómo lo arreglo?" sino "¿escribí el
 * código de migración que lee la clave vieja antes de dejar de usarla?".
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  saveOferentePerfil,
  getOferentePerfil,
  clearOferentePerfil,
} from "@/src/lib/state/clientStore";
import type { OferenteProfile } from "@/src/lib/oferente/types";

const CLAVE_PERFIL_OFERENTE = "hydrostack_oferente_perfil";

const perfil = { id: "oferente-blindaje" } as unknown as OferenteProfile;

// El entorno de vitest es `node`: montamos un localStorage mínimo para que
// isBrowser() sea true y podamos observar con qué clave escribe el store.
let store: Map<string, string>;

beforeEach(() => {
  store = new Map();
  (globalThis as Record<string, unknown>).window = globalThis;
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).window;
  delete (globalThis as Record<string, unknown>).localStorage;
});

describe("clientStore — claves de localStorage congeladas", () => {
  it("escribe el perfil de oferente bajo la clave heredada", () => {
    saveOferentePerfil(perfil);
    expect([...store.keys()]).toEqual([CLAVE_PERFIL_OFERENTE]);
  });

  it("lee el perfil escrito previamente bajo la clave heredada", () => {
    store.set(CLAVE_PERFIL_OFERENTE, JSON.stringify(perfil));
    expect(getOferentePerfil()).toEqual(perfil);
  });

  it("borra exactamente la clave heredada", () => {
    store.set(CLAVE_PERFIL_OFERENTE, JSON.stringify(perfil));
    clearOferentePerfil();
    expect(store.has(CLAVE_PERFIL_OFERENTE)).toBe(false);
  });
});
