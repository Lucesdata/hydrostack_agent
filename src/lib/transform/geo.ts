/**
 * Normalización de texto geográfico para el crosswalk DANE (D12, 0.2 §2 H2).
 *
 * La fuente da nombres ("Bogotá D.C.", "Distrito Capital de Bogotá"), no códigos
 * DIVIPOLA. Este helper canónica SOLO el formato (minúsculas, sin tildes, sin
 * puntuación, espacios colapsados) para que la búsqueda en `geografia_alias` sea
 * estable. NO resuelve variantes semánticas: que "bogota dc" y "distrito capital
 * de bogota" apunten al mismo DIVIPOLA es trabajo del seed de alias, no de aquí.
 */

import { cleanText, stripAccents } from "./normalize";

/** Texto geográfico canónico para lookup en `geografia_alias`; `null` si vacío/centinela. */
export function normalizeGeoText(value: unknown): string | null {
  const s = cleanText(value);
  if (s === null) return null;
  const norm = stripAccents(s.toLowerCase())
    .replace(/[^a-z0-9\s]/g, " ") // quita puntos, comas, guiones ("d.c." → "d c")
    .replace(/\s+/g, " ")
    .trim();
  return norm || null;
}
