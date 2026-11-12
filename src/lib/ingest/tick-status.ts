/** Resultado observable del despachador diario, sin dependencias de Next.js. */
import type { RunOutput } from "./pipeline";

export function ingestaTruncada(result: RunOutput | null): boolean {
  if (!result) return false;
  return [result.procesos?.keyset, result.contratos?.keyset, result.contratos?.sweep].some(
    (run) => run?.reachedMaxPages === true
  );
}

/** HTTP 200 significa todas las etapas completas. */
export function resumenTick(etapas: readonly { ok: boolean }[], partial: boolean) {
  const ok = etapas.length > 0 && etapas.every((etapa) => etapa.ok) && !partial;
  return { ok, status: ok ? 200 : 500 };
}
