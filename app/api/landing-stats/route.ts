import { NextResponse } from 'next/server';
import { getNuevos7d, getEnJuegoMes, getDestacado } from '@/src/lib/secop/landingStats';

export const runtime = 'nodejs';
export const revalidate = 1800;

export interface LandingStatsResponse {
  nuevos7d: number | null;
  enJuego: { totalCop: number | null; procesos: number | null };
  destacado: Awaited<ReturnType<typeof getDestacado>>;
}

/**
 * Agregados en vivo para las dashboard cards del landing. Cada query es
 * independiente (Promise.allSettled): si Socrata falla para una, las otras
 * siguen sirviendo dato real y la card fallida degrada a null — nunca se
 * lanza un error al cliente.
 */
export async function GET() {
  const [nuevos7d, enJuego, destacado] = await Promise.allSettled([
    getNuevos7d(),
    getEnJuegoMes(),
    getDestacado(),
  ]);

  const body: LandingStatsResponse = {
    nuevos7d: nuevos7d.status === 'fulfilled' ? nuevos7d.value : null,
    enJuego: enJuego.status === 'fulfilled' ? enJuego.value : { totalCop: null, procesos: null },
    destacado: destacado.status === 'fulfilled' ? destacado.value : null,
  };

  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
  });
}
