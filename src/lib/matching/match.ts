/**
 * Matching (Fase 1.2) — perfil de oferente × página de procesos ya prefiltrada
 * en SQL (`searchProcesosDb`). Módulo puro: reusa el mismo motor de veredicto
 * Nivel 0 que ya corre on-demand en `/api/secop/verdict` (`buildVerdict`), sin
 * duplicar lógica de compuertas. Cero SQL nuevo — el caller decide el prefiltro.
 *
 * Deliberadamente NO filtra ni ordena: es una proyección total (un `Match` por
 * cada proceso de entrada, mismo orden). Filtrar por `overall` o descartar
 * `FAIL` es una decisión de presentación, no del núcleo — vive en el caller
 * (la página `/mis-coincidencias`).
 */

import { buildVerdict, toVerdictInput, type Verdict } from "@/src/lib/secop/verdict";
import type { OferenteProfile } from "@/src/lib/oferente/types";
import type { SecopProceso } from "@/src/lib/secop/types";

export interface Match {
  proceso: SecopProceso;
  verdict: Verdict;
}

export function matchProcesos(
  perfil: OferenteProfile,
  procesos: SecopProceso[],
  now: Date = new Date()
): Match[] {
  return procesos.map((proceso) => ({
    proceso,
    verdict: buildVerdict(perfil, toVerdictInput(proceso), now),
  }));
}
