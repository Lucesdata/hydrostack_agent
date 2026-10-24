import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { proceso, rawRecord, syncLog } from "../db/schema";

/**
 * Procedencia de las fechas de «actualización» de la ficha. Son dos hechos
 * distintos y ninguno es la hora de render:
 *  - `sincronizacion`: fin de la última corrida de ingesta de procesos que
 *    terminó `ok` (`sync_log`). Dice cuándo AquaLicita leyó la fuente por última vez.
 *  - `publicadoSecop`: `fecha_de_ultima_publicaci` del registro actual del proceso
 *    (`raw_record.source_updated_at`). Es lo que SECOP dice de su propio registro.
 *    Socrata la entrega «floating» (sin zona) y la ingesta la guarda como UTC: se
 *    muestra solo el día y en UTC, sin convertir a Colombia (restaría cinco horas).
 * Sin dato, `null`: la ficha lo dice y no inventa un proxy.
 */
export interface FrescuraFicha {
  sincronizacion: string | null;
  publicadoSecop: string | null;
  error: boolean;
}

const FUENTE_PROCESOS = "secop_ii_procesos";

export async function frescuraDeProceso(secopProcesoId: string): Promise<FrescuraFicha> {
  try {
    const [sync, fuente] = await Promise.all([
      db
        .select({ fin: syncLog.finishedAt })
        .from(syncLog)
        .where(and(eq(syncLog.source, FUENTE_PROCESOS), eq(syncLog.status, "ok")))
        .orderBy(desc(syncLog.finishedAt))
        .limit(1),
      db
        .select({ publicado: rawRecord.sourceUpdatedAt })
        .from(proceso)
        .innerJoin(rawRecord, eq(rawRecord.id, proceso.rawRecordIdActual))
        .where(eq(proceso.secopProcesoId, secopProcesoId))
        .limit(1),
    ]);
    return {
      sincronizacion: sync[0]?.fin?.toISOString() ?? null,
      publicadoSecop: fuente[0]?.publicado?.toISOString() ?? null,
      error: false,
    };
  } catch (error) {
    console.error("[ficha] No se pudo consultar la frescura", error);
    return { sincronizacion: null, publicadoSecop: null, error: true };
  }
}

function valido(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface EtiquetasFrescura {
  sincronizacion: string;
  publicadoSecop: string;
}

/** Texto de las dos líneas; cada una dice por separado si no hay dato. */
export function etiquetasFrescura(f: FrescuraFicha): EtiquetasFrescura {
  const sync = valido(f.sincronizacion);
  const secop = valido(f.publicadoSecop);
  return {
    sincronizacion: sync
      ? `Última sincronización de AquaLicita: ${sync.toLocaleString("es-CO", {
          timeZone: "America/Bogota",
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })} COT`
      : "Última sincronización de AquaLicita: no disponible",
    publicadoSecop: secop
      ? `Última actualización publicada en SECOP: ${secop.toLocaleDateString("es-CO", {
          timeZone: "UTC",
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`
      : "Última actualización publicada en SECOP: no disponible",
  };
}
