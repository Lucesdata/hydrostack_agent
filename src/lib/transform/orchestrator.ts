/**
 * Orquestador del transform raw → canónico (0.4).
 *
 * Lee de raw_record (NUNCA re-descarga), aplica los normalizadores puros de
 * mapCanonical, y escribe en orden de dependencia:
 *
 *   1) Procesos (catálogos: entidad + geografia)
 *   2) Contratos (catálogos: entidad + proveedor; FK a proceso via portafolio)
 *
 * Procesos van ANTES que contratos para que `resolveProcesoIdByPortafolio`
 * encuentre el proceso correspondiente (D11). Si la muestra trae contratos sin
 * proceso (ventanas BDOS disjuntas, 0.2 §5.1), proceso_id queda NULL — el
 * contrato NO se descarta.
 *
 * Idempotente: corre dos veces sobre el mismo raw_record y deja el mismo
 * estado canónico (UPSERTs por clave natural; reescribe todas las columnas
 * no-PK en UPDATE para no dejar columnas zombi).
 *
 * Una sola fila por source_record_id (la MÁS RECIENTE por ingested_at), aunque
 * raw_record tenga varios snapshots (append-only). Eso preserva la semántica
 * de "foto actual" de la canónica.
 */

import { randomUUID } from 'node:crypto';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '@/src/lib/db/client';
import { rawRecord } from '@/src/lib/db/schema';
import { mapContratoRow, mapProcesoRow } from './mapCanonical';
import {
  GeoResolver,
  quarantine,
  resolveProcesoIdByPortafolio,
  upsertContrato,
  upsertEntidad,
  upsertProceso,
  upsertProveedor,
} from './writers';

export interface SourceMetrics {
  totalSnapshots: number; // filas en raw_record para la source
  uniqueRecords: number; // source_record_ids distintos (filas que entran al transform)
  entidadesUpsert: number;
  proveedoresUpsert: number;
  procesosUpsert: number;
  contratosUpsert: number;
  geografiaResuelta: number;
  geografiaNoResuelta: number;
  proveedorCentinela: number; // documento basura → proveedor NULL + proveedor_raw
  procesoNoEncontrado: number; // contrato sin proceso (ventana BDOS disjunta)
  cuarentena: number; // errores estructurales
}

export interface TransformSummary {
  batchId: string;
  procesos: SourceMetrics;
  contratos: SourceMetrics;
}

function emptyMetrics(): SourceMetrics {
  return {
    totalSnapshots: 0,
    uniqueRecords: 0,
    entidadesUpsert: 0,
    proveedoresUpsert: 0,
    procesosUpsert: 0,
    contratosUpsert: 0,
    geografiaResuelta: 0,
    geografiaNoResuelta: 0,
    proveedorCentinela: 0,
    procesoNoEncontrado: 0,
    cuarentena: 0,
  };
}

interface LatestSnapshot {
  id: string;
  payload: Record<string, unknown>;
}

/**
 * Snapshots más recientes por source_record_id para una fuente.
 *
 * raw_record es append-only: un mismo CO1.REQ puede tener N snapshots. La
 * canónica refleja el ÚLTIMO. DISTINCT ON con ORDER BY ingested_at DESC
 * (Postgres-específico, soportado por Neon — mismo patrón que dbIngest.ts).
 */
async function latestSnapshots(source: string): Promise<LatestSnapshot[]> {
  const rows = await db
    .selectDistinctOn([rawRecord.sourceRecordId], {
      id: rawRecord.id,
      payload: rawRecord.payload,
    })
    .from(rawRecord)
    .where(eq(rawRecord.source, source))
    .orderBy(rawRecord.sourceRecordId, desc(rawRecord.ingestedAt));
  return rows.map((r) => ({ id: r.id, payload: r.payload as Record<string, unknown> }));
}

/** Conteo total de snapshots en raw_record para una fuente (denominador de métricas). */
async function totalSnapshots(source: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(rawRecord)
    .where(eq(rawRecord.source, source));
  return row?.total ?? 0;
}

async function transformProcesos(geo: GeoResolver, batchId: string): Promise<SourceMetrics> {
  const m = emptyMetrics();
  const snapshots = await latestSnapshots('secop_ii_procesos');
  m.totalSnapshots = await totalSnapshots('secop_ii_procesos');
  m.uniqueRecords = snapshots.length;

  for (const snap of snapshots) {
    const projection = mapProcesoRow(snap.payload);

    if (!projection.secopProcesoId) {
      await quarantine(db, {
        rawRecordId: snap.id,
        source: 'secop_ii_procesos',
        sourceRecordId: null,
        reason: 'missing_secop_proceso_id',
        detail: { keys: Object.keys(snap.payload).slice(0, 20) },
        batchId,
      });
      m.cuarentena++;
      continue;
    }

    // Resolver geografía de la entidad (procesos: departamento_entidad/ciudad_entidad)
    const entidadGeo = geo.resolve(projection.geo);
    let entidadId: string | null = null;
    if (projection.entidad) {
      entidadId = await upsertEntidad(db, projection.entidad, entidadGeo);
      m.entidadesUpsert++;
    }

    // La geografía del PROCESO es la misma del entidad (0.2 §3.1 — procesos no
    // traen una localización propia distinta del entidad).
    if (entidadGeo) m.geografiaResuelta++;
    else m.geografiaNoResuelta++;

    await upsertProceso(db, projection, entidadId, entidadGeo, snap.id);
    m.procesosUpsert++;
  }

  return m;
}

async function transformContratos(geo: GeoResolver, batchId: string): Promise<SourceMetrics> {
  const m = emptyMetrics();
  const snapshots = await latestSnapshots('secop_ii_contratos');
  m.totalSnapshots = await totalSnapshots('secop_ii_contratos');
  m.uniqueRecords = snapshots.length;

  for (const snap of snapshots) {
    const projection = mapContratoRow(snap.payload);

    if (!projection.secopContratoId) {
      await quarantine(db, {
        rawRecordId: snap.id,
        source: 'secop_ii_contratos',
        sourceRecordId: null,
        reason: 'missing_secop_contrato_id',
        detail: { keys: Object.keys(snap.payload).slice(0, 20) },
        batchId,
      });
      m.cuarentena++;
      continue;
    }

    // Geografía de la entidad — solo para el upsert de entidad, no para contrato.
    // Hint de entidad es departamento_entidad/ciudad_entidad del contrato; en
    // muestra observada coincide casi siempre con la geografía del contrato.
    let entidadId: string | null = null;
    if (projection.entidad) {
      entidadId = await upsertEntidad(db, projection.entidad, geo.resolve(projection.geo));
      m.entidadesUpsert++;
    }

    // Proveedor: null si centinela (D3). proveedor_raw guarda la pista textual.
    let proveedorId: string | null = null;
    if (projection.proveedor) {
      proveedorId = await upsertProveedor(db, projection.proveedor);
      m.proveedoresUpsert++;
    } else if (projection.proveedorRaw) {
      m.proveedorCentinela++;
    }

    // Geografía del CONTRATO (D25: localizaci_n primaria, depto/ciudad fallback).
    const contratoGeo = geo.resolve(projection.geo);
    if (contratoGeo) m.geografiaResuelta++;
    else m.geografiaNoResuelta++;

    // Proceso por portafolio (D11). Si no existe en la muestra, NULL.
    const procesoId = await resolveProcesoIdByPortafolio(db, projection.procesoDeCompra);
    if (procesoId === null) m.procesoNoEncontrado++;

    await upsertContrato(db, projection, {
      entidadId,
      proveedorId,
      procesoId,
      geografiaId: contratoGeo,
      rawRecordId: snap.id,
    });
    m.contratosUpsert++;
  }

  return m;
}

/**
 * Corre el transform completo sobre raw_record para ambas fuentes SECOP II.
 * Devuelve métricas estructuradas; no imprime (eso es del script).
 */
export async function runTransform(): Promise<TransformSummary> {
  const batchId = randomUUID();
  const geo = await GeoResolver.load(db);
  if (geo.size() === 0) {
    throw new Error(
      'geografia_alias vacía. Corre `npm run db:seed-geografia` antes de transformar (0.2.2 §10).',
    );
  }

  // ORDEN IMPORTANTE: procesos primero para que el lookup por portafolio
  // (resolveProcesoIdByPortafolio) en contratos encuentre algo.
  const procesos = await transformProcesos(geo, batchId);
  const contratos = await transformContratos(geo, batchId);
  return { batchId, procesos, contratos };
}
