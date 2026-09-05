/**
 * Qué campos se vigilan para detectar una adenda (SDD Fase 5).
 *
 * La lista es corta a propósito. Vigilar el payload entero produciría una adenda
 * cada día por campos que la fuente reescribe sin que cambie nada real — que es
 * exactamente el problema que `payload_hash` ya resuelve en la ingesta
 * excluyendo `volatileFields`.
 *
 * **Invariante: ningún campo vigilado puede estar en `volatileFields`.** Si se
 * rompe, el detector genera adendas espurias en cada corrida y el correo diario
 * se vuelve ruido. `CAMPOS_VOLATILES_EN_VIGILANCIA` lo comprueba y hay un test
 * que falla si deja de estar vacío.
 */

import { FIELDS_PROCESOS as F } from "@/src/lib/secop/config";
import { SOURCE_PROCESOS } from "@/src/lib/ingest/sources";

/**
 * Campos del payload que entran al diff, con la etiqueta que verá el usuario.
 *
 * No está `fecha de cierre`: **este dataset no la trae**. `FIELDS_PROCESOS`
 * lo documenta — la señal real de plazo es `estado_de_apertura_del_proceso`
 * (Abierto/Cerrado), y `fecha_de_recepcion_de` solo la trae ~2,6% de los
 * procesos. Se vigilan las dos: la primera es la fiable, la segunda es la
 * valiosa cuando existe.
 */
export const CAMPOS_VIGILADOS: ReadonlyArray<{ campo: string; etiqueta: string }> = [
  { campo: F.estado, etiqueta: "Estado del procedimiento" },
  { campo: F.estadoApertura, etiqueta: "Apertura" },
  { campo: F.precioBase, etiqueta: "Presupuesto oficial" },
  { campo: F.modalidad, etiqueta: "Modalidad de contratación" },
  { campo: F.fechaRecepcion, etiqueta: "Fecha de recepción de ofertas" },
  { campo: F.adjudicadoFlag, etiqueta: "Adjudicado" },
  { campo: F.valorAdjudicacion, etiqueta: "Valor adjudicado" },
  { campo: F.nitAdjudicatario, etiqueta: "NIT del adjudicatario" },
  { campo: F.adjudicatario, etiqueta: "Adjudicatario" },
  { campo: F.nombre, etiqueta: "Nombre del procedimiento" },
  { campo: F.descripcion, etiqueta: "Descripción" },
];

/** Debe estar SIEMPRE vacío. Ver el docstring del módulo. */
export const CAMPOS_VOLATILES_EN_VIGILANCIA = CAMPOS_VIGILADOS.filter((c) =>
  (SOURCE_PROCESOS.volatileFields as readonly string[]).includes(c.campo)
).map((c) => c.campo);

export function etiquetaDe(campo: string): string {
  return CAMPOS_VIGILADOS.find((c) => c.campo === campo)?.etiqueta ?? campo;
}
