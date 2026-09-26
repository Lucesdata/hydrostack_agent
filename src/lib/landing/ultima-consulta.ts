/**
 * Cuándo consultó AquaLicita a SECOP II por última vez, sacado de `sync_log`.
 *
 * Es la última corrida **terminada** (`ok` o `partial`) de la fuente de
 * procesos. Se dice "consultado" y no "actualizado" a propósito: `sync_log`
 * se cierra al terminar de traer los registros, antes de que el transform los
 * pase a `proceso` (`src/lib/ingest/pipeline.ts`). Si el transform fallara,
 * "actualizado hace 2 h" sería falso; "consultado hace 2 h" no.
 *
 * Nunca lanza: sin dato, `null`, y la banda no muestra la frase.
 */

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { syncLog } from "@/src/lib/db/schema";
import { SOURCE_PROCESOS } from "@/src/lib/ingest/sources";

export async function getUltimaConsultaSecop(): Promise<string | null> {
  try {
    const filas = await db
      .select({ fin: sql<Date | string | null>`max(${syncLog.finishedAt})` })
      .from(syncLog)
      .where(
        and(eq(syncLog.source, SOURCE_PROCESOS.source), inArray(syncLog.status, ["ok", "partial"]))
      );
    const fin = filas[0]?.fin;
    if (!fin) return null;
    const fecha = new Date(fin);
    return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
  } catch (err) {
    console.warn(
      `[ultimaConsultaSecop] falló (${err instanceof Error ? err.message : String(err)})`
    );
    return null;
  }
}
