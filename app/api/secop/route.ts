/**
 * Route handler:  GET /api/secop
 *
 * Proxy server-side hacia Socrata. El frontend llama aquí, nunca a Socrata
 * directo (CORS + token + cache).
 *
 * Query params:
 *   ?tipo=procesos|contratos   (default: procesos)
 *   ?q=texto
 *   ?departamento=VALLE DEL CAUCA
 *   ?estado=Adjudicado
 *   ?valorMin=100000000
 *   ?desde=2026-01-01
 *   ?apertura=Abierto|Cerrado
 *   ?orden=fecha|valor         (default: fecha)
 *   ?soloAgua=false            (default: true)
 *   ?page=1&pageSize=25
 *
 * Fase 2 (elegibilidad diferida): esta lista NO adjunta veredicto. El
 * semáforo se computa on-demand en POST /api/secop/verdict, solo cuando el
 * usuario abre el detalle de un proceso o completa el wizard de perfil.
 */

import { NextRequest, NextResponse } from "next/server";
import { searchProcesos, searchContratos, countProcesos } from "@/src/lib/secop/client";
import { parseQuery } from "@/src/lib/secop/parse-query";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const tipo = sp.get("tipo") ?? "procesos";
  const query = parseQuery(sp);

  try {
    if (tipo === "contratos") {
      return NextResponse.json(await searchContratos(query));
    }
    // total: count SODA en paralelo, best-effort — si falla, total queda
    // undefined y la UI degrada sin él (ver countProcesos en client.ts).
    const [result, total] = await Promise.all([
      searchProcesos(query),
      countProcesos(query),
    ]);
    return NextResponse.json({ ...result, total });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { error: "No se pudo consultar SECOP", detail: message },
      { status: 502 },
    );
  }
}
