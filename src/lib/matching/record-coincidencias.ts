/**
 * Persistencia de coincidencias detectadas (badge de notificación en el
 * Navbar). `match.ts`/`get-matches-for-perfil.ts` son módulos puros, sin IO
 * de escritura; este es el único lugar que escribe en `coincidencia`.
 */

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { coincidencia } from "@/src/lib/db/schema/cuentas";
import type { Match } from "./match";

export async function recordCoincidencias(usuarioId: string, matches: Match[]): Promise<void> {
  if (matches.length === 0) return;
  await db
    .insert(coincidencia)
    .values(
      matches.map((m) => ({
        usuarioId,
        procesoId: m.proceso.id,
        veredictoOverall: m.verdict.overall,
      }))
    )
    .onConflictDoNothing({ target: [coincidencia.usuarioId, coincidencia.procesoId] });
}

export async function markCoincidenciasVistas(usuarioId: string): Promise<void> {
  await db
    .update(coincidencia)
    .set({ vistaEn: new Date() })
    .where(and(eq(coincidencia.usuarioId, usuarioId), isNull(coincidencia.vistaEn)));
}

/**
 * Se llama desde el layout raíz en cada request de un usuario con sesión —
 * si la base no responde (ej. cuota de Neon excedida), degrada a "sin
 * badge" en vez de tumbar el render de toda la app.
 */
export async function hasCoincidenciasNoVistas(usuarioId: string): Promise<boolean> {
  try {
    const [row] = await db
      .select({ id: coincidencia.id })
      .from(coincidencia)
      .where(and(eq(coincidencia.usuarioId, usuarioId), isNull(coincidencia.vistaEn)))
      .limit(1);
    return Boolean(row);
  } catch {
    return false;
  }
}
