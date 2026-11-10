/**
 * GET /api/radar/entidades?q=&clase= — búsqueda de entidades del Radar
 * institucional sobre toda la tabla `entidad` (`buscar-entidades.ts`).
 * Pública (datos de SECOP II, sin cuenta) y cacheada en el CDN por consulta;
 * si la base falla, 503 sin caché.
 */

import { NextResponse } from "next/server";
import {
  buscarEntidades,
  esClaseEntidad,
  MIN_CARACTERES_BUSQUEDA,
} from "@/src/lib/secop/buscar-entidades";
import { aliasDeBusqueda } from "@/src/lib/secop/alias-entidades";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 80);
  const claseParam = url.searchParams.get("clase");
  if (q.trim().length < MIN_CARACTERES_BUSQUEDA) {
    return NextResponse.json({ error: "Escribe al menos 2 caracteres" }, { status: 400 });
  }
  if (claseParam && claseParam !== "todas" && !esClaseEntidad(claseParam)) {
    return NextResponse.json({ error: "Clase de entidad no válida" }, { status: 400 });
  }
  try {
    const entidades = await buscarEntidades(q, esClaseEntidad(claseParam) ? claseParam : null);
    return NextResponse.json(
      { entidades, nota: aliasDeBusqueda(q)?.nota ?? null },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600" } }
    );
  } catch (error) {
    console.error("[api/radar/entidades]", error);
    return NextResponse.json(
      { error: "Búsqueda no disponible" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
