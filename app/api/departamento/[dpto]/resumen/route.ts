/**
 * GET /api/departamento/[dpto]/resumen — destacados y serie semanal de un
 * departamento para la ficha del hero (`src/lib/secop/resumen-departamento.ts`).
 *
 * La ruta es dinámica (lee el parámetro), así que la caché la hace el CDN con
 * `s-maxage`: una consulta por departamento cada 6 h, igual que la portada, y
 * no una por visita. Si la base falla, 503 sin caché: la ficha dice "—" y el
 * siguiente intento vuelve a probar.
 */

import { NextResponse } from "next/server";
import { esCodigoDepartamento, resumenDepartamento } from "@/src/lib/secop/resumen-departamento";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { dpto: string } }) {
  if (!esCodigoDepartamento(params.dpto)) {
    return NextResponse.json({ error: "Código de departamento no válido" }, { status: 400 });
  }
  try {
    const resumen = await resumenDepartamento(params.dpto);
    return NextResponse.json(resumen, {
      headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=3600" },
    });
  } catch (error) {
    console.error("[api/departamento/resumen]", error);
    return NextResponse.json(
      { error: "Resumen no disponible" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
