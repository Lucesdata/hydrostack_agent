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
 *   ?soloAgua=false            (default: true)
 *   ?page=1&pageSize=25
 */

import { NextRequest, NextResponse } from "next/server";
import { searchProcesos, searchContratos } from "@/src/lib/secop/client";
import type { SecopQuery } from "@/src/lib/secop/types";
import { buildVerdict, toVerdictInput } from "@/src/lib/secop/verdict";
import { OFERENTE_PILOTO } from "@/src/lib/oferente/pilot";

export const runtime = "nodejs";

function parseQuery(sp: URLSearchParams): SecopQuery {
  const num = (k: string) => {
    const v = sp.get(k);
    return v != null && v !== "" ? Number(v) : undefined;
  };
  return {
    q: sp.get("q") ?? undefined,
    departamento: sp.get("departamento") ?? undefined,
    estado: sp.get("estado") ?? undefined,
    valorMin: num("valorMin"),
    desde: sp.get("desde") ?? undefined,
    soloAgua: sp.get("soloAgua") === "false" ? false : true,
    page: num("page"),
    pageSize: num("pageSize"),
  };
}

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
    const result = await searchProcesos(query);
    const items = result.items.map((p) => ({
      ...p,
      verdict: buildVerdict(OFERENTE_PILOTO, toVerdictInput(p)),
    }));
    return NextResponse.json({ ...result, items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { error: "No se pudo consultar SECOP", detail: message },
      { status: 502 },
    );
  }
}
