/**
 * Cuándo se actualizó por última vez lo que enseña la portada: la última
 * corrida de ingesta de procesos que terminó bien (`sync_log`, `ok` o
 * `partial`, el mismo criterio que el watermark en `ingest/dbIngest.ts`).
 *
 * Es lo que pinta la línea «SECOP II · actualizado el …» del hero. El cron de
 * ingesta no está programado (TRASPASO §6 bis): si la fecha envejece, se verá,
 * y eso es correcto. Sin corrida registrada devuelve `null` y la línea se oculta.
 */

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { syncLog } from "../db/schema";
import { SOURCE_PROCESOS } from "../ingest/sources";

export async function ultimaActualizacion(): Promise<Date | null> {
  const [fila] = await db
    .select({ fin: sql<Date | string | null>`max(${syncLog.finishedAt})` })
    .from(syncLog)
    .where(
      and(eq(syncLog.source, SOURCE_PROCESOS.source), inArray(syncLog.status, ["ok", "partial"]))
    );
  if (!fila?.fin) return null;
  const fecha = new Date(fila.fin);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/**
 * "26 sep 2026", en hora de Colombia. A mano y no con `toLocaleDateString`:
 * el ICU de Node escribe "26 de sept de 2026", y se formatea en el servidor
 * para que el cliente no pinte otra cosa al hidratar.
 */
export function formatFechaCorta(fecha: Date | null): string | null {
  if (!fecha || Number.isNaN(fecha.getTime())) return null;
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(fecha);
  const parte = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value);
  return `${parte("day")} ${MESES[parte("month") - 1]} ${parte("year")}`;
}
