/**
 * clientStore — the single module for all browser-persisted session state.
 *
 * Before this file, session state was scattered:
 *   - HydroAgent.jsx  → direct localStorage.getItem/setItem/removeItem calls
 *   - owner-state.js  → a separate owner-state persistence module
 *   - SepticTankCalculator.jsx → wrote the form state key directly
 *
 * Every localStorage access for session state now goes through this typed API,
 * so there is one place to reason about what is persisted and how.
 *
 * Reactivity is intentionally left to React's useState in the components —
 * this module only owns persistence, not a pub/sub layer.
 */

import type { Country } from "../config/normativeRegistry";
import { detectCountryFromText } from "../config/normativeRegistry";

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export type UserProfile = "owner" | "professional" | "contractor" | "exploring";

export type OwnerPhase = "initial" | "explanation" | "orientation" | "detail";

export type Subscenario =
  | "installation"
  | "active_failure"
  | "preventive"
  | "abandoned";

export interface OwnerState {
  phase: OwnerPhase | null;
  subscenario: Subscenario | null;
  explanationOffered: boolean;
  country: Country | null;
  occupants: number | null;
  systemAge: number | null;
  lastUpdated: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Storage keys & low-level helpers
// ─────────────────────────────────────────────────────────────────────────

const KEYS = {
  profile: "hydrostack_profile",
  ownerState: "hydrostack_ownerstate",
  formState: "hydrostack_formstate",
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
// User profile
// ─────────────────────────────────────────────────────────────────────────

const VALID_PROFILES: UserProfile[] = [
  "owner",
  "professional",
  "contractor",
  "exploring",
];

export function getProfile(): UserProfile | null {
  const raw = readRaw(KEYS.profile);
  return raw && VALID_PROFILES.includes(raw as UserProfile)
    ? (raw as UserProfile)
    : null;
}

export function setProfile(profile: UserProfile): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEYS.profile, profile);
  } catch {
    /* non-fatal */
  }
}

export function clearProfile(): void {
  remove(KEYS.profile);
}

// ─────────────────────────────────────────────────────────────────────────
// Owner state
// ─────────────────────────────────────────────────────────────────────────

export function emptyOwnerState(): OwnerState {
  return {
    phase: null,
    subscenario: null,
    explanationOffered: false,
    country: null,
    occupants: null,
    systemAge: null,
    lastUpdated: new Date().toISOString(),
  };
}

export function getOwnerState(): OwnerState | null {
  return readJSON<OwnerState>(KEYS.ownerState);
}

export function saveOwnerState(state: Partial<OwnerState>): void {
  writeJSON(KEYS.ownerState, {
    ...state,
    lastUpdated: new Date().toISOString(),
  });
}

export function clearOwnerState(): void {
  remove(KEYS.ownerState);
}

/**
 * Derive owner-state updates from an agent reply.
 * Detects phase transitions, country and occupant count from the text.
 */
export function updateOwnerStateFromResponse(
  currentState: OwnerState | Record<string, unknown>,
  agentContent: string,
): OwnerState {
  const base: OwnerState = {
    ...emptyOwnerState(),
    ...(currentState as Partial<OwnerState>),
  };
  if (!agentContent || typeof agentContent !== "string") {
    return base;
  }

  const updated: OwnerState = { ...base };
  const content = agentContent.toLowerCase();

  // Phase transitions inferred from agent reply keywords
  if (
    content.includes("cómo funcionan") ||
    (content.includes("how") && content.includes("work")) ||
    (content.includes("explor") && content.includes("system"))
  ) {
    if (!updated.explanationOffered) {
      updated.phase = "explanation";
      updated.explanationOffered = true;
    }
  }

  if (
    content.includes("próximos pasos") ||
    content.includes("next step") ||
    content.includes("orientación")
  ) {
    updated.phase = "orientation";
  }

  if (
    content.includes("detalle") ||
    content.includes("detalles") ||
    (content.includes("deep") && content.includes("dive")) ||
    content.includes("específico")
  ) {
    updated.phase = "detail";
  }

  // Country via the shared normative registry (single keyword source)
  const detectedCountry = detectCountryFromText(content);
  if (detectedCountry && detectedCountry !== "other") {
    updated.country = detectedCountry;
  }

  // Occupant count
  const occupantMatch = content.match(
    /(\d+)\s*(?:personas?|people|habitantes?|occupants?)/i,
  );
  if (occupantMatch) {
    updated.occupants = parseInt(occupantMatch[1], 10);
  }

  return updated;
}

// ─────────────────────────────────────────────────────────────────────────
// Calculator form state (written by SepticTankCalculator, read by HydroAgent)
// ─────────────────────────────────────────────────────────────────────────

export function getFormState<T = unknown>(): T | null {
  return readJSON<T>(KEYS.formState);
}

export function saveFormState(formState: unknown): void {
  writeJSON(KEYS.formState, formState);
}
