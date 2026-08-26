/**
 * clientStore — browser-persisted client-side state for the SECOP product.
 *
 * Every localStorage access for session state goes through this typed API,
 * so there is one place to reason about what is persisted and how.
 *
 * Reactivity is intentionally left to React's useState in the components —
 * this module only owns persistence, not a pub/sub layer.
 */

import type { OferenteProfile } from "../oferente/types";

// ─────────────────────────────────────────────────────────────────────────
// Storage keys & low-level helpers
// ─────────────────────────────────────────────────────────────────────────

const KEYS = {
  // Licitaciones: perfil de oferente del mini-wizard (Fase 2, un solo perfil
  // por navegador, sin cuenta). Reemplaza a OFERENTE_PILOTO hardcodeado.
  //
  // Renombrada en el rebrand a AquaLicita (2026-08-26) sin código de
  // migración, a propósito: en ese momento existía un único perfil de prueba
  // y escribir un puente para leer la clave vieja habría sido código nacido
  // muerto. Esa ventana ya se cerró — de aquí en adelante la clave vive en el
  // navegador de gente real, así que renombrarla exige migrar primero. Ver
  // src/__tests__/state/clientStore-keys.test.ts.
  oferentePerfil: "aqualicita_oferente_perfil",
} as const;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readRaw(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readJSON<T>(key: string): T | null {
  const raw = readRaw(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* localStorage full or disabled — non-fatal */
  }
}

function remove(key: string): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* non-fatal */
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Licitaciones — perfil de oferente (Fase 2: elegibilidad diferida)
// ─────────────────────────────────────────────────────────────────────────

export function getOferentePerfil(): OferenteProfile | null {
  return readJSON<OferenteProfile>(KEYS.oferentePerfil);
}

export function saveOferentePerfil(perfil: OferenteProfile): void {
  writeJSON(KEYS.oferentePerfil, perfil);
}

export function clearOferentePerfil(): void {
  remove(KEYS.oferentePerfil);
}
