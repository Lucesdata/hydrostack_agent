/**
 * Route handler:  POST /api/vitrina/encaje
 *
 * El «Cumples N de 5» de las tarjetas de la vitrina, para las que hay en
 * pantalla. Body: { ids: string[] (máx. 25), perfil: OferenteProfile }.
 * Respuesta: { encaje: Record<id, { cumple, total, overall }> }.
 *
 * Sin sesión: el perfil puede ser el del navegador (se define sin cuenta, D1
 * de la ficha), y la respuesta solo lleva estados, no explicaciones, así que
 * no hay nada que redactar (ver `src/lib/secop/encaje-vitrina.ts`). Depende
 * del perfil de quien pregunta: `no-store`.
 */

import { NextRequest, NextResponse } from "next/server";
import { encajeDeProcesos, idsValidos } from "@/src/lib/secop/encaje-vitrina";
import { isValidPerfil } from "@/src/lib/oferente/validate";

export const runtime = "nodejs";

const SIN_CACHE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  let body: { ids?: unknown; perfil?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400, headers: SIN_CACHE });
  }

  const ids = idsValidos(body.ids);
  if (!ids) {
    return NextResponse.json(
      { error: "Faltan los ids o son inválidos" },
      { status: 400, headers: SIN_CACHE }
    );
  }
  if (!isValidPerfil(body.perfil)) {
    return NextResponse.json(
      { error: "Falta el perfil de oferente o es inválido" },
      { status: 400, headers: SIN_CACHE }
    );
  }

  try {
    const encaje = await encajeDeProcesos(body.perfil, ids);
    return NextResponse.json({ encaje }, { headers: SIN_CACHE });
  } catch {
    return NextResponse.json(
      { error: "No se pudo calcular el encaje" },
      { status: 502, headers: SIN_CACHE }
    );
  }
}
