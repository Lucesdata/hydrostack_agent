/**
 * GET /api/procesos/recientes — endpoint liviano de la vista rápida.
 *
 * Últimos 25 procesos desde Postgres (fallback Socrata). No lee la request →
 * Next lo cachea estático y lo revalida cada 5 min (ISR). Sin count, sin
 * verdict, sin probe: momento 1, solo ver.
 */

import { NextResponse } from 'next/server';
import { getProcesosRecientes } from '@/src/lib/secop/recientes';

export const runtime = 'nodejs';
export const revalidate = 300;

export async function GET() {
  const result = await getProcesosRecientes();
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
}
