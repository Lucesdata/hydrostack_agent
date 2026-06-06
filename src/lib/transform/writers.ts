/**
 * Writers de la transformación raw → canónico (0.4).
 *
 * Cada writer:
 *   · recibe una proyección pura (mapCanonical) más los ids ya resueltos,
 *   · hace UPSERT por clave natural (D2 — UUID interno PK, NIT/secop_id UNIQUE),
 *   · devuelve el id interno (uuid) para que el orquestador encadene.
 *
 * Idempotencia (0.4 §2): segunda corrida con el mismo input = mismo estado.
 * Re-escribir TODAS las columnas no-PK en cada upsert evita columnas zombi si
 * la lógica deja de calcular un campo en el futuro.
 *
 * Inmutables (0.1 §4.3): contrato.valor_inicial y contrato.fecha_fin_inicial
 * solo se fijan en INSERT; en UPDATE NO se tocan. *_actual sí.
 */

import { and, eq, isNotNull, sql } from 'drizzle-orm';
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
import type {
  ContratoProjection,
  EntidadProjection,
  GeoHints,
  ProcesoProjection,
  ProveedorProjection,
} from './mapCanonical';

type Db = NeonDatabase<typeof schema>;

// --- Resolución de geografía -----------------------------------------------

/**
 * Cache en memoria de `geografia_alias` para la duración de la corrida. Una
 * sola query al inicio; los lookups siguientes son O(1). El tamaño del crosswalk
 * (decenas de KB en 0.4) entra cómodo en RAM.
 */
export class GeoResolver {
  constructor(private readonly aliases: Map<string, string>) {}

  static async load(db: Db): Promise<GeoResolver> {
    const rows = await db
      .select({ texto: geografiaAlias.textoNormalizado, divipola: geografiaAlias.codigoDivipola })
      .from(geografiaAlias);
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

/** Upsert proveedor por nit_canonico (UNIQUE). */
export async function upsertProveedor(db: Db, p: ProveedorProjection): Promise<string> {
  const [row] = await db
    .insert(proveedor)
    .values({
      nitCanonico: p.nitCanonico,
      nitDv: p.nitDv,
      tipoDocumento: p.tipoDocumento,
      razonSocial: p.razonSocial,
      esEstructuraPlural: p.esEstructuraPlural,
      rawAttrs: p.rawAttrs,
    })
    .onConflictDoUpdate({
      target: proveedor.nitCanonico,
      set: {
        nitDv: p.nitDv,
        tipoDocumento: p.tipoDocumento,
        razonSocial: p.razonSocial,
        esEstructuraPlural: p.esEstructuraPlural,
        rawAttrs: p.rawAttrs,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: proveedor.id });
  return row.id;
}

/** Upsert entidad por nit_canonico (UNIQUE). geografia_id opcional. */
export async function upsertEntidad(
  db: Db,
  e: EntidadProjection,
  geografiaId: string | null,
): Promise<string> {
  const [row] = await db
    .insert(entidad)
    .values({
      nitCanonico: e.nitCanonico,
      nitDv: e.nitDv,
      nombre: e.nombre,
      nivelGobierno: e.nivelGobierno,
      sectorAdministrativo: e.sectorAdministrativo,
      geografiaId,
      rawAttrs: e.rawAttrs,
    })
    .onConflictDoUpdate({
      target: entidad.nitCanonico,
      set: {
        nitDv: e.nitDv,
        nombre: e.nombre,
        nivelGobierno: e.nivelGobierno,
        sectorAdministrativo: e.sectorAdministrativo,
        geografiaId,
        rawAttrs: e.rawAttrs,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: entidad.id });
  return row.id;
}

// --- Upserts de hechos ------------------------------------------------------

/** Upsert proceso por secop_proceso_id (UNIQUE). */
export async function upsertProceso(
  db: Db,
  p: ProcesoProjection,
  entidadId: string | null,
  geografiaId: string | null,
  rawRecordId: string,
): Promise<string> {
  const [row] = await db
    .insert(proceso)
    .values({
      secopProcesoId: p.secopProcesoId,
      portafolioId: p.portafolioId,
      referencia: p.referencia,
      entidadId: entidadId ?? undefined,
      geografiaId,
      modalidad: p.modalidad,
      tipoContrato: p.tipoContrato,
      objeto: p.objeto,
      valorEstimado: p.valorEstimado !== null ? String(p.valorEstimado) : null,
      fechaPublicacion: p.fechaPublicacion,
      estadoActual: p.estadoActual,
      estadoCodigo: p.estadoCodigo,
      rawRecordIdActual: rawRecordId,
    })
    .onConflictDoUpdate({
      target: proceso.secopProcesoId,
      set: {
        portafolioId: p.portafolioId,
        referencia: p.referencia,
        entidadId: entidadId ?? undefined,
        geografiaId,
        modalidad: p.modalidad,
        tipoContrato: p.tipoContrato,
        objeto: p.objeto,
        valorEstimado: p.valorEstimado !== null ? String(p.valorEstimado) : null,
        fechaPublicacion: p.fechaPublicacion,
        estadoActual: p.estadoActual,
        estadoCodigo: p.estadoCodigo,
        rawRecordIdActual: rawRecordId,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: proceso.id });
  return row.id;
}

/**
 * Upsert contrato por secop_contrato_id (UNIQUE).
 *
 * Reglas inmutables (0.1 §4.3): `valor_inicial` y `fecha_fin_inicial` SOLO se
 * fijan en INSERT. En UPDATE no se tocan — son la foto del contrato firmado.
 * `valor_actual` y `fecha_fin_actual` sí se actualizan (mutan vía eventos en
 * Fase 1; en 0.4 reflejan lo último visto).
 */
export async function upsertContrato(
  db: Db,
  c: ContratoProjection,
  refs: {
    entidadId: string | null;
    proveedorId: string | null;
    procesoId: string | null;
    geografiaId: string | null;
    rawRecordId: string;
  },
): Promise<string> {
  const valorAsText = c.valorContrato !== null ? String(c.valorContrato) : null;
  const valorFacturado = c.valorFacturado !== null ? String(c.valorFacturado) : null;
  const valorPagado = c.valorPagado !== null ? String(c.valorPagado) : null;
  const valorPendiente = c.valorPendientePago !== null ? String(c.valorPendientePago) : null;

  const [row] = await db
    .insert(contrato)
    .values({
      secopContratoId: c.secopContratoId,
      procesoId: refs.procesoId ?? undefined,
      proveedorId: refs.proveedorId ?? undefined,
      proveedorRaw: c.proveedorRaw,
      entidadId: refs.entidadId ?? undefined,
      geografiaId: refs.geografiaId,
      objeto: c.objeto,
      referencia: c.referencia,
      modalidad: c.modalidad,
      tipoContrato: c.tipoContrato,
      valorInicial: valorAsText, // INSERT: fija el valor inicial
      valorActual: valorAsText, // INSERT: igual al inicial al firmar
      fechaFirma: c.fechaFirma,
      fechaInicio: c.fechaInicio,
      fechaFinInicial: c.fechaFin, // INSERT: fija el fin inicial
      fechaFinActual: c.fechaFin, // INSERT: igual al inicial al firmar
      estadoActual: c.estadoActual,
      prorrogable: c.prorrogable,
      valorFacturado,
      valorPagado,
      valorPendientePago: valorPendiente,
      rawRecordIdActual: refs.rawRecordId,
    })
    .onConflictDoUpdate({
      target: contrato.secopContratoId,
      set: {
        // No se tocan valorInicial ni fechaFinInicial (inmutables).
        procesoId: refs.procesoId ?? undefined,
        proveedorId: refs.proveedorId ?? undefined,
        proveedorRaw: c.proveedorRaw,
        entidadId: refs.entidadId ?? undefined,
        geografiaId: refs.geografiaId,
        objeto: c.objeto,
        referencia: c.referencia,
        modalidad: c.modalidad,
        tipoContrato: c.tipoContrato,
        valorActual: valorAsText,
        fechaFirma: c.fechaFirma,
        fechaInicio: c.fechaInicio,
        fechaFinActual: c.fechaFin,
        estadoActual: c.estadoActual,
        prorrogable: c.prorrogable,
        valorFacturado,
        valorPagado,
        valorPendientePago: valorPendiente,
        rawRecordIdActual: refs.rawRecordId,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: contrato.id });
  return row.id;
}

// --- Resolución de proceso↔contrato por portafolio (D11) -------------------

/**
 * Resuelve `proceso.id` desde el `proceso_de_compra` (CO1.BDOS) del contrato.
 * H1/D11 validó esta llave 10/10. Si el proceso no existe (ventana BDOS
 * disjunta de la muestra), devuelve null y el contrato queda con proceso_id
 * NULL — NO se descarta (0.2.2 §9.4).
 */
export async function resolveProcesoIdByPortafolio(
  db: Db,
  portafolioId: string | null,
): Promise<string | null> {
  if (!portafolioId) return null;
  const rows = await db
    .select({ id: proceso.id })
    .from(proceso)
    .where(and(eq(proceso.portafolioId, portafolioId), isNotNull(proceso.portafolioId)))
    .limit(1);
  return rows[0]?.id ?? null;
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

/** Registra una fila no mapeable. Append-only, sin upsert. */
export async function quarantine(db: Db, entry: QuarantineEntry): Promise<void> {
  await db.insert(transformQuarantine).values({
    rawRecordId: entry.rawRecordId,
    source: entry.source,
    sourceRecordId: entry.sourceRecordId,
    reason: entry.reason,
    detail: entry.detail ?? null,
    batchId: entry.batchId,
  });
}
