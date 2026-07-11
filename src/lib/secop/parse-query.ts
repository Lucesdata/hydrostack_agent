/**
 * Parseo de query params de /api/secop a SecopQuery.
 *
 * Vive fuera de route.ts porque Next.js App Router no permite exports
 * arbitrarios en archivos de ruta (el typegen de build los rechaza), y la
 * función necesita ser importable desde los tests.
 */

import type { SecopQuery, EstadoApertura } from "./types";

export function parseQuery(sp: URLSearchParams): SecopQuery {
  const num = (k: string) => {
    const v = sp.get(k);
    return v != null && v !== "" ? Number(v) : undefined;
  };
  return {
    q: sp.get("q") ?? undefined,
    departamento: sp.get("departamento") ?? undefined,
    estado: sp.get("estado") ?? undefined,
    valorMin: num("valorMin"),
    desde: sp.get("desde") ?? undefined,
    apertura: (["Abierto", "Cerrado"] as const).includes(
      sp.get("apertura") as EstadoApertura,
    )
      ? (sp.get("apertura") as EstadoApertura)
      : undefined,
    orden:
      sp.get("orden") === "valor" ? "valor"
      : sp.get("orden") === "fecha" ? "fecha"
      : undefined,
    soloAgua: sp.get("soloAgua") === "false" ? false : true,
    page: num("page"),
    pageSize: num("pageSize"),
  };
}
