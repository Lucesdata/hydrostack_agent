// src/lib/secop/pliego-status.ts

/**
 * Estado del pliego subido manualmente, por proceso — usado en
 * /mis-coincidencias para mostrar si ya hay un pliego cargado para cada
 * match. No toca matchProcesos/getMatchesForPerfil: es una consulta aparte
 * que el caller mezcla por procesoId.
 *
 * `getPliegoStatusForProcesos` (el SELECT real) no tiene test directo —
 * mismo criterio que `searchProcesosDb` en db-search.ts: solo se testea el
 * mapeo puro `mapPliegoRow`.
 */

import { inArray } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { pliegoProceso } from "@/src/lib/db/schema/pliego";
import { NO_ENCONTRADO, type PliegoExtraction } from "@/src/lib/pliego/schema";

export interface PliegoProcesoRow {
  procesoId: string;
  gateMatematicoPasado: boolean;
  createdAt: Date;
  extraction: PliegoExtraction;
}

export interface PliegoStatus {
  gateMatematicoPasado: boolean;
  createdAt: Date;
  presupuestoOficialCop: number;
  fechaCierre: string | null;
}

export function mapPliegoRow(row: PliegoProcesoRow): PliegoStatus {
  return {
    gateMatematicoPasado: row.gateMatematicoPasado,
    createdAt: row.createdAt,
    presupuestoOficialCop: row.extraction.presupuesto_oficial_cop,
    fechaCierre: row.extraction.fecha_cierre === NO_ENCONTRADO ? null : row.extraction.fecha_cierre,
  };
}

export async function getPliegoStatusForProcesos(
  procesoIds: string[]
): Promise<Map<string, PliegoStatus>> {
  if (procesoIds.length === 0) return new Map();

  const rows = await db
    .select({
      procesoId: pliegoProceso.procesoId,
      gateMatematicoPasado: pliegoProceso.gateMatematicoPasado,
      createdAt: pliegoProceso.createdAt,
      extraction: pliegoProceso.extraction,
    })
    .from(pliegoProceso)
    .where(inArray(pliegoProceso.procesoId, procesoIds));

  const map = new Map<string, PliegoStatus>();
  for (const row of rows) {
    map.set(
      row.procesoId,
      mapPliegoRow({ ...row, extraction: row.extraction as PliegoExtraction })
    );
  }
  return map;
}
