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
 *
 * ── Extensión de la Fase 6 (SDD §7.1) ──────────────────────────────────────
 * El correo pasa a ser AGREGADO: adendas con su diff, adjudicaciones, aperturas
 * que casaron con los filtros de la cuenta y, al final, las coincidencias del
 * perfil de siempre. **Un solo correo por cuenta y día, con todo dentro** — tres
 * filtros con novedad no son tres correos, son tres secciones.
 *
 * Y el barrido deja de ser "cuentas con perfil de oferente": ahora es "cuentas
 * con perfil **o** con al menos un filtro activo". Una cuenta que solo declaró
 * filtros nunca habría recibido nada.
 *
 * Se extiende esta función en vez de escribir un camino paralelo a propósito: dos
 * escritores compitiendo por el mismo `envio_log` se anularían entre sí — el
 * primero reserva la fila y el segundo se salta la cuenta creyendo que ya se
 * envió.
 */

import { eq, or, sql } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { usuario, oferentePerfil, alertaPreferencias, envioLog } from "@/src/lib/db/schema/cuentas";
import { alFiltrosUsuario } from "@/src/lib/db/schema/aqualicita";
import { getMatchesForPerfil } from "@/src/lib/matching/get-matches-for-perfil";
import { recordCoincidencias } from "@/src/lib/matching/record-coincidencias";
import { renderDigestAgregado } from "@/src/lib/al/notificacion/digest-agregado";
import { recopilarNovedades } from "@/src/lib/al/notificacion/recopilar";
import { generarReporte, slugDigest } from "@/src/lib/al/reportes/generar";
import { sendDigestEmail } from "@/src/lib/email/send";
import { isPerfilCompleto } from "@/src/lib/oferente/perfil-minimo";
import type { PerfilGuardado } from "@/src/lib/oferente/perfil-minimo";

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

  // Cuentas con perfil de oferente O con al menos un filtro activo. Antes solo
  // lo primero, y una cuenta que solo declaró filtros nunca recibía nada.
  const cuentas = await db
    .select({
      usuarioId: usuario.id,
      email: usuario.email,
      perfil: oferentePerfil.perfil,
      activo: alertaPreferencias.activo,
    })
    .from(usuario)
    .leftJoin(oferentePerfil, eq(oferentePerfil.usuarioId, usuario.id))
    .leftJoin(alertaPreferencias, eq(alertaPreferencias.usuarioId, usuario.id))
    .where(
      or(
        sql`${oferentePerfil.id} IS NOT NULL`,
        sql`EXISTS (SELECT 1 FROM ${alFiltrosUsuario} f
                     WHERE f.usuario_id = ${usuario.id} AND f.activo)`
      )
    );

  for (const cuenta of cuentas) {
    summary.cuentas++;

    if (cuenta.activo === false) {
      // El correo está apagado, pero el badge de coincidencias del Navbar es
      // independiente de esa preferencia (D: apagar alertas no debe apagar
      // el badge) — se registra igual, en una rama separada del envío.
      const perfilGuardado = cuenta.perfil as PerfilGuardado;
      if (isPerfilCompleto(perfilGuardado)) {
        try {
          const matches = await getMatchesForPerfil(perfilGuardado);
          await recordCoincidencias(cuenta.usuarioId, matches);
        } catch (e) {
          const mensaje = e instanceof Error ? e.message : String(e);
          console.error(
            "[alertas/diario] fallo calculando coincidencias (badge) para",
            cuenta.usuarioId,
            mensaje
          );
        }
      }
      // Perfil mínimo: fuera de alcance del badge hasta completar el wizard.
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

    const perfilGuardado = cuenta.perfil as PerfilGuardado;

    try {
      // Un perfil incompleto ya NO descarta la cuenta: puede tener filtros, y
      // las novedades de un filtro no dependen del perfil de elegibilidad.
      const matches = isPerfilCompleto(perfilGuardado)
        ? await getMatchesForPerfil(perfilGuardado)
        : [];
      if (matches.length > 0) await recordCoincidencias(cuenta.usuarioId, matches);

      // v1: cuenta === usuario (SDD R8). Cuando eso deje de ser cierto, el
      // account_id sale de `cuentaDe`, no de aquí.
      const novedades = await recopilarNovedades(cuenta.usuarioId);

      if (matches.length === 0 && novedades.total === 0) {
        // Sin nada que contar NO se envía correo. Un correo vacío diario es la
        // vía más rápida a que lo marquen como spam.
        await db
          .update(envioLog)
          .set({ estado: "sin_coincidencias", matches: 0 })
          .where(eq(envioLog.id, reservado.id));
        summary.sinCoincidencias++;
        continue;
      }

      // El reporte se genera ANTES del envío: el correo lo enlaza, y un enlace
      // a un reporte que no existe es peor que no enlazar nada.
      const reporte = await generarReporte({
        slug: slugDigest(fecha),
        tipo: "digest_diario",
        titulo: `Novedades del ${fecha}`,
        visibilidad: "privado",
        accountId: cuenta.usuarioId,
        parametros: { fecha },
        payload: {
          fecha,
          novedades,
          matches: matches.map((m) => ({
            secopProcesoId: m.proceso.id,
            nombre: m.proceso.nombre,
            entidad: m.proceso.entidad,
            precioBase: m.proceso.precioBase,
            url: m.proceso.url,
            veredicto: m.verdict.overall,
          })),
        },
      });

      const digest = renderDigestAgregado(
        novedades,
        { id: cuenta.usuarioId, email: cuenta.email },
        reporte.url,
        matches
      );
      await sendDigestEmail(cuenta.email, digest);
      await db
        .update(envioLog)
        .set({
          estado: "enviado",
          matches: matches.length + novedades.total,
          reporteId: reporte.id,
        })
        .where(eq(envioLog.id, reservado.id));
      summary.enviados++;
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : String(e);
      await db
        .update(envioLog)
        .set({ estado: "error", matches: 0 })
        .where(eq(envioLog.id, reservado.id));
      summary.errores++;
      console.error("[alertas/diario] fallo para", cuenta.usuarioId, mensaje);
    }
  }

  return summary;
}
