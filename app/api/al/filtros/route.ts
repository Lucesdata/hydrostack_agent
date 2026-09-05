/**
 * Route handler: GET/POST /api/al/filtros — SDD §4.2, Fase 1.
 *
 * Filtros de búsqueda de la cuenta autenticada. Mismo patrón que
 * `/api/alertas/preferencias`: sin sesión, 401 (no redirección — es una API).
 * La autorización se resuelve en `autorizar()`, que consulta la política.
 */

import { NextRequest, NextResponse } from "next/server";
import { autorizar } from "@/src/lib/al/filtros/guard";
import { listarFiltros, crearFiltro } from "@/src/lib/al/filtros/store";
import { validarFiltro } from "@/src/lib/al/filtros/tipos";

export const runtime = "nodejs";

export async function GET() {
  const auth = await autorizar("filtros");
  if (!auth) return NextResponse.json({ error: "No hay sesión activa" }, { status: 401 });

  const filtros = await listarFiltros(auth.accountId);
  return NextResponse.json({ filtros });
}

export async function POST(req: NextRequest) {
  const auth = await autorizar("filtros");
  if (!auth) return NextResponse.json({ error: "No hay sesión activa" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const v = validarFiltro(body);
  if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });

  const filtro = await crearFiltro(auth.accountId, auth.usuarioId, v.valor);
  return NextResponse.json({ filtro }, { status: 201 });
}
