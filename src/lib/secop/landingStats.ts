/**
 * ──────────────────────────────────────────────────────────────────────────
 *  "$ en juego este mes" en vivo (SECOP II, sector agua/saneamiento)
 * ──────────────────────────────────────────────────────────────────────────
 *
 *  Nació con tres agregaciones para las tarjetas de la portada antigua
 *  (`/api/landing-stats`). Esas tarjetas ya no existen y el 2026-09-27 se
 *  retiraron `getNuevos7d` y `getDestacado`; queda `getEnJuegoMes`, que lee
 *  /mis-coincidencias. Es un solo $select de suma/conteo contra Socrata —
 *  nunca se traen filas completas para agregar en JS. Reusa sodaFetch/buildAguaWhere de client.ts
 *  (mismo fetch, mismo app token, mismo manejo de errores) en vez de
 *  duplicarlos.
 *
 *  Best-effort: cada función atrapa sus propios errores y devuelve null en
 *  vez de lanzar, igual que countProcesos en client.ts. El caller (route
 *  handler) decide cómo degrada la UI.
 * ──────────────────────────────────────────────────────────────────────────
 */

import { sodaFetch, buildAguaWhere } from "./client";
import { resolveDatasetId } from "./datasetResolver";
import { FIELDS_PROCESOS, REVALIDATE_SEARCH } from "./config";

const F = FIELDS_PROCESOS;

/** Año/mes calendario en hora Bogotá para el corte de "mes actual". */
function bogotaYearMonth(now: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  return {
    year: Number(parts.find((p) => p.type === "year")?.value),
    month: Number(parts.find((p) => p.type === "month")?.value),
  };
}

/** Primer día del mes actual (hora Bogotá), como floating timestamp SoQL. */
function bogotaMonthStartSoql(now: Date): string {
  const { year, month } = bogotaYearMonth(now);
  return `${year}-${String(month).padStart(2, "0")}-01T00:00:00.000`;
}

export interface EnJuegoMes {
  totalCop: number | null;
  procesos: number | null;
}

/**
 * Card "$ en juego este mes": suma de precio_base y conteo de procesos
 * abiertos del sector agua publicados desde el día 1 del mes actual (hora
 * Bogotá).
 */
export async function getEnJuegoMes(now: Date = new Date()): Promise<EnJuegoMes> {
  try {
    const monthStart = bogotaMonthStartSoql(now);
    const where = [
      buildAguaWhere(),
      `${F.estadoApertura} = 'Abierto'`,
      `${F.fechaPublicacion} >= '${monthStart}'`,
    ].join(" AND ");

    const rows = await sodaFetch<{ total?: string; procesos?: string }>(
      await resolveDatasetId("procesos"),
      {
        $select: `sum(${F.precioBase}) as total, count(*) as procesos`,
        $where: where,
        $limit: 1,
        $offset: 0,
      },
      { revalidate: REVALIDATE_SEARCH }
    );
    const total = Number(rows[0]?.total);
    const procesos = Number(rows[0]?.procesos);
    return {
      totalCop: Number.isFinite(total) ? total : null,
      procesos: Number.isFinite(procesos) ? procesos : null,
    };
  } catch (err) {
    console.warn(
      `[landingStats.getEnJuegoMes] falló (${err instanceof Error ? err.message : String(err)})`
    );
    return { totalCop: null, procesos: null };
  }
}
