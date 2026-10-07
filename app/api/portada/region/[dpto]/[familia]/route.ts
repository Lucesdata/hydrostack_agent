/**
 * GET /api/portada/region/[dpto]/[familia] — el panel de una región del hero:
 * los procesos de una familia en un departamento, publicados en 2026, de mayor a
 * menor presupuesto (`src/lib/secop/region-familia.ts`).
 *
 * Público y sin datos de cuenta: la caché la hace el CDN con `s-maxage`, una
 * consulta por región y familia cada 6 h, como la portada. Si la base falla,
 * 503 sin caché y el panel ofrece reintentar.
 */

import { NextResponse } from "next/server";
import { esRegionValida, regionFamilia } from "@/src/lib/secop/region-familia";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { dpto: string; familia: string } }
) {
  if (!esRegionValida(params.dpto, params.familia)) {
    return NextResponse.json({ error: "Región o familia no válida" }, { status: 400 });
  }
  try {
    const region = await regionFamilia(params.dpto, params.familia);
    return NextResponse.json(region, {
      headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=3600" },
    });
  } catch (error) {
    console.error("[api/portada/region]", error);
    return NextResponse.json(
      { error: "Región no disponible" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
