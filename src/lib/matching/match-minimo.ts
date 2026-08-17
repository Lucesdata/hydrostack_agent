/**
 * Matching liviano para PerfilMinimo (sector + zona) — hermano de match.ts
 * pero sin las 3 compuertas que dependen de datos que el perfil mínimo no
 * tiene (cuantía, plazo, habilitación). Reusa sectorialGate/ubicacionGate
 * sin duplicar su lógica (Task 2 las angostó a Pick<OferenteProfile>).
 */

import {
  sectorialGate,
  ubicacionGate,
  toVerdictInput,
  type GateResult,
  type GateStatus,
} from "@/src/lib/secop/verdict";
import type { PerfilMinimo } from "@/src/lib/oferente/perfil-minimo";
import type { SecopProceso } from "@/src/lib/secop/types";

export interface MatchMinimo {
  proceso: SecopProceso;
  gates: { sectorial: GateResult; ubicacion: GateResult };
  overall: GateStatus;
}

const RANK: Record<GateStatus, number> = { PASS: 0, WARN: 1, UNKNOWN: 2, FAIL: 3 };

function worstOf(a: GateStatus, b: GateStatus): GateStatus {
  return RANK[a] >= RANK[b] ? a : b;
}

export function matchProcesosMinimo(perfil: PerfilMinimo, procesos: SecopProceso[]): MatchMinimo[] {
  return procesos.map((proceso) => {
    const input = toVerdictInput(proceso);
    const sectorial = sectorialGate(perfil, input);
    const ubicacion = ubicacionGate(perfil, input);
    return {
      proceso,
      gates: { sectorial, ubicacion },
      overall: worstOf(sectorial.status, ubicacion.status),
    };
  });
}

/** Badge de presentación: qué compuertas dieron PASS. */
export function coincideEnLabel(m: MatchMinimo): string {
  const partes: string[] = [];
  if (m.gates.sectorial.status === "PASS") partes.push("Sector");
  if (m.gates.ubicacion.status === "PASS") partes.push("Zona");
  return partes.length > 0 ? `Coincide en: ${partes.join(" + ")}` : "Posible coincidencia";
}
