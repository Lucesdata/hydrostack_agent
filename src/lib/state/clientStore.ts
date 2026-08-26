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
  // NO RENOMBRAR. Conserva el prefijo `hydrostack_` a propósito tras el
  // rebrand a AquaLicita (2026-08-26): la clave vive en el navegador del
  // usuario, así que cambiarla borraría en silencio el perfil de todo
  // oferente anónimo que ya completó el wizard, y rompería la migración
  // localStorage → cuenta descrita en docs/plan-arquitectura-roadmap.md.
  // El nombre nunca es visible para el usuario. Blindado por
  // src/__tests__/state/clientStore-keys.test.ts.
  oferentePerfil: "hydrostack_oferente_perfil",
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
