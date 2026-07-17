/**
 * ──────────────────────────────────────────────────────────────────────────
 *  Landing · Dashboard cards en vivo (SECOP II, sector agua/saneamiento)
 * ──────────────────────────────────────────────────────────────────────────
 *
 *  Tres agregaciones puntuales para /api/landing-stats. Cada una es un solo
 *  $select de conteo/suma o $limit=1 contra Socrata — nunca se traen filas
 *  completas para agregar en JS. Reusa sodaFetch/buildAguaWhere de client.ts
 *  (mismo fetch, mismo app token, mismo manejo de errores) en vez de
 *  duplicarlos.
 *
 *  Best-effort: cada función atrapa sus propios errores y devuelve null en
 *  vez de lanzar, igual que countProcesos en client.ts. El caller (route
 *  handler) decide cómo degrada la UI.
 * ──────────────────────────────────────────────────────────────────────────
 */

import { sodaFetch, buildAguaWhere } from './client';
import { resolveDatasetId } from './datasetResolver';
import { FIELDS_PROCESOS, REVALIDATE_SEARCH } from './config';
import type { EstadoApertura } from './types';

const F = FIELDS_PROCESOS;

/** Colombia no observa horario de verano: el offset UTC-5 es constante. */
const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000;

/** Instante UTC → floating timestamp SoQL en hora Bogotá (mismo formato naive
 *  que usa el dataset, p.ej. "2022-01-18T00:00:00.000"). */
function toBogotaNaiveIso(date: Date): string {
  return new Date(date.getTime() - BOGOTA_OFFSET_MS).toISOString().replace('Z', '');
}

/** Año/mes calendario en hora Bogotá para el corte de "mes actual". */
function bogotaYearMonth(now: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  return {
    year: Number(parts.find((p) => p.type === 'year')?.value),
    month: Number(parts.find((p) => p.type === 'month')?.value),
  };
}

/** Primer día del mes actual (hora Bogotá), como floating timestamp SoQL. */
function bogotaMonthStartSoql(now: Date): string {
  const { year, month } = bogotaYearMonth(now);
  return `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000`;
}

/**
 * Card "Nuevos últimos 7 días": procesos del sector agua, en fase de
 * presentación de oferta y abiertos, publicados en la última semana.
 *
 * NOTA: la card original del spec pedía "cierran en 48h" sobre
 * `fecha_de_recepcion_de`, pero ese campo solo está poblado en ~2.6% de los
 * procesos abiertos (verificado en vivo 2026-07-17) — mostraría 0 casi
 * siempre. Se redefinió a esta métrica por decisión del owner.
 */
export async function getNuevos7d(now: Date = new Date()): Promise<number | null> {
  try {
    const cutoff = toBogotaNaiveIso(new Date(now.getTime() - 7 * 86_400_000));
    const where = [
      buildAguaWhere(),
      `${F.fase} = 'Presentación de oferta'`,
      `${F.estadoApertura} = 'Abierto'`,
      `${F.fechaPublicacion} >= '${cutoff}'`,
    ].join(' AND ');

    const rows = await sodaFetch<{ count?: string }>(
      await resolveDatasetId('procesos'),
      { $select: 'count(*) as count', $where: where, $limit: 1, $offset: 0 },
      { revalidate: REVALIDATE_SEARCH },
    );
    const n = Number(rows[0]?.count);
    return Number.isFinite(n) ? n : null;
  } catch (err) {
    console.warn(
      `[landingStats.getNuevos7d] falló (${err instanceof Error ? err.message : String(err)})`,
    );
    return null;
  }
}

export interface EnJuegoMes {
  totalCop: number | null;
  procesos: number | null;
}

/**
 * Card "$ en juego este mes": suma de precio_base y conteo de procesos
 * abiertos del sector agua publicados desde el día 1 del mes actual (hora
 * Bogotá).
 */
export async function getEnJuegoMes(now: Date = new Date()): Promise<EnJuegoMes> {
  try {
    const monthStart = bogotaMonthStartSoql(now);
    const where = [
      buildAguaWhere(),
      `${F.estadoApertura} = 'Abierto'`,
      `${F.fechaPublicacion} >= '${monthStart}'`,
    ].join(' AND ');

    const rows = await sodaFetch<{ total?: string; procesos?: string }>(
      await resolveDatasetId('procesos'),
      {
        $select: `sum(${F.precioBase}) as total, count(*) as procesos`,
        $where: where,
        $limit: 1,
        $offset: 0,
      },
      { revalidate: REVALIDATE_SEARCH },
    );
    const total = Number(rows[0]?.total);
    const procesos = Number(rows[0]?.procesos);
    return {
      totalCop: Number.isFinite(total) ? total : null,
      procesos: Number.isFinite(procesos) ? procesos : null,
    };
  } catch (err) {
    console.warn(
      `[landingStats.getEnJuegoMes] falló (${err instanceof Error ? err.message : String(err)})`,
    );
    return { totalCop: null, procesos: null };
  }
}

export interface DestacadoStat {
  id: string;
  referencia: string | null;
  objeto: string;
  entidad: string;
  departamento: string;
  ciudad: string;
  precioBase: number | null;
  fase: string;
  estadoApertura: EstadoApertura | null;
  /** ~2.6% de cobertura — casi siempre null; la UI debe tener fallback. */
  fechaRecepcion: string | null;
  url: string | null;
}

function extractUrl(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v !== null && 'url' in v) {
    return (v as { url?: string }).url ?? null;
  }
  return null;
}

/**
 * Card "Semáforo preview": el proceso abierto de mayor cuantía del sector
 * agua ($order=precio_base DESC, $limit=1).
 */
export async function getDestacado(): Promise<DestacadoStat | null> {
  try {
    const where = [buildAguaWhere(), `${F.estadoApertura} = 'Abierto'`].join(' AND ');

    const rows = await sodaFetch<Record<string, unknown>>(
      await resolveDatasetId('procesos'),
      {
        $select: [
          F.id,
          F.referencia,
          F.nombre,
          F.entidad,
          F.departamento,
          F.ciudad,
          F.precioBase,
          F.fase,
          F.estadoApertura,
          F.fechaRecepcion,
          F.url,
        ].join(', '),
        $where: where,
        $order: `${F.precioBase} DESC`,
        $limit: 1,
        $offset: 0,
      },
      { revalidate: REVALIDATE_SEARCH },
    );
    const row = rows[0];
    if (!row) return null;

    const apertura = row[F.estadoApertura];
    const precio = Number(row[F.precioBase]);

    return {
      id: String(row[F.id] ?? ''),
      referencia: (row[F.referencia] as string) ?? null,
      objeto: String(row[F.nombre] ?? ''),
      entidad: String(row[F.entidad] ?? ''),
      departamento: String(row[F.departamento] ?? ''),
      ciudad: String(row[F.ciudad] ?? ''),
      precioBase: Number.isFinite(precio) ? precio : null,
      fase: String(row[F.fase] ?? ''),
      estadoApertura: apertura === 'Abierto' || apertura === 'Cerrado' ? apertura : null,
      fechaRecepcion: (row[F.fechaRecepcion] as string) ?? null,
      url: extractUrl(row[F.url]),
    };
  } catch (err) {
    console.warn(
      `[landingStats.getDestacado] falló (${err instanceof Error ? err.message : String(err)})`,
    );
    return null;
  }
}
