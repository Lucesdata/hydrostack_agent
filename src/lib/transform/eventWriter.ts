/**
 * Materializador de eventos contractuales (D-007).
 *
 * Dos capas:
 *   · Núcleo PURO (este bloque): grupos de snapshots ORDENADOS → filas de
 *     evento. Sin BD, sin FKs. Toda la lógica testeable vive aquí.
 *   · Adaptador IO (Task 2): lee de raw_record, resuelve FKs, persiste.
 *
 * La detección campo-a-campo la hace `diffContrato` (events.ts, ya probada);
 * aquí solo se encadenan snapshots, se agrupan eventos por transición bajo un
 * `correlation_id` común (otrosí que adiciona y prorroga a la vez) y se ordena.
 */

import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { NeonDatabase } from 'drizzle-orm/neon-serverless';
import { contrato, contratoEvento, proveedor, rawRecord } from '@/src/lib/db/schema';
import type * as schema from '@/src/lib/db/schema';
import {
  contratoSnapshotFromRow,
  diffContrato,
  type TipoEvento,
} from './events';
import { cleanText } from './normalize';

/** Un snapshot de contrato leído de raw_record, listo para diffear. */
export interface ContratoSnapshotRow {
  rawRecordId: string;
  sourceRecordId: string;
  sourceUpdatedAt: Date | null; // timestamp fuente; null en ~43% de contratos
  ingestedAt: Date; // siempre presente (defaultNow en ingesta)
  payload: Record<string, unknown>;
}

/** Fila de evento lista para persistir SALVO las FKs de contrato/proveedor. */
export interface BuiltEventRow {
  sourceRecordId: string; // para resolver contrato_id en el IO
  tipoEvento: TipoEvento;
  correlationId: string;
  sourceObservedAt: Date | null;
  rawRecordId: string; // snapshot `next` que reveló el cambio
  valorAnterior: number | null;
  valorNuevo: number | null;
  fechaAnterior: string | null;
  fechaNueva: string | null;
  estadoAnterior: string | null;
  estadoNuevo: string | null;
  // NIT canónico (sin DV) tal como lo produce canonicalizeNit; el IO lo resuelve
  // contra proveedor.nit_canonico (ambos lados canónicos).
  docProveedorAnterior: string | null;
  docProveedorNuevo: string | null;
}

/**
 * Orden cronológico (E-2): `source_updated_at` asc con NULLS LAST; desempate por
 * `ingested_at` asc; desempate final estable por `raw_record_id`.
 */
function compareSnapshots(a: ContratoSnapshotRow, b: ContratoSnapshotRow): number {
  const at = a.sourceUpdatedAt?.getTime() ?? null;
  const bt = b.sourceUpdatedAt?.getTime() ?? null;
  if (at !== bt) {
    if (at === null) return 1; // NULLS LAST
    if (bt === null) return -1;
    return at - bt;
  }
  const ai = a.ingestedAt.getTime();
  const bi = b.ingestedAt.getTime();
  if (ai !== bi) return ai - bi;
  return a.rawRecordId < b.rawRecordId ? -1 : a.rawRecordId > b.rawRecordId ? 1 : 0;
}

/** Agrupa snapshots por source_record_id y ordena cada grupo cronológicamente. */
export function groupAndSort(rows: ContratoSnapshotRow[]): Map<string, ContratoSnapshotRow[]> {
  const groups = new Map<string, ContratoSnapshotRow[]>();
  for (const r of rows) {
    const g = groups.get(r.sourceRecordId);
    if (g) g.push(r);
    else groups.set(r.sourceRecordId, [r]);
  }
  for (const g of groups.values()) g.sort(compareSnapshots);
  return groups;
}

/**
 * Núcleo puro: grupos de snapshots ORDENADOS → filas de evento. Recorre pares
 * consecutivos `(prev, next)` por grupo; los eventos de una misma transición
 * comparten `correlation_id`. `newCorrelationId` es inyectable para tests.
 */
export function buildContratoEventos(
  groups: ContratoSnapshotRow[][],
  newCorrelationId: () => string = randomUUID,
): BuiltEventRow[] {
  const out: BuiltEventRow[] = [];
  for (const group of groups) {
    for (let i = 1; i < group.length; i++) {
      const prev = group[i - 1];
      const next = group[i];
      const detected = diffContrato(
        contratoSnapshotFromRow(prev.payload),
        contratoSnapshotFromRow(next.payload),
      );
      if (detected.length === 0) continue;
      const correlationId = newCorrelationId();
      for (const ev of detected) {
        out.push({
          sourceRecordId: next.sourceRecordId,
          tipoEvento: ev.tipoEvento,
          correlationId,
          sourceObservedAt: next.sourceUpdatedAt,
          rawRecordId: next.rawRecordId,
          valorAnterior: ev.valorAnterior ?? null,
          valorNuevo: ev.valorNuevo ?? null,
          fechaAnterior: ev.fechaAnterior ?? null,
          fechaNueva: ev.fechaNueva ?? null,
          estadoAnterior: ev.estadoAnterior ?? null,
          estadoNuevo: ev.estadoNuevo ?? null,
          docProveedorAnterior: ev.docProveedorAnterior ?? null,
          docProveedorNuevo: ev.docProveedorNuevo ?? null,
        });
      }
    }
  }
  return out;
}

// ===========================================================================
// Adaptador IO — lee raw_record, resuelve FKs, persiste (rebuild idempotente).
// ===========================================================================

type Db = NeonDatabase<typeof schema>;

const SOURCE_CONTRATOS = 'secop_ii_contratos';

export interface EventMetrics {
  gruposTotal: number; // source_record_ids distintos de contratos
  gruposMultiSnapshot: number; // grupos con ≥2 snapshots (pueden producir eventos)
  eventosInsertados: number;
  porTipo: Record<TipoEvento, number>;
  cesionesSinProveedorFk: number;
  gruposSinContrato: number; // grupos ≥2 snapshots sin contrato canónico
  gruposConError: number; // grupos saltados por payload corrupto
}

export function emptyEventMetrics(): EventMetrics {
  return {
    gruposTotal: 0,
    gruposMultiSnapshot: 0,
    eventosInsertados: 0,
    porTipo: { adicion: 0, prorroga: 0, suspension: 0, terminacion: 0, cesion: 0 },
    cesionesSinProveedorFk: 0,
    gruposSinContrato: 0,
    gruposConError: 0,
  };
}

/** Convierte una fila construida en fila de INSERT, resolviendo FKs de proveedor. */
function toInsertRow(
  b: BuiltEventRow,
  contratoId: string,
  proveedorByNit: Map<string, string>,
  m: EventMetrics,
): typeof contratoEvento.$inferInsert {
  let proveedorAnteriorId: string | null = null;
  let proveedorNuevoId: string | null = null;
  let delta: Record<string, unknown> | null = null;

  if (b.tipoEvento === 'cesion') {
    proveedorAnteriorId = b.docProveedorAnterior
      ? proveedorByNit.get(b.docProveedorAnterior) ?? null
      : null;
    proveedorNuevoId = b.docProveedorNuevo
      ? proveedorByNit.get(b.docProveedorNuevo) ?? null
      : null;
    if (proveedorAnteriorId === null || proveedorNuevoId === null) {
      m.cesionesSinProveedorFk++;
      delta = {
        docProveedorAnterior: b.docProveedorAnterior,
        docProveedorNuevo: b.docProveedorNuevo,
      };
    }
  }

  return {
    contratoId,
    tipoEvento: b.tipoEvento,
    correlationId: b.correlationId,
    sourceObservedAt: b.sourceObservedAt,
    valorAnterior: b.valorAnterior !== null ? String(b.valorAnterior) : null,
    valorNuevo: b.valorNuevo !== null ? String(b.valorNuevo) : null,
    fechaAnterior: b.fechaAnterior,
    fechaNueva: b.fechaNueva,
    estadoAnterior: b.estadoAnterior,
    estadoNuevo: b.estadoNuevo,
    proveedorAnteriorId,
    proveedorNuevoId,
    delta,
    rawRecordId: b.rawRecordId,
  };
}

/**
 * Materializa `contrato_evento` desde TODOS los snapshots de contratos en
 * `raw_record`. Rebuild completo idempotente: `DELETE` + `INSERT` transaccional
 * (E-1). Hoy, con 1 snapshot por contrato, produce 0 eventos — esperado.
 */
export async function rebuildContratoEventos(db: Db): Promise<EventMetrics> {
  const m = emptyEventMetrics();

  // 1. Mapa secop_contrato_id (normalizado con cleanText) → contrato.id.
  const contratoRows = await db
    .select({ id: contrato.id, secopId: contrato.secopContratoId })
    .from(contrato);
  const contratoBySecopId = new Map<string, string>();
  for (const r of contratoRows) {
    const key = cleanText(r.secopId);
    if (key) contratoBySecopId.set(key, r.id);
  }

  // 2. Mapa nit_canonico → proveedor.id (para resolver cesión).
  const provRows = await db
    .select({ id: proveedor.id, nit: proveedor.nitCanonico })
    .from(proveedor);
  const proveedorByNit = new Map(provRows.map((r) => [r.nit, r.id]));

  // 3. Todos los snapshots de contratos.
  const snaps = await db
    .select({
      rawRecordId: rawRecord.id,
      sourceRecordId: rawRecord.sourceRecordId,
      sourceUpdatedAt: rawRecord.sourceUpdatedAt,
      ingestedAt: rawRecord.ingestedAt,
      payload: rawRecord.payload,
    })
    .from(rawRecord)
    .where(eq(rawRecord.source, SOURCE_CONTRATOS));

  const rows: ContratoSnapshotRow[] = snaps.map((s) => ({
    rawRecordId: s.rawRecordId,
    sourceRecordId: s.sourceRecordId,
    sourceUpdatedAt: s.sourceUpdatedAt,
    ingestedAt: s.ingestedAt,
    payload: s.payload as Record<string, unknown>,
  }));

  // 4. Agrupar + ordenar.
  const grouped = groupAndSort(rows);
  m.gruposTotal = grouped.size;

  // 5. Construir filas (puro, aislando errores por grupo) y resolver FKs.
  const inserts: (typeof contratoEvento.$inferInsert)[] = [];
  for (const [srcId, group] of grouped) {
    if (group.length >= 2) m.gruposMultiSnapshot++;

    const contratoId = contratoBySecopId.get(cleanText(srcId) ?? '');
    if (!contratoId) {
      if (group.length >= 2) m.gruposSinContrato++;
      continue;
    }

    let built: BuiltEventRow[];
    try {
      built = buildContratoEventos([group]);
    } catch {
      m.gruposConError++;
      continue;
    }

    for (const b of built) {
      m.porTipo[b.tipoEvento]++;
      inserts.push(toInsertRow(b, contratoId, proveedorByNit, m));
    }
  }
  m.eventosInsertados = inserts.length;

  // 6. Persistir: rebuild completo atómico.
  await db.transaction(async (tx) => {
    await tx.delete(contratoEvento);
    if (inserts.length > 0) await tx.insert(contratoEvento).values(inserts);
  });

  return m;
}
