/**
 * Prefiltro SQL + matching para un perfil ya resuelto — el mismo insumo que
 * `/mis-coincidencias` necesita (ver docs/plan-arquitectura-roadmap.md §3.2).
 * Un solo sitio que decide el prefiltro y el orden de presentación (PASS
 * antes que WARN antes que UNKNOWN; `FAIL` se descarta).
 *
 * También se descarta lo que está fuera de la cobertura del perfil. Hasta el
 * 2026-09-28 eso era un FAIL de la zona; ahora la zona dice "revisar" en la
 * ficha (la fuente no publica el lugar de ejecución), pero la lista y las
 * alertas siguen tratando la cobertura como filtro, así que se excluye aparte.
 */

import { searchProcesosDb } from "@/src/lib/secop/db-search";
import { matchProcesos, type Match } from "./match";
import { fueraDeCobertura, type GateStatus } from "@/src/lib/secop/verdict";
import type { OferenteProfile } from "@/src/lib/oferente/types";

const RANK: Record<GateStatus, number> = { PASS: 0, WARN: 1, UNKNOWN: 2, FAIL: 3 };

export async function getMatchesForPerfil(
  perfil: OferenteProfile,
  now: Date = new Date()
): Promise<Match[]> {
  const { items } = await searchProcesosDb({
    // Solo lo que recibe ofertas hoy: la misma regla de la portada. Con
    // `apertura: "Abierto"` a secas entraban procesos ya seleccionados y de
    // régimen especial sin fecha, y llegaban por correo (spec 2026-10-05, M7–M9).
    recibeOfertas: true,
    soloAgua: true,
    valorMin: perfil.cuantiaObjetivo.minCop,
    // Los sin presupuesto entran con la cuantía en UNKNOWN, detrás (§43).
    incluirSinValor: true,
    orden: "fecha",
    page: 1,
    pageSize: 25,
  });

  return matchProcesos(perfil, items, now)
    .filter((m) => m.verdict.overall !== "FAIL" && !fueraDeCobertura(m.verdict.gates.ubicacion))
    .sort((a, b) => RANK[a.verdict.overall] - RANK[b.verdict.overall]);
}
