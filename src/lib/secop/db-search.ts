/**
 * Búsqueda de PROCESOS contra Postgres (Neon, ingesta cron) — Fase 3: el
 * workbench pasa a leer de aquí primero; Socrata live queda como fallback si
 * la base falla (ver `app/api/secop/route.ts`) y como fuente de `probe`.
 *
 * `proceso` (tabla hechos) solo normaliza un subconjunto de columnas
 * (secopProcesoId, referencia, objeto, modalidad, tipoContrato,
 * fechaPublicacion, valorEstimado, estadoActual, documentAccess…). Varios
 * campos que el veredicto Nivel 0 y la UI necesitan (unspsc, estado de
 * apertura, valor de adjudicación, adjudicatario, fase, descripción separada
 * del nombre) NO tienen columna propia — viven en el JSON crudo de Socrata
 * (`raw_record.payload`, mismas llaves que `FIELDS_PROCESOS` en config.ts) y
 * se extraen ahí vía jsonb (igual que `urlproceso` en recientes.ts).
 *
 * `clasificacion_sectorial` (el clasificador UNSPSC) está vacía hoy — el
 * filtro "solo sector agua" reproduce el mismo OR de keywords que usa
 * Socrata live, pero contra los campos extraídos del JSON crudo.
 *
 * Spec: docs/superpowers/specs/2026-07-15-vista-simple-y-elegibilidad-diferida.md
 */

import { FIELDS_PROCESOS, KEYWORDS_AGUA, PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX } from './config';
import { accessMessage, type DocumentAccess } from './document-access';
import { SECTOR_KEYWORDS } from './sectorKeywords';
import type { SecopProceso, SecopQuery, SecopResult } from './types';

const F = FIELDS_PROCESOS;

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** `urlproceso` llega como `{ url }`, string, o basura (igual que en client.ts). */
function extractUrl(v: unknown): string | null {
  if (typeof v === 'string' && v.startsWith('http')) return v;
  if (typeof v === 'object' && v !== null && 'url' in v) {
    const u = (v as { url?: unknown }).url;
    return typeof u === 'string' && u.startsWith('http') ? u : null;
  }
  return null;
}

const DOCUMENT_ACCESS_VALUES: DocumentAccess[] = ['PUBLIC', 'RESTRICTED', 'NOT_PUBLISHED', 'UNKNOWN'];
function isDocumentAccess(v: unknown): v is DocumentAccess {
  return typeof v === 'string' && (DOCUMENT_ACCESS_VALUES as string[]).includes(v);
}

/**
 * Fila cruda del select: columnas normalizadas de `proceso`/`entidad`/`geografia`
 * MÁS los campos extraídos de `raw_record.payload` (sufijo `Raw`) que no tienen
 * columna propia. `numeric` de Postgres llega como string.
 */
export interface DbProcesoRow {
  secopProcesoId: string;
  referencia: string | null;
  objeto: string | null; // proceso.objeto — fallback si el JSON crudo no trae nombre
  modalidad: string | null;
  tipoContrato: string | null;
  fechaPublicacion: string | null;
  precioBase: string | null;
  estadoActual: string | null;
  documentAccess: string | null;
  entidadNombre: string | null;
  departamento: string | null;
  ciudad: string | null;
  // extraídos de raw_record.payload (jsonb ->>)
  nombreRaw: string | null;
  descripcionRaw: string | null;
  faseRaw: string | null;
  unspscRaw: string | null;
  adjudicadoRaw: string | null;
  valorAdjudicacionRaw: string | null;
  adjudicatarioRaw: string | null;
  estadoAperturaRaw: string | null;
  urlRaw: unknown;
}

export function mapDbRowToProceso(row: DbProcesoRow): SecopProceso {
  const documentAccess: DocumentAccess = isDocumentAccess(row.documentAccess) ? row.documentAccess : 'UNKNOWN';
  const apertura = row.estadoAperturaRaw;
  return {
    id: row.secopProcesoId,
    referencia: row.referencia ?? '',
    nombre: row.nombreRaw ?? row.objeto ?? '',
    descripcion: row.descripcionRaw ?? '',
    entidad: row.entidadNombre ?? '',
    departamento: row.departamento ?? '',
    ciudad: row.ciudad ?? '',
    estado: row.estadoActual ?? '',
    fase: row.faseRaw ?? '',
    modalidad: row.modalidad ?? '',
    tipoContrato: row.tipoContrato ?? '',
    fechaPublicacion: row.fechaPublicacion,
    precioBase: toNumber(row.precioBase),
    adjudicado: (row.adjudicadoRaw ?? '').toLowerCase() === 'si',
    valorAdjudicacion: toNumber(row.valorAdjudicacionRaw),
    adjudicatario: row.adjudicatarioRaw ?? null,
    unspsc: row.unspscRaw ?? null,
    url: extractUrl(row.urlRaw),
    estadoApertura: apertura === 'Abierto' || apertura === 'Cerrado' ? apertura : null,
    documentAccess,
    accessMessage: accessMessage(documentAccess),
  };
}

/**
 * Import perezoso de `db`/`schema`/`drizzle-orm` (igual que `recientes.ts`):
 * si no hay `DATABASE_URL`, el error queda contenido en el caller, que cae a
 * Socrata. Devuelve las tablas + operadores + el WHERE ya armado, listos para
 * que `searchProcesosDb`/`countProcesosDb` monten su propio SELECT.
 */
async function prepare(query: SecopQuery) {
  const [{ db, schema }, ops] = await Promise.all([
    import('@/src/lib/db/client'),
    import('drizzle-orm'),
  ]);
  const { and, eq, gte, ilike, isNull, or, sql } = ops;
  const { proceso, entidad, geografia, rawRecord } = schema;
  const payload = rawRecord.payload;

  const nombreRaw = sql<string | null>`(${payload}->>${F.nombre})`;
  const descripcionRaw = sql<string | null>`(${payload}->>${F.descripcion})`;
  const aperturaRaw = sql<string | null>`(${payload}->>${F.estadoApertura})`;

  const aguaClauses =
    query.soloAgua !== false && !query.sector
      ? KEYWORDS_AGUA.flatMap((kw) => [ilike(nombreRaw, `%${kw}%`), ilike(descripcionRaw, `%${kw}%`)])
      : [];

  const sectorClauses = query.sector
    ? SECTOR_KEYWORDS[query.sector].flatMap((kw) => [ilike(nombreRaw, `%${kw}%`), ilike(descripcionRaw, `%${kw}%`)])
    : [];

  const conditions = [
    isNull(proceso.deletedAt),
    aguaClauses.length > 0 ? or(...aguaClauses) : undefined,
    sectorClauses.length > 0 ? or(...sectorClauses) : undefined,
    query.departamento ? ilike(geografia.departamentoNombre, `%${query.departamento}%`) : undefined,
    query.estado ? eq(proceso.estadoActual, query.estado) : undefined,
    query.valorMin != null ? gte(proceso.valorEstimado, String(query.valorMin)) : undefined,
    query.desde ? gte(proceso.fechaPublicacion, query.desde) : undefined,
    query.apertura ? eq(aperturaRaw, query.apertura) : undefined,
    query.q ? or(ilike(proceso.objeto, `%${query.q}%`), ilike(entidad.nombre, `%${query.q}%`)) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);

  return { db, eq, sql, where: and(...conditions), proceso, entidad, geografia, rawRecord, payload };
}

/**
 * Busca PROCESOS en Postgres (Fase 3). Mismo `SecopQuery` que la búsqueda
 * live, para que el caller pueda intercambiar ambas fuentes sin tocar la UI.
 */
export async function searchProcesosDb(query: SecopQuery = {}): Promise<SecopResult<SecopProceso>> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(query.pageSize ?? PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX);
  const { db, eq, sql, where, proceso, entidad, geografia, rawRecord, payload } = await prepare(query);

  const orderCol = query.orden === 'valor' ? proceso.valorEstimado : proceso.fechaPublicacion;

  const rows = await db
    .select({
      secopProcesoId: proceso.secopProcesoId,
      referencia: proceso.referencia,
      objeto: proceso.objeto,
      modalidad: proceso.modalidad,
      tipoContrato: proceso.tipoContrato,
      fechaPublicacion: proceso.fechaPublicacion,
      precioBase: sql<string | null>`${proceso.valorEstimado}::text`,
      estadoActual: proceso.estadoActual,
      documentAccess: proceso.documentAccess,
      entidadNombre: entidad.nombre,
      departamento: geografia.departamentoNombre,
      ciudad: geografia.municipioNombre,
      nombreRaw: sql<string | null>`(${payload}->>${F.nombre})`,
      descripcionRaw: sql<string | null>`(${payload}->>${F.descripcion})`,
      faseRaw: sql<string | null>`(${payload}->>${F.fase})`,
      unspscRaw: sql<string | null>`(${payload}->>${F.unspsc})`,
      adjudicadoRaw: sql<string | null>`(${payload}->>${F.adjudicado})`,
      valorAdjudicacionRaw: sql<string | null>`(${payload}->>${F.valorAdjudicacion})`,
      adjudicatarioRaw: sql<string | null>`(${payload}->>${F.adjudicatario})`,
      estadoAperturaRaw: sql<string | null>`(${payload}->>${F.estadoApertura})`,
      urlRaw: sql<unknown>`(${payload}->${F.url})`,
    })
    .from(proceso)
    .leftJoin(entidad, eq(proceso.entidadId, entidad.id))
    .leftJoin(geografia, eq(proceso.geografiaId, geografia.codigoDivipola))
    .leftJoin(rawRecord, eq(proceso.rawRecordIdActual, rawRecord.id))
    .where(where)
    .orderBy(sql`${orderCol} DESC NULLS LAST`)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { items: rows.map((r) => mapDbRowToProceso(r as DbProcesoRow)), page, pageSize };
}

/** Total de PROCESOS que matchean el query en Postgres — barato (índices propios, no SODA). */
export async function countProcesosDb(query: SecopQuery = {}): Promise<number> {
  const { db, eq, sql, where, proceso, entidad, geografia, rawRecord } = await prepare(query);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(proceso)
    .leftJoin(entidad, eq(proceso.entidadId, entidad.id))
    .leftJoin(geografia, eq(proceso.geografiaId, geografia.codigoDivipola))
    .leftJoin(rawRecord, eq(proceso.rawRecordIdActual, rawRecord.id))
    .where(where);
  return count;
}

export { KEYWORDS_AGUA };
export type { SecopQuery, SecopResult, SecopProceso };
