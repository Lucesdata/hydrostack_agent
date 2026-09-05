/**
 * Motivo de descarte de la RED DE INGESTA (capa 'ingesta' de `al_descartes`).
 *
 * Estos procesos nunca llegan a `raw_record`: la red se aplica como `$where` en
 * Socrata, así que lo descartado se queda en la fuente. Auditarlo exige ir a
 * buscarlo — ver `scripts/al-auditar-red.ts`, que toma una muestra SIN el filtro
 * sectorial y la evalúa aquí.
 *
 * El veredicto sí/no lo da `matchesSectorNet`, que es la autoridad y ya existe.
 * Aquí solo se deriva la ETIQUETA del rechazo, con las mismas constantes
 * exportadas, para que las dos no puedan divergir en el fondo: como mucho, en el
 * nombre del motivo.
 */

import {
  matchesSectorNet,
  unspscDigits,
  EXCLUDED_UNSPSC_SEGMENTS,
  type SectorNetFields,
} from "@/src/lib/secop/ingest-net";
import type { MotivoDescarte } from "./tipos";

/** `null` = la fila pasa la red. */
export function motivoRedSectorial(
  row: Record<string, unknown>,
  fields: SectorNetFields
): MotivoDescarte | null {
  if (matchesSectorNet(row, fields)) return null;

  const digits = unspscDigits(row[fields.unspscField]);
  if (digits !== null && EXCLUDED_UNSPSC_SEGMENTS.some((s) => digits.startsWith(s))) {
    return "segmento_80_excluido";
  }
  return "sin_unspsc_ni_keyword";
}
