/**
 * Writers de la transformación raw → canónico (0.4).
 *
 * POR LOTES: cada writer recibe TODAS las proyecciones de la corrida y las
 * persiste en INSERTs multi-fila `ON CONFLICT DO UPDATE` troceados (chunk).
 * Con ~124k registros por corrida, los upserts fila-a-fila generaban >300k
 * round-trips secuenciales a Neon (horas de corrida) y morían con
 * "Connection terminated unexpectedly" a mitad de camino. En lotes son ~300
 * statements (minutos), cada uno reintentable ante cortes transitorios.
 *
 * Semántica preservada del diseño fila-a-fila:
 *   · UPSERT por clave natural (D2 — UUID interno PK, NIT/secop_id UNIQUE).
 *   · Idempotencia (0.4 §2): segunda corrida con el mismo input = mismo estado.
 *     Por eso los reintentos transitorios son seguros.
 *   · Re-escribir TODAS las columnas no-PK en UPDATE (vía `excluded.*`) evita
 *     columnas zombi… con dos excepciones deliberadas:
 *     - Inmutables (0.1 §4.3): contrato.valor_inicial y fecha_fin_inicial solo
 *       se fijan en INSERT.
 *     - FKs opcionales (entidad_id/proveedor_id/proceso_id): si la corrida no
 *       las resolvió (NULL), se conserva el valor existente (coalesce) — igual
 *       que el `?? undefined` del diseño anterior.
 *   · Claves repetidas dentro de la corrida: gana la última aparición
 *     (dedupLastWins), el mismo resultado que dejaban los upserts secuenciales.
 */

import { isNotNull, sql } from 'drizzle-orm';
import type { NeonDatabase } from 'drizzle-orm/neon-serverless';
import {
  contrato,
  entidad,
  geografiaAlias,
  proceso,
  proveedor,
  transformQuarantine,
} from '@/src/lib/db/schema';
import type * as schema from '@/src/lib/db/schema';
import { chunk, dedupLastWins } from '@/src/lib/db/batch';
import { withTransientRetry } from '@/src/lib/db/transient';
import type {
  ContratoProjection,
  EntidadProjection,
  GeoHints,
  ProcesoProjection,
  ProveedorProjection,
} from './mapCanonical';
import type { DocumentAccessResult } from '@/src/lib/secop/document-access';

type Db = NeonDatabase<typeof schema>;

/** Filas por statement. Techo real: 65.535 parámetros bind por statement en
 *  Postgres; contrato es la tabla más ancha (~23 columnas) → 500×23 ≈ 11.5k. */
const CHUNK_SIZE = 500;

// --- Resolución de geografía -----------------------------------------------

/**
 * Cache en memoria de `geografia_alias` para la duración de la corrida. Una
 * sola query al inicio; los lookups siguientes son O(1). El tamaño del crosswalk
 * (decenas de KB en 0.4) entra cómodo en RAM.
 */
export class GeoResolver {
  constructor(private readonly aliases: Map<string, string>) {}

  static async load(db: Db): Promise<GeoResolver> {
    const rows = await withTransientRetry(() =>
      db
        .select({ texto: geografiaAlias.textoNormalizado, divipola: geografiaAlias.codigoDivipola })
        .from(geografiaAlias),
    );
    return new GeoResolver(new Map(rows.map((r) => [r.texto, r.divipola])));
  }

  /** D25: prioriza municipio (más específico); cae a departamento; null si nada. */
  resolve(hints: GeoHints): string | null {
    if (hints.municipio) {
      const mun = this.aliases.get(hints.municipio);
      if (mun) return mun;
    }
    if (hints.departamento) {
      const dep = this.aliases.get(hints.departamento);
      if (dep) return dep;
    }
    return null;
  }

  size(): number {
    return this.aliases.size;
  }
}

// --- Upserts de catálogos ---------------------------------------------------

export interface EntidadItem {
  proj: EntidadProjection;
  geografiaId: string | null;
}

/** Upsert por lotes de entidades (nit_canonico UNIQUE). → Map nit → id. */
export async function batchUpsertEntidades(
  db: Db,
  items: EntidadItem[],
): Promise<Map<string, string>> {
  const idByNit = new Map<string, string>();
  const deduped = dedupLastWins(items, (i) => i.proj.nitCanonico);
  for (const batch of chunk(deduped, CHUNK_SIZE)) {
    const rows = await withTransientRetry(() =>
      db
        .insert(entidad)
        .values(
          batch.map(({ proj, geografiaId }) => ({
            nitCanonico: proj.nitCanonico,
            nitDv: proj.nitDv,
            nombre: proj.nombre,
            nivelGobierno: proj.nivelGobierno,
            sectorAdministrativo: proj.sectorAdministrativo,
            geografiaId,
            rawAttrs: proj.rawAttrs,
          })),
        )
        .onConflictDoUpdate({
          target: entidad.nitCanonico,
          set: {
            nitDv: sql`excluded.nit_dv`,
            nombre: sql`excluded.nombre`,
            nivelGobierno: sql`excluded.nivel_gobierno`,
            sectorAdministrativo: sql`excluded.sector_administrativo`,
            geografiaId: sql`excluded.geografia_id`,
            rawAttrs: sql`excluded.raw_attrs`,
            updatedAt: sql`now()`,
          },
        })
        .returning({ id: entidad.id, nit: entidad.nitCanonico }),
    );
    for (const r of rows) idByNit.set(r.nit, r.id);
  }
  return idByNit;
}

/** Upsert por lotes de proveedores (nit_canonico UNIQUE). → Map nit → id. */
export async function batchUpsertProveedores(
  db: Db,
  projs: ProveedorProjection[],
): Promise<Map<string, string>> {
  const idByNit = new Map<string, string>();
  const deduped = dedupLastWins(projs, (p) => p.nitCanonico);
  for (const batch of chunk(deduped, CHUNK_SIZE)) {
    const rows = await withTransientRetry(() =>
      db
        .insert(proveedor)
        .values(
          batch.map((p) => ({
            nitCanonico: p.nitCanonico,
            nitDv: p.nitDv,
            tipoDocumento: p.tipoDocumento,
            razonSocial: p.razonSocial,
            esEstructuraPlural: p.esEstructuraPlural,
            rawAttrs: p.rawAttrs,
          })),
        )
        .onConflictDoUpdate({
          target: proveedor.nitCanonico,
          set: {
            nitDv: sql`excluded.nit_dv`,
            tipoDocumento: sql`excluded.tipo_documento`,
            razonSocial: sql`excluded.razon_social`,
            esEstructuraPlural: sql`excluded.es_estructura_plural`,
            rawAttrs: sql`excluded.raw_attrs`,
            updatedAt: sql`now()`,
          },
        })
        .returning({ id: proveedor.id, nit: proveedor.nitCanonico }),
    );
    for (const r of rows) idByNit.set(r.nit, r.id);
  }
  return idByNit;
}

// --- Upserts de hechos ------------------------------------------------------

export interface ProcesoItem {
  proj: ProcesoProjection;
  entidadId: string | null;
  geografiaId: string | null;
  rawRecordId: string;
  docAccess: DocumentAccessResult;
}

/** Upsert por lotes de procesos (secop_proceso_id UNIQUE). → filas escritas. */
export async function batchUpsertProcesos(db: Db, items: ProcesoItem[]): Promise<number> {
  let written = 0;
  const deduped = dedupLastWins(items, (i) => i.proj.secopProcesoId);
  for (const batch of chunk(deduped, CHUNK_SIZE)) {
    const rows = await withTransientRetry(() =>
      db
        .insert(proceso)
        .values(
          batch.map(({ proj, entidadId, geografiaId, rawRecordId, docAccess }) => ({
            secopProcesoId: proj.secopProcesoId,
            portafolioId: proj.portafolioId,
            referencia: proj.referencia,
            entidadId: entidadId ?? undefined,
            geografiaId,
            modalidad: proj.modalidad,
            tipoContrato: proj.tipoContrato,
            objeto: proj.objeto,
            valorEstimado: proj.valorEstimado !== null ? String(proj.valorEstimado) : null,
            fechaPublicacion: proj.fechaPublicacion,
            estadoActual: proj.estadoActual,
            estadoCodigo: proj.estadoCodigo,
            // El gate (B2/B3) se reescribe SIEMPRE: NOT_PUBLISHED/UNKNOWN se
            // re-evalúan en cada corrida porque el estado cambia con la fase.
            documentAccess: docAccess.state,
            documentAccessReason: docAccess.reason,
            documentAccessMethod: docAccess.method,
            documentAccessEvaluatedAt: sql`now()`,
            rawRecordIdActual: rawRecordId,
          })),
        )
        .onConflictDoUpdate({
          target: proceso.secopProcesoId,
          set: {
            portafolioId: sql`excluded.portafolio_id`,
            referencia: sql`excluded.referencia`,
            // Si la corrida no resolvió entidad, conserva la existente (mismo
            // efecto que el `?? undefined` del upsert fila a fila).
            entidadId: sql`coalesce(excluded.entidad_id, ${proceso.entidadId})`,
            geografiaId: sql`excluded.geografia_id`,
            modalidad: sql`excluded.modalidad`,
            tipoContrato: sql`excluded.tipo_contrato`,
            objeto: sql`excluded.objeto`,
            valorEstimado: sql`excluded.valor_estimado`,
            fechaPublicacion: sql`excluded.fecha_publicacion`,
            estadoActual: sql`excluded.estado_actual`,
            estadoCodigo: sql`excluded.estado_codigo`,
            documentAccess: sql`excluded.document_access`,
            documentAccessReason: sql`excluded.document_access_reason`,
            documentAccessMethod: sql`excluded.document_access_method`,
            documentAccessEvaluatedAt: sql`excluded.document_access_evaluated_at`,
            rawRecordIdActual: sql`excluded.raw_record_id_actual`,
            updatedAt: sql`now()`,
          },
        })
        .returning({ id: proceso.id }),
    );
    written += rows.length;
  }
  return written;
}

export interface ContratoItem {
  proj: ContratoProjection;
  entidadId: string | null;
  proveedorId: string | null;
  procesoId: string | null;
  geografiaId: string | null;
  rawRecordId: string;
}

/**
 * Upsert por lotes de contratos (secop_contrato_id UNIQUE). → filas escritas.
 *
 * Reglas inmutables (0.1 §4.3): `valor_inicial` y `fecha_fin_inicial` SOLO se
 * fijan en INSERT; en UPDATE no se tocan — son la foto del contrato firmado.
 * `valor_actual` y `fecha_fin_actual` sí se actualizan.
 */
export async function batchUpsertContratos(db: Db, items: ContratoItem[]): Promise<number> {
  let written = 0;
  const deduped = dedupLastWins(items, (i) => i.proj.secopContratoId);
  for (const batch of chunk(deduped, CHUNK_SIZE)) {
    const rows = await withTransientRetry(() =>
      db
        .insert(contrato)
        .values(
          batch.map(({ proj, entidadId, proveedorId, procesoId, geografiaId, rawRecordId }) => {
            const valorAsText = proj.valorContrato !== null ? String(proj.valorContrato) : null;
            return {
              secopContratoId: proj.secopContratoId,
              procesoId: procesoId ?? undefined,
              proveedorId: proveedorId ?? undefined,
              proveedorRaw: proj.proveedorRaw,
              entidadId: entidadId ?? undefined,
              geografiaId,
              objeto: proj.objeto,
              referencia: proj.referencia,
              modalidad: proj.modalidad,
              tipoContrato: proj.tipoContrato,
              valorInicial: valorAsText, // INSERT: fija el valor inicial
              valorActual: valorAsText, // INSERT: igual al inicial al firmar
              fechaFirma: proj.fechaFirma,
              fechaInicio: proj.fechaInicio,
              fechaFinInicial: proj.fechaFin, // INSERT: fija el fin inicial
              fechaFinActual: proj.fechaFin, // INSERT: igual al inicial al firmar
              estadoActual: proj.estadoActual,
              prorrogable: proj.prorrogable,
              valorFacturado: proj.valorFacturado !== null ? String(proj.valorFacturado) : null,
              valorPagado: proj.valorPagado !== null ? String(proj.valorPagado) : null,
              valorPendientePago:
                proj.valorPendientePago !== null ? String(proj.valorPendientePago) : null,
              rawRecordIdActual: rawRecordId,
            };
          }),
        )
        .onConflictDoUpdate({
          target: contrato.secopContratoId,
          set: {
            // No se tocan valorInicial ni fechaFinInicial (inmutables).
            // FKs no resueltas en esta corrida conservan el valor existente.
            procesoId: sql`coalesce(excluded.proceso_id, ${contrato.procesoId})`,
            proveedorId: sql`coalesce(excluded.proveedor_id, ${contrato.proveedorId})`,
            proveedorRaw: sql`excluded.proveedor_raw`,
            entidadId: sql`coalesce(excluded.entidad_id, ${contrato.entidadId})`,
            geografiaId: sql`excluded.geografia_id`,
            objeto: sql`excluded.objeto`,
            referencia: sql`excluded.referencia`,
            modalidad: sql`excluded.modalidad`,
            tipoContrato: sql`excluded.tipo_contrato`,
            valorActual: sql`excluded.valor_actual`,
            fechaFirma: sql`excluded.fecha_firma`,
            fechaInicio: sql`excluded.fecha_inicio`,
            fechaFinActual: sql`excluded.fecha_fin_actual`,
            estadoActual: sql`excluded.estado_actual`,
            prorrogable: sql`excluded.prorrogable`,
            valorFacturado: sql`excluded.valor_facturado`,
            valorPagado: sql`excluded.valor_pagado`,
            valorPendientePago: sql`excluded.valor_pendiente_pago`,
            rawRecordIdActual: sql`excluded.raw_record_id_actual`,
            updatedAt: sql`now()`,
          },
        })
        .returning({ id: contrato.id }),
    );
    written += rows.length;
  }
  return written;
}

// --- Resolución de proceso↔contrato por portafolio (D11) -------------------

/**
 * Índice `portafolio_id (CO1.BDOS) → proceso.id` de TODA la tabla proceso, en
 * una sola query. Reemplaza el lookup fila-a-fila: H1/D11 validó la llave
 * 10/10. Si el contrato no encuentra proceso (ventana BDOS disjunta), su
 * proceso_id queda NULL — NO se descarta (0.2.2 §9.4).
 */
export async function loadPortafolioIndex(db: Db): Promise<Map<string, string>> {
  const rows = await withTransientRetry(() =>
    db
      .select({ id: proceso.id, portafolioId: proceso.portafolioId })
      .from(proceso)
      .where(isNotNull(proceso.portafolioId)),
  );
  const byPortafolio = new Map<string, string>();
  for (const r of rows) {
    if (r.portafolioId) byPortafolio.set(r.portafolioId, r.id);
  }
  return byPortafolio;
}

// --- Cuarentena -------------------------------------------------------------

export interface QuarantineEntry {
  rawRecordId: string;
  source: string;
  sourceRecordId: string | null;
  reason: string;
  detail?: Record<string, unknown>;
  batchId?: string;
}

/**
 * Registra filas no mapeables por lotes. Append-only, sin upsert: un reintento
 * transitorio que llegue tras un commit sin ack puede duplicar filas de
 * cuarentena — tolerable (es un log de diagnóstico, no una tabla canónica).
 */
export async function batchQuarantine(db: Db, entries: QuarantineEntry[]): Promise<void> {
  for (const batch of chunk(entries, CHUNK_SIZE)) {
    await withTransientRetry(() =>
      db.insert(transformQuarantine).values(
        batch.map((entry) => ({
          rawRecordId: entry.rawRecordId,
          source: entry.source,
          sourceRecordId: entry.sourceRecordId,
          reason: entry.reason,
          detail: entry.detail ?? null,
          batchId: entry.batchId,
        })),
      ),
    );
  }
}
