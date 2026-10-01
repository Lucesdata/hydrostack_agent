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

/**
 * Reconciliar el perfil del navegador con el de la cuenta, si hay sesión.
 *
 * - Sin red o sin sesión (`GET /api/perfil` falla o da 401): manda el local.
 * - La cuenta ya tiene perfil: es la fuente de verdad y se copia al navegador.
 * - Cuenta sin perfil y hay uno local (un anónimo que acaba de registrarse):
 *   se sube una vez con `PUT /api/perfil`.
 *
 * Lo usan el explorador y el bloque de decisión de la ficha. Antes vivía solo
 * en el explorador, así que quien definía su perfil en la ficha sin cuenta y se
 * registraba para subir el pliego volvía a la ficha sin perfil en la cuenta
 * (D1 del spec `2026-09-28-ficha-bloque-decision.md`).
 */
export async function sincronizarPerfilConCuenta(): Promise<{
  perfil: OferenteProfile | null;
  conCuenta: boolean;
}> {
  const local = getOferentePerfil();

  let res: Response;
  try {
    res = await fetch("/api/perfil");
  } catch (err) {
    console.warn("perfil: no se pudo consultar la cuenta; se usa el perfil local", err);
    return { perfil: local, conCuenta: false };
  }
  if (!res.ok) return { perfil: local, conCuenta: false };

  const { perfil: remoto } = (await res.json()) as { perfil: OferenteProfile | null };
  if (remoto) {
    saveOferentePerfil(remoto);
    return { perfil: remoto, conCuenta: true };
  }
  if (local) {
    try {
      await fetch("/api/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(local),
      });
    } catch (err) {
      // La próxima visita lo reintenta: la cuenta sigue sin perfil y el local sigue ahí.
      console.warn("perfil: no se pudo subir el perfil local a la cuenta", err);
    }
  }
  return { perfil: local, conCuenta: true };
}
