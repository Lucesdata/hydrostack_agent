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
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { envioLog, usuario, alertaPreferencias } from "@/src/lib/db/schema/cuentas";
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
  console.warn(`[webhooks/resend] alertas apagadas para ${usuarioId}: ${REBOTES_PARA_APAGAR} rebotes duros`);
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

  const estado = ESTADOS[evento.type ?? ""];
  if (!estado) return NextResponse.json({ ok: true, ignorado: evento.type });

  const mensajeId = evento.data?.email_id;
  const destinatario = evento.data?.to?.[0];

  // Se busca por el id de Resend; si no lo tenemos guardado todavía, por el
  // correo del destinatario y su último envío.
  let fila: { id: string; usuarioId: string } | undefined;
  if (mensajeId) {
    [fila] = await db
      .select({ id: envioLog.id, usuarioId: envioLog.usuarioId })
      .from(envioLog)
      .where(eq(envioLog.proveedorMensajeId, mensajeId))
      .limit(1);
  }
  if (!fila && destinatario) {
    [fila] = await db
      .select({ id: envioLog.id, usuarioId: envioLog.usuarioId })
      .from(envioLog)
      .innerJoin(usuario, eq(usuario.id, envioLog.usuarioId))
      .where(eq(usuario.email, destinatario))
      .orderBy(desc(envioLog.enviadoEn))
      .limit(1);
  }

  if (!fila) {
    // No es un error: puede ser un correo transaccional que no pasa por envio_log.
    return NextResponse.json({ ok: true, sinRegistro: true });
  }

  await db
    .update(envioLog)
    .set({
      estadoEntrega: estado,
      proveedorMensajeId: mensajeId ?? undefined,
      entregaActualizadaEn: new Date(),
    })
    .where(eq(envioLog.id, fila.id));

  const apagada = estado === "bounced" ? await apagarSiRebotaDosVeces(fila.usuarioId) : false;

  return NextResponse.json({ ok: true, estado, alertasApagadas: apagada });
}
