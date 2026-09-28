/**
 * Prefiltro SQL + matching liviano para PerfilMinimo — hermano de
 * get-matches-for-perfil.ts. A diferencia de ese, NO pasa `valorMin` a
 * searchProcesosDb (PerfilMinimo no tiene cuantiaObjetivo) y usa
 * matchProcesosMinimo en vez de matchProcesos. Como ese, excluye aparte lo que
 * está fuera de la cobertura: la zona ya no es FAIL (2026-09-28).
 */

import { searchProcesosDb } from "@/src/lib/secop/db-search";
import { matchProcesosMinimo, type MatchMinimo } from "./match-minimo";
import { fueraDeCobertura, type GateStatus } from "@/src/lib/secop/verdict";
import type { PerfilMinimo } from "@/src/lib/oferente/perfil-minimo";

const RANK: Record<GateStatus, number> = { PASS: 0, WARN: 1, UNKNOWN: 2, FAIL: 3 };

export async function getMatchesForPerfilMinimo(perfil: PerfilMinimo): Promise<MatchMinimo[]> {
  const { items } = await searchProcesosDb({
    apertura: "Abierto",
    soloAgua: true,
    orden: "fecha",
    page: 1,
    pageSize: 25,
  });

  return matchProcesosMinimo(perfil, items)
    .filter((m) => m.overall !== "FAIL" && !fueraDeCobertura(m.gates.ubicacion))
    .sort((a, b) => RANK[a.overall] - RANK[b.overall]);
}
