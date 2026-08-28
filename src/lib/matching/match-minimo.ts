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
  aggregateGateStatuses,
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

/**
 * Un campo vacío en PerfilMinimo significa "no especificado" (opcional), no
 * "no coincide con nada". sectorialGate/ubicacionGate (compartidas con el
 * perfil completo, donde un array vacío no ocurre por construcción del
 * wizard) tratarían [] como FAIL explícito. Estas constantes sustituyen esa
 * llamada por UNKNOWN cuando el campo está vacío, sin tocar las compuertas.
 */
const SIN_SECTOR: GateResult = {
  status: "UNKNOWN",
  reason: "sector no especificado",
  resolvedBy: "metadata",
  requiredLevel: 0,
};

const SIN_ZONA: GateResult = {
  status: "UNKNOWN",
  reason: "zona no especificada",
  resolvedBy: "metadata",
  requiredLevel: 0,
};

export function matchProcesosMinimo(perfil: PerfilMinimo, procesos: SecopProceso[]): MatchMinimo[] {
  return procesos.map((proceso) => {
    const input = toVerdictInput(proceso);
    const sectorial =
      perfil.sectoresUnspsc.length === 0 ? SIN_SECTOR : sectorialGate(perfil, input);
    const ubicacion =
      perfil.cobertura.departamentos.length === 0 && perfil.cobertura.municipios.length === 0
        ? SIN_ZONA
        : ubicacionGate(perfil, input);
    return {
      proceso,
      gates: { sectorial, ubicacion },
      overall: aggregateGateStatuses([sectorial.status, ubicacion.status]),
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
