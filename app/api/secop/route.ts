/**
 * Route handler:  GET /api/secop
 *
 * Procesos: Postgres primero (ingesta cron, milisegundos); si la base falla
 * (sin DATABASE_URL, error de conexión/consulta) cae a Socrata live — nunca
 * mezcla fuentes entre `items` y `total` (Fase 3). Contratos siguen en vivo.
 * El frontend llama aquí, nunca a Socrata directo (CORS + token + cache).
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
import { searchProcesosDbCached, countProcesosDbCached } from "@/src/lib/secop/cached-db-search";
import { parseQuery } from "@/src/lib/secop/parse-query";
import type { SecopProceso, SecopQuery, SecopResult } from "@/src/lib/secop/types";

export const runtime = "nodejs";

/**
 * Postgres primero (memoizado por filtros, ver cached-db-search.ts); si
 * CUALQUIERA de las dos consultas falla (throw), cae a Socrata live para
 * AMBAS — nunca mezcla `items` de una fuente con `total` de otra. Un
 * resultado vacío por filtros angostos no es una falla: no cae a live.
 */
async function searchProcesosConFallback(
  query: SecopQuery,
): Promise<{ result: SecopResult<SecopProceso>; total: number | undefined }> {
  try {
    const [result, total] = await Promise.all([
      searchProcesosDbCached(query),
      countProcesosDbCached(query),
    ]);
    return { result, total };
  } catch {
    const [result, total] = await Promise.all([searchProcesos(query), countProcesos(query)]);
    return { result, total };
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const tipo = sp.get("tipo") ?? "procesos";
  const query = parseQuery(sp);

  try {
    if (tipo === "contratos") {
      return NextResponse.json(await searchContratos(query));
    }
    const { result, total } = await searchProcesosConFallback(query);
    return NextResponse.json({ ...result, total });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { error: "No se pudo consultar SECOP", detail: message },
      { status: 502 },
    );
  }
}
