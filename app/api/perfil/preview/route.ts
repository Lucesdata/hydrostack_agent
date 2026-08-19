/**
 * Route handler: POST /api/perfil/preview
 *
 * Coincidencias en vivo para un `OferenteProfile` que el usuario todavía
 * está editando en `/perfil` — nunca escribe en `oferente_perfil`. Reusa
 * `getMatchesForPerfil` tal cual (mismo prefiltro SQL, mismo motor de
 * veredicto) sobre el perfil recibido en el body en vez del guardado en BD.
 * Ver docs/superpowers/specs/2026-08-19-panel-progresivo-coincidencias-design.md.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { getMatchesForPerfil } from "@/src/lib/matching/get-matches-for-perfil";
import { isValidPerfil } from "@/src/lib/oferente/validate";

export const runtime = "nodejs";

export interface PreviewEjemplo {
  nombre: string;
  entidad: string;
  valor: number | null;
}

export interface PreviewResponse {
  count: number;
  ejemplos: PreviewEjemplo[];
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) {
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
    const matches = await getMatchesForPerfil(body);
    const ejemplos: PreviewEjemplo[] = matches.slice(0, 3).map((m) => ({
      nombre: m.proceso.nombre,
      entidad: m.proceso.entidad,
      valor: m.proceso.precioBase ?? m.proceso.valorAdjudicacion,
    }));
    return NextResponse.json({ count: matches.length, ejemplos });
  } catch {
    return NextResponse.json({ error: "DB_UNAVAILABLE" }, { status: 503 });
  }
}
