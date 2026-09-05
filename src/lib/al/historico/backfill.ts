/**
 * Carga del histórico de oferentes (SDD §4.7, módulo 2, Fase 2).
 *
 * Dos pasadas independientes y ambas idempotentes por
 * `UNIQUE (secop_proceso_id, proveedor_key)`:
 *
 *   1. `backfillAdjudicatarios` — local, sin red. El ganador y su precio salen
 *      de `raw_record`, que ya está en casa. Escribe con `onConflictDoUpdate`:
 *      una adjudicación puede corregirse en la fuente.
 *   2. `backfillProponentes` — red, dataset `hgi6-6wh3`. Escribe con
 *      `onConflictDoNothing` para **no degradar** una fila de adjudicatario si
 *      el ganador aparece también como proponente. Las dos pasadas convergen en
 *      cualquier orden.
 *
 * Solo se piden proponentes de los procesos que ya tenemos y que son de
 * modalidad competitiva: la contratación directa no tiene pluralidad de
 * oferentes por definición y midió 0/12 de cobertura en la V-F-4. Pedirlos sería
 * gastar red para recibir vacío.
 */

import { and, eq, isNotNull, or, ilike, sql } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { alOferentesHistorico } from "@/src/lib/db/schema/aqualicita";
import { proceso } from "@/src/lib/db/schema/hechos";
import { rawRecord } from "@/src/lib/db/schema/raw";
import { entidad } from "@/src/lib/db/schema/catalogos";
import { sodaFetchPage } from "@/src/lib/ingest/sodaFetch";
import {
  mapearAdjudicatario,
  mapearProponente,
  type FilaHistorico,
  type ContextoProceso,
} from "./mapear";

/** Dataset verificado en la V-F-4: 2,3 M filas, 2015-02-14 → hoy. */
export const DATASET_PROPONENTES = "hgi6-6wh3";

/**
 * Procesos por lote en el `$where ... in (...)`. 50 × hasta 83 proponentes deja
 * el peor caso muy por debajo del `$limit`, así que una página basta por lote.
 */
const LOTE_PROCESOS = 50;
const LIMITE_SODA = 10_000;

/** Modalidades con pluralidad de oferentes — las únicas que el dataset cubre. */
const MODALIDADES_COMPETITIVAS = ["%Licitación%", "%Selección abreviada%", "%Concurso%"];

export interface ResumenBackfill {
  procesados: number;
  escritos: number;
  omitidos: number;
  lotes: number;
}

async function upsert(filas: FilaHistorico[], pisar: boolean): Promise<number> {
  if (filas.length === 0) return 0;

  const q = db.insert(alOferentesHistorico).values(filas);
  if (!pisar) {
    // Proponentes: nunca degradan una fila de adjudicatario ya escrita.
    await q.onConflictDoNothing({
      target: [alOferentesHistorico.secopProcesoId, alOferentesHistorico.proveedorKey],
    });
    return filas.length;
  }

  await q.onConflictDoUpdate({
    target: [alOferentesHistorico.secopProcesoId, alOferentesHistorico.proveedorKey],
    set: {
      adjudicado: sql`excluded.adjudicado`,
      valorAdjudicado: sql`excluded.valor_adjudicado`,
      valorEstimado: sql`excluded.valor_estimado`,
      fechaAdjudicacion: sql`excluded.fecha_adjudicacion`,
      unspsc: sql`excluded.unspsc`,
      proveedorNit: sql`excluded.proveedor_nit`,
      fuente: sql`excluded.fuente`,
      updatedAt: new Date(),
    },
  });
  return filas.length;
}

function contextoDe(row: {
  procesoId: string | null;
  entidadId: string | null;
  entidadNit: string | null;
  geografiaId: string | null;
  modalidad: string | null;
  valorEstimado: string | null;
  fechaPublicacion: string | null;
}): ContextoProceso {
  return row;
}

/** Pasada 1: el adjudicatario y su precio, desde lo ya aterrizado. */
export async function backfillAdjudicatarios(
  opts: { lote?: number; onLote?: (r: ResumenBackfill) => Promise<void> | void } = {}
): Promise<ResumenBackfill> {
  const lote = opts.lote ?? 1000;
  const resumen: ResumenBackfill = { procesados: 0, escritos: 0, omitidos: 0, lotes: 0 };

  let offset = 0;
  for (;;) {
    const rows = await db
      .select({
        rawId: rawRecord.id,
        payload: rawRecord.payload,
        procesoId: proceso.id,
        entidadId: proceso.entidadId,
        entidadNit: entidad.nitCanonico,
        geografiaId: proceso.geografiaId,
        modalidad: proceso.modalidad,
        valorEstimado: sql<string | null>`${proceso.valorEstimado}::text`,
        fechaPublicacion: sql<string | null>`${proceso.fechaPublicacion}::text`,
      })
      .from(rawRecord)
      .leftJoin(proceso, eq(proceso.secopProcesoId, rawRecord.sourceRecordId))
      .leftJoin(entidad, eq(entidad.id, proceso.entidadId))
      .where(
        and(
          eq(rawRecord.source, "secop_ii_procesos"),
          sql`${rawRecord.payload}->>'adjudicado' = 'Si'`
        )
      )
      .orderBy(rawRecord.id)
      .limit(lote)
      .offset(offset);

    if (rows.length === 0) break;

    const filas: FilaHistorico[] = [];
    for (const r of rows) {
      resumen.procesados++;
      const fila = mapearAdjudicatario(
        r.payload as Record<string, unknown>,
        contextoDe(r),
        r.rawId
      );
      if (fila) filas.push(fila);
      else resumen.omitidos++;
    }

    resumen.escritos += await upsert(filas, true);
    resumen.lotes++;
    offset += lote;
    if (opts.onLote) await opts.onLote(resumen);
  }

  return resumen;
}

/** Los procesos cuyos proponentes tiene sentido pedir. */
export async function procesosCompetitivos(): Promise<
  Array<ContextoProceso & { secopProcesoId: string }>
> {
  const rows = await db
    .select({
      secopProcesoId: proceso.secopProcesoId,
      procesoId: proceso.id,
      entidadId: proceso.entidadId,
      entidadNit: entidad.nitCanonico,
      geografiaId: proceso.geografiaId,
      modalidad: proceso.modalidad,
      valorEstimado: sql<string | null>`${proceso.valorEstimado}::text`,
      fechaPublicacion: sql<string | null>`${proceso.fechaPublicacion}::text`,
    })
    .from(proceso)
    .leftJoin(entidad, eq(entidad.id, proceso.entidadId))
    .where(
      and(
        sql`${proceso.deletedAt} IS NULL`,
        isNotNull(proceso.modalidad),
        or(...MODALIDADES_COMPETITIVAS.map((m) => ilike(proceso.modalidad, m)))
      )
    )
    .orderBy(proceso.secopProcesoId);
  return rows;
}

/** Pasada 2: los demás proponentes, del dataset de la V-F-4. */
export async function backfillProponentes(
  opts: {
    procesos?: Array<ContextoProceso & { secopProcesoId: string }>;
    onLote?: (r: ResumenBackfill) => Promise<void> | void;
  } = {}
): Promise<ResumenBackfill> {
  const procesos = opts.procesos ?? (await procesosCompetitivos());
  const porId = new Map(procesos.map((p) => [p.secopProcesoId, p]));
  const resumen: ResumenBackfill = { procesados: 0, escritos: 0, omitidos: 0, lotes: 0 };

  for (let i = 0; i < procesos.length; i += LOTE_PROCESOS) {
    const ids = procesos.slice(i, i + LOTE_PROCESOS).map((p) => p.secopProcesoId);
    const lista = ids.map((id) => `'${id.replace(/'/g, "''")}'`).join(",");

    const page = await sodaFetchPage(DATASET_PROPONENTES, {
      $order: "id_procedimiento",
      $limit: LIMITE_SODA,
      $where: `id_procedimiento in (${lista})`,
    });

    if (page.length >= LIMITE_SODA) {
      // Si esto salta, el lote es demasiado grande y se estarían perdiendo
      // proponentes en silencio — el modo de fallo caro de este producto.
      throw new Error(
        `Lote truncado en ${LIMITE_SODA} filas (procesos ${i}–${i + LOTE_PROCESOS}). Baja LOTE_PROCESOS.`
      );
    }

    const filas: FilaHistorico[] = [];
    for (const row of page) {
      resumen.procesados++;
      const ctx = porId.get(String(row.id_procedimiento));
      if (!ctx) {
        resumen.omitidos++;
        continue;
      }
      const fila = mapearProponente(row, ctx);
      if (fila) filas.push(fila);
      else resumen.omitidos++;
    }

    resumen.escritos += await upsert(filas, false);
    resumen.lotes++;
    if (opts.onLote) await opts.onLote(resumen);
  }

  return resumen;
}
