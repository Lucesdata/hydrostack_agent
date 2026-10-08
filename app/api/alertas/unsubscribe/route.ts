/**
 * Route handler: GET /api/alertas/unsubscribe?token=... (Fase 1.3)
 *
 * Baja POST de un clic, sin sesión — el link va en el header `List-Unsubscribe` y
 * en el cuerpo de cada correo (src/lib/email/digest.ts). El token es HMAC
 * sobre el usuarioId (src/lib/email/unsubscribe-token.ts); válido sin
 * necesidad de tabla de tokens. La UI de preferencias (pausar/reactivar/hora)
 * es Fase 1.5 — este endpoint solo apaga `alerta_preferencias.activo`.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/db/client";
import { alertaPreferencias } from "@/src/lib/db/schema/cuentas";
import { verifyUnsubscribeToken } from "@/src/lib/email/unsubscribe-token";

export const runtime = "nodejs";

function pagina(mensaje: string, contenido = "", status = 200): NextResponse {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
    <title>AquaLicita — Alertas</title></head>
    <body style="font-family:system-ui,sans-serif;max-width:480px;margin:80px auto;color:#0A1F1C;">
      <p>${mensaje}</p>${contenido}
    </body></html>`;
  return new NextResponse(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const usuarioId = token ? verifyUnsubscribeToken(token) : null;

  if (!usuarioId) {
    return pagina("Enlace de baja inválido o vencido.");
  }

  // GET no cambia preferencias: los escáneres de enlaces abren correos.
  return pagina(
    "Confirma que quieres dejar de recibir alertas.",
    '<form method="post"><button type="submit">Dejar de recibir alertas</button></form>'
  );
}

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const usuarioId = token ? verifyUnsubscribeToken(token) : null;
  if (!usuarioId) return pagina("Enlace de baja inválido o vencido.", "", 400);

  await db
    .insert(alertaPreferencias)
    .values({ usuarioId, activo: false })
    .onConflictDoUpdate({
      target: alertaPreferencias.usuarioId,
      set: { activo: false, updatedAt: new Date() },
    });

  return pagina("Listo — ya no recibirás alertas de AquaLicita en tu correo.");
}
