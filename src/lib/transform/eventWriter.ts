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
import {
  contratoSnapshotFromRow,
  diffContrato,
  type TipoEvento,
} from './events';

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
