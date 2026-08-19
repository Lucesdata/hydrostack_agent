/**
 * Validación del shape de `OferenteProfile` recibido por red — usada
 * por `PUT /api/perfil` (guardar), `POST /api/secop/verdict` (cálculo),
 * y `POST /api/perfil/preview` (consultar sin guardar). Valida estructura
 * completa, no solo existencia, para evitar 500 cuando código downstream
 * desreferencia `perfil.cobertura.departamentos.includes(...)`.
 */
import type { OferenteProfile } from "./types";

export function isValidPerfil(p: unknown): p is OferenteProfile {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  const cobertura = o.cobertura as Record<string, unknown> | null | undefined;
  const cuantia = o.cuantiaObjetivo as Record<string, unknown> | null | undefined;
  return (
    typeof o.id === "string" &&
    Array.isArray(o.sectoresUnspsc) &&
    !!cobertura &&
    Array.isArray(cobertura.departamentos) &&
    Array.isArray(cobertura.municipios) &&
    !!cuantia &&
    Number.isFinite(cuantia.minCop) &&
    Number.isFinite(cuantia.maxCop)
  );
}
