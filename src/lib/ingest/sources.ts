/**
 * Registro de fuentes de ingesta (ELT landing → raw_record).
 *
 * Cada fuente declara los cuatro datos que la ingesta incremental necesita y
 * que el modelo 0.1/0.2 ya fijó:
 *   - `source`          discriminador que va a raw_record.source (D1).
 *   - `dataset`         id del dataset SODA (reusa secop/config).
 *   - `idField`         id nativo → raw_record.source_record_id (0.2 §1).
 *   - `watermarkField`  campo de actualización para el incremental (0.2 §6).
 *   - `volatileFields`  campos excluidos del payload_hash (D10 / 0.2 §5).
 *
 * `volatileFields` SIEMPRE incluye el watermark: cambia en cada republicación y
 * generaría eventos espurios si entrara al hash. La lista completa se congela
 * al cruzar con el endpoint de columnas antes de cerrar 0.3 (0.2 §5).
 */

import { DATASETS, type DatasetKey } from '@/src/lib/secop/config';
import {
  buildSectorWhere,
  SECTOR_NET_PROCESOS,
  SECTOR_NET_CONTRATOS,
} from '@/src/lib/secop/ingest-net';

export interface IngestSource {
  readonly source: string;
  /** Clave para resolver el id 4x4 vigente vía catálogo (datasetResolver). */
  readonly datasetKey: DatasetKey;
  /** Id 4x4 de fallback; el id real lo resuelve la capa IO en runtime. */
  readonly dataset: string;
  readonly idField: string;
  readonly watermarkField: string;
  readonly volatileFields: readonly string[];
  /**
   * Filtro sectorial de ingesta (ADR-0001, Opción C): SoQL `$where` que el
   * keyset/sweep ANDea con su cursor para aterrizar SOLO el sector agua. Fuente
   * de verdad: `secop/ingest-net.ts`.
   */
  readonly sectorWhere: string;
}

export const SOURCE_PROCESOS: IngestSource = {
  source: 'secop_ii_procesos',
  datasetKey: 'procesos',
  dataset: DATASETS.procesos,
  idField: 'id_del_proceso',
  watermarkField: 'fecha_de_ultima_publicaci',
  volatileFields: [
    'fecha_de_ultima_publicaci', // watermark
    'visualizaciones_del',
    'proveedores_invitados',
    'proveedores_con_invitacion',
    'respuestas_al_procedimiento',
    'respuestas_externas',
  ],
  sectorWhere: buildSectorWhere(SECTOR_NET_PROCESOS),
};

export const SOURCE_CONTRATOS: IngestSource = {
  source: 'secop_ii_contratos',
  datasetKey: 'contratos',
  dataset: DATASETS.contratos,
  idField: 'id_contrato',
  watermarkField: 'ultima_actualizacion',
  volatileFields: [
    'ultima_actualizacion', // watermark
    'valor_facturado',
    'valor_pagado',
    'valor_pendiente_de_pago',
    'valor_amortizado',
    'valor_pendiente_de_ejecucion',
    'saldo_cdp',
    'saldo_vigencia',
  ],
  sectorWhere: buildSectorWhere(SECTOR_NET_CONTRATOS),
};

export const INGEST_SOURCES = {
  secop_ii_procesos: SOURCE_PROCESOS,
  secop_ii_contratos: SOURCE_CONTRATOS,
} as const;

export type IngestSourceKey = keyof typeof INGEST_SOURCES;
