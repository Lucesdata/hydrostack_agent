/**
 * Route handler: GET/PUT /api/alertas/preferencias (Fase 1.5)
 *
 * Preferencias de alerta de la cuenta autenticada — activo (pausar/reactivar)
 * y hora_envio. Mismo patrón que /api/perfil: requiere sesión, sin sesión
 * 401. `hora_envio` se guarda pero el cron diario aún corre a hora fija (ver
 * nota en src/lib/alertas/preferencias-store.ts).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import {
  getPreferencias,
  savePreferencias,
  type AlertaPreferencias,
} from "@/src/lib/alertas/preferencias-store";

export const runtime = "nodejs";

function isValidPrefs(p: unknown): p is AlertaPreferencias {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.activo === "boolean" &&
    typeof o.horaEnvio === "number" &&
    Number.isInteger(o.horaEnvio) &&
    o.horaEnvio >= 0 &&
    o.horaEnvio <= 23
  );
}

export async function GET() {
  const user = await getSessionUser();
  const usuarioId = user?.id;
  if (!usuarioId) {
    return NextResponse.json({ error: "No hay sesión activa" }, { status: 401 });
  }

  const preferencias = await getPreferencias(usuarioId);
  return NextResponse.json({ preferencias });
}

export async function PUT(req: NextRequest) {
  const user = await getSessionUser();
  const usuarioId = user?.id;
  if (!usuarioId) {
    return NextResponse.json({ error: "No hay sesión activa" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!isValidPrefs(body)) {
    return NextResponse.json({ error: "Preferencias inválidas" }, { status: 400 });
  }

  const preferencias = await savePreferencias(usuarioId, body);
  return NextResponse.json({ preferencias });
}
