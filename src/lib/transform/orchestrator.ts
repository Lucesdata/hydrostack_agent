/**
 * Orquestador del transform raw → canónico (0.4).
 *
 * Lee de raw_record (NUNCA re-descarga), aplica los normalizadores puros de
 * mapCanonical, y escribe en orden de dependencia:
 *
 *   1) Procesos (catálogos: entidad + geografia)
 *   2) Contratos (catálogos: entidad + proveedor; FK a proceso via portafolio)
 *
 * Procesos van ANTES que contratos para que el índice de portafolio
 * (`loadPortafolioIndex`, D11) encuentre el proceso correspondiente. Si la
 * muestra trae contratos sin proceso (ventanas BDOS disjuntas, 0.2 §5.1),
 * proceso_id queda NULL — el contrato NO se descarta.
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
import {
  mapContratoRow,
  mapProcesoRow,
  type ContratoProjection,
  type ProcesoProjection,
  type ProveedorProjection,
} from './mapCanonical';
import {
  GeoResolver,
  batchQuarantine,
  batchUpsertContratos,
  batchUpsertEntidades,
  batchUpsertProcesos,
  batchUpsertProveedores,
  loadPortafolioIndex,
  type ContratoItem,
  type EntidadItem,
  type ProcesoItem,
  type QuarantineEntry,
} from './writers';
import { rebuildContratoEventos, type EventMetrics } from './eventWriter';
import { preclassify } from '@/src/lib/secop/document-access';

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
  eventos: EventMetrics;
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

/**
 * Transforma una fuente en dos pasadas sobre los snapshots (evita el
 * round-trip por fila que hacía el rebuild secuencial):
 *   1) proyecta cada fila (puro) y arma los ítems de escritura en memoria.
 *   2) resuelve/escribe por lotes (catálogos primero, hechos después — los
 *      hechos necesitan los ids de catálogo ya resueltos).
 */
async function transformProcesos(geo: GeoResolver, batchId: string): Promise<SourceMetrics> {
  const m = emptyMetrics();
  const snapshots = await latestSnapshots('secop_ii_procesos');
  m.totalSnapshots = await totalSnapshots('secop_ii_procesos');
  m.uniqueRecords = snapshots.length;

  const quarantineEntries: QuarantineEntry[] = [];
  const entidadItems: EntidadItem[] = [];
  const pending: { snap: LatestSnapshot; projection: ProcesoProjection; entidadGeo: string | null }[] =
    [];

  for (const snap of snapshots) {
    const projection = mapProcesoRow(snap.payload);

    if (!projection.secopProcesoId) {
      quarantineEntries.push({
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
    if (projection.entidad) {
      entidadItems.push({ proj: projection.entidad, geografiaId: entidadGeo });
      m.entidadesUpsert++;
    }
    // La geografía del PROCESO es la misma del entidad (0.2 §3.1 — procesos no
    // traen una localización propia distinta del entidad).
    if (entidadGeo) m.geografiaResuelta++;
    else m.geografiaNoResuelta++;

    pending.push({ snap, projection, entidadGeo });
  }

  await batchQuarantine(db, quarantineEntries);
  const entidadIdByNit = await batchUpsertEntidades(db, entidadItems);

  const procesoItems: ProcesoItem[] = pending.map(({ snap, projection, entidadGeo }) => ({
    proj: projection,
    entidadId: projection.entidad ? entidadIdByNit.get(projection.entidad.nitCanonico) ?? null : null,
    geografiaId: entidadGeo,
    rawRecordId: snap.id,
    // Gate de acceso documental (B2): preclasificación barata sobre la
    // metadata cruda (sin HTTP). Se re-evalúa en cada corrida (B3).
    docAccess: preclassify(snap.payload),
  }));
  m.procesosUpsert = await batchUpsertProcesos(db, procesoItems);

  return m;
}

async function transformContratos(geo: GeoResolver, batchId: string): Promise<SourceMetrics> {
  const m = emptyMetrics();
  const snapshots = await latestSnapshots('secop_ii_contratos');
  m.totalSnapshots = await totalSnapshots('secop_ii_contratos');
  m.uniqueRecords = snapshots.length;

  const quarantineEntries: QuarantineEntry[] = [];
  const entidadItems: EntidadItem[] = [];
  const proveedorProjs: ProveedorProjection[] = [];
  const pending: { snap: LatestSnapshot; projection: ContratoProjection; contratoGeo: string | null }[] =
    [];

  for (const snap of snapshots) {
    const projection = mapContratoRow(snap.payload);

    if (!projection.secopContratoId) {
      quarantineEntries.push({
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

    // Geografía de la entidad y del contrato es el mismo hint (D25: localizaci_n
    // primaria, depto/ciudad fallback). Hint de entidad es departamento_entidad/
    // ciudad_entidad del contrato; en muestra observada coincide casi siempre.
    const contratoGeo = geo.resolve(projection.geo);
    if (projection.entidad) {
      entidadItems.push({ proj: projection.entidad, geografiaId: contratoGeo });
      m.entidadesUpsert++;
    }

    // Proveedor: null si centinela (D3). proveedor_raw guarda la pista textual.
    if (projection.proveedor) {
      proveedorProjs.push(projection.proveedor);
      m.proveedoresUpsert++;
    } else if (projection.proveedorRaw) {
      m.proveedorCentinela++;
    }

    if (contratoGeo) m.geografiaResuelta++;
    else m.geografiaNoResuelta++;

    pending.push({ snap, projection, contratoGeo });
  }

  await batchQuarantine(db, quarantineEntries);
  const [entidadIdByNit, proveedorIdByNit, portafolioIndex] = await Promise.all([
    batchUpsertEntidades(db, entidadItems),
    batchUpsertProveedores(db, proveedorProjs),
    loadPortafolioIndex(db),
  ]);

  const contratoItems: ContratoItem[] = pending.map(({ snap, projection, contratoGeo }) => {
    // Proceso por portafolio (D11). Si no existe en la muestra, NULL (no se
    // descarta el contrato — 0.2.2 §9.4).
    const procesoId = projection.procesoDeCompra
      ? portafolioIndex.get(projection.procesoDeCompra) ?? null
      : null;
    if (procesoId === null) m.procesoNoEncontrado++;

    return {
      proj: projection,
      entidadId: projection.entidad ? entidadIdByNit.get(projection.entidad.nitCanonico) ?? null : null,
      proveedorId: projection.proveedor
        ? proveedorIdByNit.get(projection.proveedor.nitCanonico) ?? null
        : null,
      procesoId,
      geografiaId: contratoGeo,
      rawRecordId: snap.id,
    };
  });
  m.contratosUpsert = await batchUpsertContratos(db, contratoItems);

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

  // ORDEN IMPORTANTE: procesos primero para que el índice de portafolio
  // (loadPortafolioIndex) en contratos encuentre algo.
  const procesos = await transformProcesos(geo, batchId);
  const contratos = await transformContratos(geo, batchId);
  const eventos = await rebuildContratoEventos(db);
  return { batchId, procesos, contratos, eventos };
}
