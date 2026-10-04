/**
 * «Seguir» un proceso a mano (fase 3 de la vitrina, 2026-10-04,
 * `docs/superpowers/plans/2026-10-04-vitrina-fase3.md`, D1).
 *
 * Seguir es estar en `coincidencia`, la misma tabla que llenan el perfil y los
 * filtros: así lo seguido a mano entra solo en `/mis-coincidencias` y en
 * «Cambios en procesos que sigues» del correo diario (`al/notificacion/recopilar.ts`),
 * sin código nuevo en ninguno de los dos. Lo que distingue a mano es
 * `origen = 'manual'` (migración 0025).
 *
 * **Aislamiento:** toda consulta va por cuenta con
 * `COALESCE(account_id, usuario_id)`, el mismo criterio de `recopilar.ts`. Las
 * filas que escribe el perfil no traen `account_id` (es anterior a la columna),
 * y sin el COALESCE un proceso que la cuenta ya sigue por su perfil saldría como
 * no seguido.
 */

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { coincidencia } from "@/src/lib/db/schema/cuentas";
import { proceso } from "@/src/lib/db/schema";

export const ORIGEN_MANUAL = "manual";

/** El mismo valor con el que los filtros escriben lo que aún no tiene veredicto. */
const VEREDICTO_SIN_EVALUAR = "UNKNOWN";

/** Cuántos ids se consultan de una vez: una página de la vitrina son 9. */
export const MAX_IDS_SEGUIR = 25;

const FORMA_ID = /^[A-Za-z0-9._-]{3,64}$/;

export function idValido(id: unknown): id is string {
  return typeof id === "string" && FORMA_ID.test(id);
}

/** Ids válidos y sin repetir, o `null` si la lista no tiene forma de serlo. */
export function idsValidos(ids: unknown): string[] | null {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_IDS_SEGUIR) return null;
  if (!ids.every(idValido)) return null;
  return [...new Set(ids as string[])];
}

function deLaCuenta(accountId: string) {
  return sql`COALESCE(${coincidencia.accountId}, ${coincidencia.usuarioId}) = ${accountId}`;
}

export type ResultadoSeguir = "siguiendo" | "ya-lo-seguia" | "no-existe";

/**
 * Sigue el proceso. Si la cuenta ya lo seguía (por perfil, por filtro o a
 * mano) no cambia nada: la fila de origen se queda como estaba. Un id que no es
 * un proceso vivo no crea fila.
 */
export async function seguir(
  accountId: string,
  usuarioId: string,
  procesoId: string
): Promise<ResultadoSeguir> {
  const [vivo] = await db
    .select({ id: proceso.id })
    .from(proceso)
    .where(and(eq(proceso.secopProcesoId, procesoId), isNull(proceso.deletedAt)))
    .limit(1);
  if (!vivo) return "no-existe";

  const insertadas = await db
    .insert(coincidencia)
    .values({
      usuarioId,
      accountId,
      procesoId,
      veredictoOverall: VEREDICTO_SIN_EVALUAR,
      origen: ORIGEN_MANUAL,
    })
    .onConflictDoNothing({ target: [coincidencia.usuarioId, coincidencia.procesoId] })
    .returning({ id: coincidencia.id });
  return insertadas.length > 0 ? "siguiendo" : "ya-lo-seguia";
}

export type ResultadoDejar = "dejado" | "no-era-manual" | "no-lo-seguia";

/**
 * Deja de seguir lo que se siguió a mano. Lo que vino del perfil o de un filtro
 * no se borra desde aquí: el cron lo volvería a traer al día siguiente y el
 * usuario vería un botón que no hace nada. Se dice con `no-era-manual`.
 */
export async function dejarDeSeguir(accountId: string, procesoId: string): Promise<ResultadoDejar> {
  const borradas = await db
    .delete(coincidencia)
    .where(
      and(
        deLaCuenta(accountId),
        eq(coincidencia.procesoId, procesoId),
        eq(coincidencia.origen, ORIGEN_MANUAL)
      )
    )
    .returning({ id: coincidencia.id });
  if (borradas.length > 0) return "dejado";

  const [otra] = await db
    .select({ id: coincidencia.id })
    .from(coincidencia)
    .where(and(deLaCuenta(accountId), eq(coincidencia.procesoId, procesoId)))
    .limit(1);
  return otra ? "no-era-manual" : "no-lo-seguia";
}

export interface EstadoSeguido {
  /** Lo sigue, por el origen que sea. */
  siguiendo: boolean;
  /** Lo siguió a mano: solo entonces «Dejar de seguir» hace algo. */
  manual: boolean;
}

/** Cuáles de estos procesos sigue la cuenta. Los que no, no aparecen. */
export async function seguidos(
  accountId: string,
  ids: string[]
): Promise<Record<string, EstadoSeguido>> {
  if (ids.length === 0) return {};
  const filas = await db
    .select({ procesoId: coincidencia.procesoId, origen: coincidencia.origen })
    .from(coincidencia)
    .where(and(deLaCuenta(accountId), inArray(coincidencia.procesoId, ids)));
  const out: Record<string, EstadoSeguido> = {};
  for (const f of filas) {
    const previo = out[f.procesoId];
    out[f.procesoId] = {
      siguiendo: true,
      manual: (previo?.manual ?? false) || f.origen === ORIGEN_MANUAL,
    };
  }
  return out;
}
