/**
 * Núcleo del envío diario automático (Fase 1.4). Lo invoca
 * `app/api/cron/alertas/route.ts` (Vercel Cron), calcado del patrón de
 * `runIngestPipeline`/`cron/ingest`: el route solo hace el gate de
 * `CRON_SECRET` y traduce el resultado a HTTP; toda la lógica vive aquí para
 * quedar testeable sin Request/Response.
 *
 * Idempotencia (D-009 aplicado a alertas): a diferencia de `enviarDigestAhora`
 * (Fase 1.3, upsert — un clic repetido el mismo día actualiza el registro),
 * aquí el `envio_log` de hoy con `tipo:'diario'` se INSERTA PRIMERO con
 * `onConflictDoNothing`. Si el insert no tomó (ya existía), esa cuenta se
 * salta sin reenviar — así una reejecución del cron (o dos invocaciones
 * solapadas) nunca duplica un correo. Solo tras "reservar" la fila se hace el
 * trabajo real (matching + envío) y se actualiza esa misma fila con el
 * resultado.
 *
 * Preferencias: cuentas con `alerta_preferencias.activo = false` (dadas de
 * baja vía el unsubscribe de Fase 1.3) se saltan. Sin fila en
 * `alerta_preferencias` → `activo` por defecto `true` (nadie se ha dado de
 * baja aún).
 */

import { eq } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { usuario, oferentePerfil, alertaPreferencias, envioLog } from "@/src/lib/db/schema/cuentas";
import { getMatchesForPerfil } from "@/src/lib/matching/get-matches-for-perfil";
import { renderDigest } from "@/src/lib/email/digest";
import { sendDigestEmail } from "@/src/lib/email/send";
import type { OferenteProfile } from "@/src/lib/oferente/types";

export interface DailyRunSummary {
  cuentas: number;
  enviados: number;
  sinCoincidencias: number;
  saltados: number;
  errores: number;
}

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function runDailyAlertas(): Promise<DailyRunSummary> {
  const fecha = hoyIso();
  const summary: DailyRunSummary = {
    cuentas: 0,
    enviados: 0,
    sinCoincidencias: 0,
    saltados: 0,
    errores: 0,
  };

  const cuentas = await db
    .select({
      usuarioId: usuario.id,
      email: usuario.email,
      perfil: oferentePerfil.perfil,
      activo: alertaPreferencias.activo,
    })
    .from(oferentePerfil)
    .innerJoin(usuario, eq(usuario.id, oferentePerfil.usuarioId))
    .leftJoin(alertaPreferencias, eq(alertaPreferencias.usuarioId, usuario.id));

  for (const cuenta of cuentas) {
    summary.cuentas++;

    if (cuenta.activo === false) {
      summary.saltados++;
      continue;
    }

    const [reservado] = await db
      .insert(envioLog)
      .values({ usuarioId: cuenta.usuarioId, fecha, tipo: "diario", estado: "enviado", matches: 0 })
      .onConflictDoNothing({ target: [envioLog.usuarioId, envioLog.fecha, envioLog.tipo] })
      .returning();

    if (!reservado) {
      // Ya hay un envio_log de hoy tipo 'diario' — reintento del cron, no reenviar.
      summary.saltados++;
      continue;
    }

    try {
      const perfil = cuenta.perfil as OferenteProfile;
      const matches = await getMatchesForPerfil(perfil);

      if (matches.length === 0) {
        await db
          .update(envioLog)
          .set({ estado: "sin_coincidencias", matches: 0 })
          .where(eq(envioLog.id, reservado.id));
        summary.sinCoincidencias++;
        continue;
      }

      const digest = renderDigest(matches, { id: cuenta.usuarioId, email: cuenta.email });
      await sendDigestEmail(cuenta.email, digest);
      await db
        .update(envioLog)
        .set({ estado: "enviado", matches: matches.length })
        .where(eq(envioLog.id, reservado.id));
      summary.enviados++;
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : String(e);
      await db.update(envioLog).set({ estado: "error", matches: 0 }).where(eq(envioLog.id, reservado.id));
      summary.errores++;
      console.error("[alertas/diario] fallo para", cuenta.usuarioId, mensaje);
    }
  }

  return summary;
}
