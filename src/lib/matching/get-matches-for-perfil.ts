/**
 * Prefiltro SQL + matching para un perfil ya resuelto — el mismo insumo que
 * `/mis-coincidencias` necesita (ver docs/plan-arquitectura-roadmap.md §3.2).
 * Un solo sitio que decide el prefiltro y el orden de presentación (PASS
 * antes que WARN antes que UNKNOWN; `FAIL` se descarta).
 */

import { searchProcesosDb } from "@/src/lib/secop/db-search";
import { matchProcesos, type Match } from "./match";
import type { GateStatus } from "@/src/lib/secop/verdict";
import type { OferenteProfile } from "@/src/lib/oferente/types";

const RANK: Record<GateStatus, number> = { PASS: 0, WARN: 1, UNKNOWN: 2, FAIL: 3 };

export async function getMatchesForPerfil(
  perfil: OferenteProfile,
  now: Date = new Date()
): Promise<Match[]> {
  const { items } = await searchProcesosDb({
    apertura: "Abierto",
    soloAgua: true,
    valorMin: perfil.cuantiaObjetivo.minCop,
    orden: "fecha",
    page: 1,
    pageSize: 25,
  });

  return matchProcesos(perfil, items, now)
    .filter((m) => m.verdict.overall !== "FAIL")
    .sort((a, b) => RANK[a.verdict.overall] - RANK[b.verdict.overall]);
}
