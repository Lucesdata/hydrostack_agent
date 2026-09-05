/**
 * Route handler: GET /api/al/sanciones/[nit] — SDD §8.1, Fase 3.
 *
 * Sirve el historial sancionatorio ya cargado. No hace ninguna llamada externa:
 * el modelo "bajo demanda con caché de 30 días" que preveía el SDD se quedó sin
 * fuente (SIRI solo trae cédulas, RUES responde 403), así que consultar aquí es
 * leer la base — instantáneo y sin coste.
 */

import { NextRequest, NextResponse } from "next/server";
import { autorizar } from "@/src/lib/al/filtros/guard";
import { sancionesDeProveedor } from "@/src/lib/al/sanciones/consulta";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ nit: string }> }) {
  const auth = await autorizar("filtros");
  if (!auth) return NextResponse.json({ error: "No hay sesión activa" }, { status: 401 });

  const { nit } = await ctx.params;
  if (!/^[\w:.\- ]{1,120}$/.test(nit)) {
    return NextResponse.json({ error: "Identificador inválido" }, { status: 400 });
  }

  const historial = await sancionesDeProveedor(decodeURIComponent(nit));
  return NextResponse.json({ historial });
}
