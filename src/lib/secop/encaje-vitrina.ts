/**
 * El encaje de cada tarjeta de la vitrina con el perfil del oferente:
 * «Cumples 4 de 5». Fase 1b de `docs/superpowers/plans/2026-10-04-vitrina-radar.md`.
 *
 * Mismo motor que la ficha (`buildVerdict` con `toVerdictInput` y los
 * requisitos cacheados del pliego), así que la tarjeta y el bloque de decisión
 * de la ficha dan el mismo conteo. Una consulta para las nueve tarjetas, no
 * nueve llamadas a `/api/secop/verdict`.
 *
 * Devuelve **solo conteos y el estado de cada compuerta**, nunca los `reason`:
 * el estado ya es público (el anónimo ve el semáforo) y la explicación pide
 * cuenta (`verdict-publico.ts`). Sin `reason` no hay nada que redactar.
 *
 * Los procesos se leen de la base por id; el cliente solo manda los ids, no los
 * datos del proceso, para que nadie le haga calcular un veredicto sobre un
 * proceso inventado.
 */

import { inArray } from "drizzle-orm";
import { db } from "../db/client";
import { requisitosProceso } from "../db/schema/eligibility";
import { parseRequisitosEstructurados } from "../eligibility/schema";
import { searchProcesosDb } from "./db-search";
import { buildVerdict, toVerdictInput, type GateStatus, type Verdict } from "./verdict";
import type { RequisitosHabilitantesEstructurados } from "../eligibility/schema";
import type { OferenteProfile } from "../oferente/types";

/** Tope de ids por petición: una página de la vitrina son 9. */
export const MAX_IDS_ENCAJE = 25;

const FORMA_ID = /^[A-Za-z0-9._-]{3,64}$/;

export interface EncajeTarjeta {
  /** Compuertas que cumple (PASS). */
  cumple: number;
  /** Compuertas que no cumple (FAIL). */
  noCumple: number;
  /** Siempre 5; va en la respuesta para que la frase no lo escriba a mano. */
  total: number;
  /** El veredicto agregado, para el color de la línea. */
  overall: GateStatus;
}

/** Ids válidos y sin repetir, o `null` si la petición no tiene forma de serlo. */
export function idsValidos(ids: unknown): string[] | null {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_IDS_ENCAJE) return null;
  if (!ids.every((i) => typeof i === "string" && FORMA_ID.test(i))) return null;
  return [...new Set(ids as string[])];
}

export function resumirVeredicto(v: Verdict): EncajeTarjeta {
  const estados = Object.values(v.gates).map((g) => g.status);
  return {
    cumple: estados.filter((s) => s === "PASS").length,
    noCumple: estados.filter((s) => s === "FAIL").length,
    total: estados.length,
    overall: v.overall,
  };
}

export async function encajeDeProcesos(
  perfil: OferenteProfile,
  ids: string[],
  now: Date = new Date()
): Promise<Record<string, EncajeTarjeta>> {
  const [{ items }, requisitos] = await Promise.all([
    searchProcesosDb({ ids, soloAgua: false, page: 1, pageSize: ids.length }),
    db
      .select({ procesoId: requisitosProceso.procesoId, requisitos: requisitosProceso.requisitos })
      .from(requisitosProceso)
      .where(inArray(requisitosProceso.procesoId, ids)),
  ]);

  const porId = new Map<string, RequisitosHabilitantesEstructurados | null>();
  for (const r of requisitos) {
    try {
      porId.set(r.procesoId, parseRequisitosEstructurados(r.requisitos));
    } catch {
      // Fila cacheada corrupta: como si no hubiera pliego, igual que la ficha.
    }
  }

  return Object.fromEntries(
    items.map((p) => [
      p.id,
      resumirVeredicto(
        buildVerdict(
          perfil,
          toVerdictInput(p, { requisitosHabilitantes: porId.get(p.id) ?? null }),
          now
        )
      ),
    ])
  );
}
