import { NextResponse } from "next/server";
import { getProcesosVigilados } from "@/src/lib/landing/cifras";

export const runtime = "nodejs";
export const revalidate = 1800;

export interface LandingStatsResponse {
  /** Leído de la base (no de Socrata). `null` si la base no responde. */
  sector: { procesosVigilados: number | null };
}

/**
 * La línea bajo el CTA del hero: cuántos procesos del sector vigila el
 * producto. Es lo único que la portada lee de aquí.
 *
 * Hasta el 2026-09-27 servía también `nuevos7d`, `enJuego`, `destacado`,
 * `ultimaConsulta` y las otras dos cifras del sector —tres consultas en vivo
 * a Socrata y cuatro a la base por visita— para las tarjetas y la banda "El
 * mercado ahora", que ya no existen. Se conserva la forma `sector.*` para no
 * tocar al cliente. Nunca lanza: sin base, la cifra es `null` y el hero pinta
 * la frase sin número.
 */
export async function GET() {
  let procesosVigilados: number | null = null;
  try {
    procesosVigilados = await getProcesosVigilados();
  } catch {
    // `getProcesosVigilados` ya degrada a null; esto es la red por si alguna vez lanza.
  }

  const body: LandingStatsResponse = { sector: { procesosVigilados } };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
  });
}
