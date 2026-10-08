/**
 * Route handler: POST /api/webhooks/resend — entregabilidad (SDD §7.3, Fase 6).
 *
 * Sin usuarios todavía, la reputación del dominio está por construir, y **un
 * rebote invisible la quema en silencio**. Este webhook escribe el estado real
 * de entrega en `envio_log` y apaga la cuenta tras dos rebotes duros seguidos:
 * seguir enviando a una dirección muerta perjudica a todos los demás
 * destinatarios, no solo a ése.
 *
 * Seguridad: Resend firma con Svix (`svix-id`, `svix-timestamp`,
 * `svix-signature`). Se verifica con `RESEND_WEBHOOK_SECRET` y **se falla
 * cerrado**: sin la env var el endpoint responde 401, igual que los `/api/cron/*`.
 * Un webhook de entrega sin verificar es un endpoint público que cualquiera
 * puede usar para dar de baja a una cuenta ajena.
 */

import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { envioLog, alertaPreferencias } from "@/src/lib/db/schema/cuentas";
import { firmaValida } from "@/src/lib/al/notificacion/svix";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Estados de Resend que interesan. `email.sent` no aporta: ya lo sabíamos. */
const ESTADOS: Record<string, string> = {
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.opened": "opened",
};

/** Dos rebotes duros seguidos apagan la cuenta (SDD §7.3). */
const REBOTES_PARA_APAGAR = 2;

async function apagarSiRebotaDosVeces(usuarioId: string): Promise<boolean> {
  const ultimos = await db
    .select({ estadoEntrega: envioLog.estadoEntrega })
    .from(envioLog)
    .where(and(eq(envioLog.usuarioId, usuarioId), isNotNull(envioLog.estadoEntrega)))
    .orderBy(desc(envioLog.enviadoEn))
    .limit(REBOTES_PARA_APAGAR);

  if (ultimos.length < REBOTES_PARA_APAGAR) return false;
  if (!ultimos.every((u) => u.estadoEntrega === "bounced")) return false;

  await db
    .insert(alertaPreferencias)
    .values({ usuarioId, activo: false })
    .onConflictDoUpdate({
      target: alertaPreferencias.usuarioId,
      set: { activo: false, updatedAt: new Date() },
    });
  console.warn(
    `[webhooks/resend] alertas apagadas para ${usuarioId}: ${REBOTES_PARA_APAGAR} rebotes duros`
  );
  return true;
}

export async function POST(req: NextRequest): Promise<Response> {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhooks/resend] RESEND_WEBHOOK_SECRET no definido — rechazando (fail-closed)");
    return NextResponse.json({ ok: false, error: "server misconfigured" }, { status: 401 });
  }

  const body = await req.text();
  const cabeceras = {
    id: req.headers.get("svix-id"),
    timestamp: req.headers.get("svix-timestamp"),
    signature: req.headers.get("svix-signature"),
  };
  if (!firmaValida(secret, cabeceras, body)) {
    return NextResponse.json({ ok: false, error: "firma inválida" }, { status: 401 });
  }

  let evento: { type?: string; data?: { email_id?: string; to?: string[] } };
  try {
    evento = JSON.parse(body);
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  if (!evento || typeof evento !== "object" || typeof evento.type !== "string") {
    return NextResponse.json({ ok: false, error: "evento inválido" }, { status: 400 });
  }

  const estado = Object.hasOwn(ESTADOS, evento.type) ? ESTADOS[evento.type] : undefined;
  if (!estado) return NextResponse.json({ ok: true, ignorado: evento.type });

  const mensajeId = evento.data?.email_id;
  if (typeof mensajeId !== "string" || !mensajeId) {
    return NextResponse.json({ ok: false, error: "email_id requerido" }, { status: 400 });
  }

  // Nunca atribuir un evento de Auth u otro mensaje al último digest por email.
  const [fila] = await db
    .select({ id: envioLog.id, usuarioId: envioLog.usuarioId })
    .from(envioLog)
    .where(eq(envioLog.proveedorMensajeId, mensajeId))
    .limit(1);

  if (!fila) {
    // El proveedor puede entregar el webhook antes de que guardemos su id.
    // Un 503 permite su reintento sin modificar ninguna otra fila.
    return NextResponse.json({ ok: false, sinRegistro: true }, { status: 503 });
  }

  const [actualizada] = await db
    .update(envioLog)
    .set({
      // Precedencia atómica: eventos duplicados o desordenados no borran
      // quejas/rebotes ni rebajan una apertura a simple entrega.
      estadoEntrega: sql`CASE
        WHEN ${envioLog.estadoEntrega} = 'complained' THEN 'complained'
        WHEN ${estado} = 'complained' THEN 'complained'
        WHEN ${envioLog.estadoEntrega} = 'bounced' THEN 'bounced'
        WHEN ${envioLog.estadoEntrega} = 'opened' AND ${estado} = 'delivered' THEN 'opened'
        ELSE ${estado} END`,
      entregaActualizadaEn: new Date(),
    })
    .where(and(eq(envioLog.id, fila.id), eq(envioLog.proveedorMensajeId, mensajeId)))
    .returning({ estadoEntrega: envioLog.estadoEntrega });

  if (!actualizada) {
    return NextResponse.json({ ok: false, sinRegistro: true }, { status: 503 });
  }
  const efectivo = actualizada.estadoEntrega;
  let apagada = false;
  if (efectivo === "complained") {
    await db
      .insert(alertaPreferencias)
      .values({ usuarioId: fila.usuarioId, activo: false })
      .onConflictDoUpdate({
        target: alertaPreferencias.usuarioId,
        set: { activo: false, updatedAt: new Date() },
      });
    apagada = true;
  } else if (efectivo === "bounced") {
    apagada = await apagarSiRebotaDosVeces(fila.usuarioId);
  }

  return NextResponse.json({ ok: true, estado: efectivo, alertasApagadas: apagada });
}
