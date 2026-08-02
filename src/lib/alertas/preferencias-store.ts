/**
 * Preferencias de alerta por cuenta (Fase 1.5). La fila en `alerta_preferencias`
 * solo existe si el usuario la tocó (el unsubscribe de Fase 1.3 la crea con
 * `activo:false`, o esta pantalla la crea/actualiza). Sin fila → valores por
 * defecto (`activo:true`, `horaEnvio:7`) — nadie ha cambiado nada todavía.
 *
 * NOTA (fallback documentado en docs/plan-arquitectura-roadmap.md §3.5 y §5.3):
 * `horaEnvio` se guarda aquí pero el cron diario (`run-daily.ts`) todavía corre
 * a una hora fija única (`vercel.json`, 12:00 UTC) — pasar a un cron por hora
 * que filtre por `horaEnvio` depende de que el plan de Vercel soporte crons
 * horarios; se deja preparado en DB y UI sin activar el filtro todavía.
 */

import { eq } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { alertaPreferencias } from "@/src/lib/db/schema/cuentas";

export interface AlertaPreferencias {
  activo: boolean;
  horaEnvio: number;
}

const DEFAULT_PREFERENCIAS: AlertaPreferencias = { activo: true, horaEnvio: 7 };

export async function getPreferencias(usuarioId: string): Promise<AlertaPreferencias> {
  const [row] = await db
    .select()
    .from(alertaPreferencias)
    .where(eq(alertaPreferencias.usuarioId, usuarioId))
    .limit(1);
  return row ? { activo: row.activo, horaEnvio: row.horaEnvio } : DEFAULT_PREFERENCIAS;
}

export async function savePreferencias(
  usuarioId: string,
  prefs: AlertaPreferencias,
): Promise<AlertaPreferencias> {
  const [row] = await db
    .insert(alertaPreferencias)
    .values({ usuarioId, activo: prefs.activo, horaEnvio: prefs.horaEnvio })
    .onConflictDoUpdate({
      target: alertaPreferencias.usuarioId,
      set: { activo: prefs.activo, horaEnvio: prefs.horaEnvio, updatedAt: new Date() },
    })
    .returning();
  return { activo: row.activo, horaEnvio: row.horaEnvio };
}
