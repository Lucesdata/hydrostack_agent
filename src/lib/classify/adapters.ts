/**
 * Adaptadores fila cruda SODA → `ClassifierInput` (0.2.1: recomputable sobre
 * `raw_record`). El clasificador necesita el UNSPSC, que la proyección canónica
 * lean (mapCanonical) no persiste; por eso se arma desde la fila cruda, que sí lo
 * trae (`codigo_de_categoria_principal` / `codigo_principal_de_categoria`).
 */

import { cleanText } from '../transform/normalize';
import { canonicalizeNit } from '../transform/nit';
import type { ClassifierInput } from './classifier';

type SodaRow = Record<string, unknown>;

/** Contratos (`jbjy-vk9h`) → entrada del clasificador. */
export function classifierInputFromContratoRow(row: SodaRow): ClassifierInput {
  return {
    objeto: cleanText(row['objeto_del_contrato']) ?? cleanText(row['descripcion_del_proceso']),
    unspsc: cleanText(row['codigo_de_categoria_principal']),
    entidadNit: canonicalizeNit(row['nit_entidad'], 'NIT').nitCanonico,
    entidadNombre: cleanText(row['nombre_entidad']),
    sector: cleanText(row['sector']),
    tipoContrato: cleanText(row['tipo_de_contrato']),
  };
}

/** Procesos (`p6dx-8zbt`) → entrada del clasificador. */
export function classifierInputFromProcesoRow(row: SodaRow): ClassifierInput {
  return {
    objeto:
      cleanText(row['nombre_del_procedimiento']) ?? cleanText(row['descripci_n_del_procedimiento']),
    unspsc: cleanText(row['codigo_principal_de_categoria']),
    entidadNit: canonicalizeNit(row['nit_entidad'], 'NIT').nitCanonico,
    entidadNombre: cleanText(row['entidad']),
    sector: null, // procesos no traen `sector` explícito
    tipoContrato: cleanText(row['tipo_de_contrato']),
  };
}
