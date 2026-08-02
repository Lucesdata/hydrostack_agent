/**
 * Route handler: POST /api/alertas/enviar-ahora (Fase 1.3)
 *
 * Envío bajo demanda: matching del día → si hay coincidencias, correo vía
 * Resend → registra en `envio_log`. Requiere sesión. Lógica compartida con el
 * botón de /mis-coincidencias en src/lib/alertas/enviar-ahora.ts — este route
 * es el contrato HTTP público, no la única forma de invocarlo.
 */

import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth/config";
import { enviarDigestAhora } from "@/src/lib/alertas/enviar-ahora";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  const usuarioId = session?.user?.id;
  if (!usuarioId) {
    return NextResponse.json({ error: "No hay sesión activa" }, { status: 401 });
  }

  const resultado = await enviarDigestAhora(usuarioId);
  if (resultado.estado === "error") {
    return NextResponse.json(resultado, { status: 502 });
  }
  return NextResponse.json(resultado);
}
