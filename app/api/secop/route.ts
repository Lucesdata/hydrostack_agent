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
 */

import { NextRequest, NextResponse } from "next/server";
import { searchProcesos, searchContratos, countProcesos } from "@/src/lib/secop/client";
import { parseQuery } from "@/src/lib/secop/parse-query";
import { buildVerdict, toVerdictInput } from "@/src/lib/secop/verdict";
import { OFERENTE_PILOTO } from "@/src/lib/oferente/pilot";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const tipo = sp.get("tipo") ?? "procesos";
  const query = parseQuery(sp);

  try {
    if (tipo === "contratos") {
      return NextResponse.json(await searchContratos(query));
    }
    // Procesos: adjunta el veredicto Nivel 0 (solo metadata) por proceso, como se
    // adjunta documentAccess. Perfil = OFERENTE_PILOTO (seed; valores reales TODO).
    // sectorAgua/fechaCierre no están en la foto live → null (sectorial usa el UNSPSC;
    // plazo usa estadoApertura). El veredicto es recomputable, no se persiste.
    // total: count SODA en paralelo, best-effort — si falla, total queda
    // undefined y la UI degrada sin él (ver countProcesos en client.ts).
    const [result, total] = await Promise.all([
      searchProcesos(query),
      countProcesos(query),
    ]);
    const items = result.items.map((p) => ({
      ...p,
      verdict: buildVerdict(OFERENTE_PILOTO, toVerdictInput(p)),
    }));
    return NextResponse.json({ ...result, total, items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { error: "No se pudo consultar SECOP", detail: message },
      { status: 502 },
    );
  }
}
