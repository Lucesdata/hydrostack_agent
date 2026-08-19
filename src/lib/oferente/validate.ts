/**
 * Validación mínima del shape de `OferenteProfile` recibido por red — usada
 * por `PUT /api/perfil` (guardar) y `POST /api/perfil/preview` (consultar
 * sin guardar). Misma forma exacta que antes vivía duplicada en la route de
 * guardado.
 */
import type { OferenteProfile } from "./types";

export function isValidPerfil(p: unknown): p is OferenteProfile {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    Array.isArray(o.sectoresUnspsc) &&
    !!o.cobertura &&
    !!o.cuantiaObjetivo
  );
}
