/**
 * Parseo de query params de /api/secop a SecopQuery.
 *
 * Vive fuera de route.ts porque Next.js App Router no permite exports
 * arbitrarios en archivos de ruta (el typegen de build los rechaza), y la
 * función necesita ser importable desde los tests.
 */

import type { SecopQuery, EstadoApertura } from "./types";
import { SECTOR_KEYS, type SectorKey } from "./sectorKeywords";

export function parseQuery(sp: URLSearchParams): SecopQuery {
  const num = (k: string) => {
    const v = sp.get(k);
    return v != null && v !== "" ? Number(v) : undefined;
  };
  const apertura = sp.get("apertura") as EstadoApertura | null;
  const orden = sp.get("orden");
  const sector = sp.get("sector");
  return {
    q: sp.get("q") ?? undefined,
    departamento: sp.get("departamento") ?? undefined,
    estado: sp.get("estado") ?? undefined,
    valorMin: num("valorMin"),
    desde: sp.get("desde") ?? undefined,
    apertura:
      apertura !== null && (["Abierto", "Cerrado"] as const).includes(apertura)
        ? apertura
        : undefined,
    orden: orden === "valor" || orden === "fecha" ? orden : undefined,
    soloAgua: sp.get("soloAgua") === "false" ? false : true,
    sector: sector !== null && (SECTOR_KEYS as string[]).includes(sector) ? (sector as SectorKey) : undefined,
    page: num("page"),
    pageSize: num("pageSize"),
  };
}
