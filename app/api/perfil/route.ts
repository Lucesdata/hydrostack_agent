/**
 * Route handler: GET/PUT /api/perfil
 *
 * Perfil de oferente (`OferenteProfile`) de la cuenta autenticada, persistido en
 * `oferente_perfil` (Fase 1.1). Requiere sesión — sin sesión, el perfil sigue
 * viviendo solo en `clientStore` (localStorage), como hoy. El cliente
 * (`SecopExplorer`) decide cuándo llamar esto: al montar (GET, para hidratar
 * cuentas ya migradas) y al completar el wizard (PUT).
 *
 * Si lo guardado es un `PerfilMinimo` (setup inline sector+zona de
 * /mis-coincidencias, sin cuantiaObjetivo), GET devuelve `null` — este
 * endpoint solo expone `OferenteProfile` completo; el único consumidor
 * (`SecopExplorer`) ya sabe abrir el wizard completo cuando `perfil` es null.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { db } from "@/src/lib/db/client";
import { oferentePerfil } from "@/src/lib/db/schema/cuentas";
import { getPerfilDb } from "@/src/lib/oferente/perfil-store";
import { isPerfilCompleto } from "@/src/lib/oferente/perfil-minimo";
import { isValidPerfil } from "@/src/lib/oferente/validate";
import type { OferenteProfile } from "@/src/lib/oferente/types";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  const usuarioId = user?.id;
  if (!usuarioId) {
    return NextResponse.json({ error: "No hay sesión activa" }, { status: 401 });
  }

  const guardado = await getPerfilDb(usuarioId);
  const perfil = guardado && isPerfilCompleto(guardado) ? guardado : null;
  return NextResponse.json({ perfil });
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

  if (!isValidPerfil(body)) {
    return NextResponse.json({ error: "Perfil inválido" }, { status: 400 });
  }

  try {
    const [row] = await db
      .insert(oferentePerfil)
      .values({ usuarioId, perfil: body })
      .onConflictDoUpdate({
        target: oferentePerfil.usuarioId,
        set: { perfil: body, actualizadoEn: new Date() },
      })
      .returning();

    return NextResponse.json({ perfil: row.perfil as OferenteProfile });
  } catch {
    // Base no alcanzable (p. ej. cuota de Neon excedida, o migración en curso
    // a Supabase) — modo concierge: devolvemos el perfil recibido (ya
    // validado arriba) para que el cliente lo ofrezca por correo en vez de
    // perderlo. No es un dato nuevo: es lo que el usuario ya envió en este
    // mismo request.
    return NextResponse.json({ error: "DB_UNAVAILABLE", perfil: body }, { status: 503 });
  }
}
