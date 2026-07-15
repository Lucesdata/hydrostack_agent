/**
 * Vista rápida "últimos 25 procesos" — momento 1 (ver, sin filtrar).
 *
 * Lee de la tabla `proceso` (Neon, ingesta cron) con joins mínimos; si la base
 * está vacía o falla (p. ej. sin DATABASE_URL en local), degrada a Socrata live
 * con la query por defecto. Sin count, sin verdict, sin probe: eso pertenece al
 * momento 2 (elegibilidad on-demand).
 *
 * Spec: docs/superpowers/specs/2026-07-15-vista-simple-y-elegibilidad-diferida.md
 */

import type { SecopProceso } from './types';

export const RECIENTES_LIMIT = 25;

/** DTO liviano de la tarjeta simple. Todo lo que la vista rápida necesita. */
export interface ProcesoResumen {
  id: string;
  referencia: string | null;
  objeto: string;
  entidad: string | null;
  departamento: string | null;
  municipio: string | null;
  modalidad: string | null;
  estado: string | null;
  valorEstimado: number | null;
  fechaPublicacion: string | null;
  url: string | null;
}

export interface ProcesosRecientesResult {
  items: ProcesoResumen[];
  fuente: 'db' | 'live';
}

/** `urlproceso` llega como `{ url }`, string, o basura. Igual que en client.ts. */
export function extractUrlProceso(v: unknown): string | null {
  if (typeof v === 'string' && v.startsWith('http')) return v;
  if (typeof v === 'object' && v !== null && 'url' in v) {
    const u = (v as { url?: unknown }).url;
    return typeof u === 'string' && u.startsWith('http') ? u : null;
  }
  return null;
}

/** Fila cruda del select (numeric llega como string desde pg). */
export interface RecienteRow {
  secopProcesoId: string;
  referencia: string | null;
  objeto: string | null;
  modalidad: string | null;
  estado: string | null;
  valorEstimado: string | null;
  fechaPublicacion: string | null;
  entidadNombre: string | null;
  departamento: string | null;
  municipio: string | null;
  urlRaw: unknown;
}

export function mapRowToResumen(r: RecienteRow): ProcesoResumen {
  const valor = r.valorEstimado != null ? Number(r.valorEstimado) : null;
  return {
    id: r.secopProcesoId,
    referencia: r.referencia,
    objeto: r.objeto ?? '',
    entidad: r.entidadNombre,
    departamento: r.departamento,
    municipio: r.municipio,
    modalidad: r.modalidad,
    estado: r.estado,
    valorEstimado: valor != null && Number.isFinite(valor) ? valor : null,
    fechaPublicacion: r.fechaPublicacion,
    url: extractUrlProceso(r.urlRaw),
  };
}

export function mapLiveToResumen(p: SecopProceso): ProcesoResumen {
  return {
    id: p.id,
    referencia: p.referencia || null,
    objeto: p.nombre || p.descripcion || '',
    entidad: p.entidad || null,
    departamento: p.departamento || null,
    municipio: p.ciudad || null,
    modalidad: p.modalidad || null,
    estado: p.estado || null,
    valorEstimado: p.precioBase,
    fechaPublicacion: p.fechaPublicacion,
    url: p.url,
  };
}

async function fromDb(): Promise<ProcesoResumen[]> {
  // Import perezoso: si el cliente de base no puede construirse (sin
  // DATABASE_URL), el error queda contenido aquí y aplica el fallback live.
  const [{ db }, schema, { eq, isNull, sql }] = await Promise.all([
    import('@/src/lib/db/client'),
    import('@/src/lib/db/schema'),
    import('drizzle-orm'),
  ]);
  const { proceso, entidad, geografia, rawRecord } = schema;

  const rows = await db
    .select({
      secopProcesoId: proceso.secopProcesoId,
      referencia: proceso.referencia,
      objeto: proceso.objeto,
      modalidad: proceso.modalidad,
      estado: proceso.estadoActual,
      valorEstimado: proceso.valorEstimado,
      fechaPublicacion: proceso.fechaPublicacion,
      entidadNombre: entidad.nombre,
      departamento: geografia.departamentoNombre,
      municipio: geografia.municipioNombre,
      urlRaw: sql<unknown>`${rawRecord.payload}->'urlproceso'`,
    })
    .from(proceso)
    .leftJoin(entidad, eq(proceso.entidadId, entidad.id))
    .leftJoin(geografia, eq(proceso.geografiaId, geografia.codigoDivipola))
    .leftJoin(rawRecord, eq(proceso.rawRecordIdActual, rawRecord.id))
    .where(isNull(proceso.deletedAt))
    .orderBy(sql`${proceso.fechaPublicacion} DESC NULLS LAST`)
    .limit(RECIENTES_LIMIT);

  return rows.map(mapRowToResumen);
}

async function fromLive(): Promise<ProcesoResumen[]> {
  const { searchProcesos } = await import('./client');
  const result = await searchProcesos({
    orden: 'fecha',
    soloAgua: true,
    page: 1,
    pageSize: RECIENTES_LIMIT,
  });
  return result.items.map(mapLiveToResumen);
}

/** Últimos 25 procesos: base propia primero, Socrata como red de seguridad. */
export async function getProcesosRecientes(): Promise<ProcesosRecientesResult> {
  try {
    const items = await fromDb();
    if (items.length > 0) return { items, fuente: 'db' };
  } catch {
    // base no disponible → live
  }
  try {
    return { items: await fromLive(), fuente: 'live' };
  } catch {
    return { items: [], fuente: 'live' };
  }
}
