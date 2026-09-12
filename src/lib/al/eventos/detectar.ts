/**
 * Detector de eventos de proceso (SDD §4.3, Fase 5). PURO: sin SQL, sin IO.
 *
 * Compara el estado guardado (`al_proceso_estado`) contra el estado nuevo y
 * decide qué evento emitir. Tres transiciones y ninguna más — las demás son
 * ruido, y esa poda es una decisión de producto, no un descuido:
 *
 *  - `apertura`      la primera vez que vemos un proceso vivo.
 *  - `adjudicacion`  `adjudicado` pasa de No a Sí.
 *  - `adenda`        cambió algún campo vigilado. **Siempre con diff**: decir
 *                    "hubo una adenda" sin decir qué cambió no le sirve a nadie,
 *                    y es la transición de más valor para el usuario.
 */

import { createHash } from "node:crypto";
import { FIELDS_PROCESOS as F } from "@/src/lib/secop/config";
import { CAMPOS_VIGILADOS, etiquetaDe } from "./campos";

export type TipoEvento = "apertura" | "adenda" | "adjudicacion";

export interface CampoCambiado {
  campo: string;
  etiqueta: string;
  antes: string | null;
  despues: string | null;
}

/** Lo que se guarda por proceso: los campos que se diffean, no el payload. */
export interface EstadoProceso {
  estado: string | null;
  estadoApertura: string | null;
  valorEstimado: string | null;
  modalidad: string | null;
  fechaRecepcion: string | null;
  adjudicado: boolean | null;
  valorAdjudicado: string | null;
  adjudicatarioNit: string | null;
  objetoHash: string | null;
}

export interface EventoDetectado {
  tipoEvento: TipoEvento;
  delta: CampoCambiado[] | null;
  estadoAnterior: string | null;
  estadoNuevo: string | null;
  valorAnterior: string | null;
  valorNuevo: string | null;
  fechaCierreAnterior: string | null;
  fechaCierreNueva: string | null;
  /** Hash del estado nuevo — la llave de idempotencia del evento. */
  payloadHash: string;
}

/**
 * Único hash del módulo — usado por `hashDeEstado` para el `payloadHash` del
 * evento (la llave de idempotencia de `al_proceso_evento`). El separador es
 * `"\0"` (NUL), no un espacio: varios de los campos que se concatenan aquí
 * (`modalidad`, la etiqueta de una fecha) ya traen espacios propios, y un
 * separador que también es espacio permite que dos estados DISTINTOS
 * ("a b", "c") y ("a", "b c") caigan en el mismo string concatenado y por
 * tanto en el mismo hash. NUL no aparece en texto normal, así que no tiene
 * ese problema. 2026-09-12: hasta ahora el NUL vivía como byte crudo en el
 * fuente (`0x00` dentro del literal), lo que volvía el archivo binario para
 * `git` (diff ilegible) y hacía que `grep -rn` lo saltara en silencio; se
 * reemplazó por el escape `"\0"`, que produce el mismo byte en tiempo de
 * ejecución. **No cambiar el separador en sí** (a espacio o cualquier otra
 * cosa): `hashDeEstado` alimenta el `payloadHash` ya persistido en
 * `al_proceso_evento` para eventos existentes — cambiarlo produciría un
 * `payloadHash` distinto para el mismo estado y el `onConflictDoNothing` de
 * `correr.ts` dejaría de reconocer un evento ya emitido como duplicado.
 *
 * Exportada porque `correr.ts` la reutiliza para `objetoHash`: ese hash
 * también quedó persistido en `al_proceso_estado` con esta misma fórmula
 * (separador NUL, truncado a 32 hex), así que tiene que ser la MISMA función
 * — no una reimplementación local — o vuelve a divergir de los datos ya
 * guardados (2026-09-12: eso fue exactamente lo que pasó con `hashObjeto`,
 * que usaba espacio sin truncar; ver `eventos-columnas.test.ts`).
 */
export function hash(...partes: Array<string | null>): string {
  return createHash("sha256")
    .update(partes.map((p) => p ?? "").join("\0"))
    .digest("hex")
    .slice(0, 32);
}

export function hashDeEstado(e: EstadoProceso): string {
  return hash(
    e.estado,
    e.estadoApertura,
    e.valorEstimado,
    e.modalidad,
    e.fechaRecepcion,
    e.adjudicado === null ? null : String(e.adjudicado),
    e.valorAdjudicado,
    e.adjudicatarioNit,
    e.objetoHash
  );
}

/** Cómo se lee cada campo vigilado desde un `EstadoProceso`, para el diff. */
const LECTORES: Record<string, (e: EstadoProceso) => string | null> = {
  [F.estado]: (e) => e.estado,
  [F.estadoApertura]: (e) => e.estadoApertura,
  [F.precioBase]: (e) => e.valorEstimado,
  [F.modalidad]: (e) => e.modalidad,
  [F.fechaRecepcion]: (e) => e.fechaRecepcion,
  [F.adjudicadoFlag]: (e) => (e.adjudicado === null ? null : e.adjudicado ? "Si" : "No"),
  [F.valorAdjudicacion]: (e) => e.valorAdjudicado,
  [F.nitAdjudicatario]: (e) => e.adjudicatarioNit,
  // El objeto y la descripción se vigilan por hash: se detecta QUE cambiaron,
  // no CÓMO. Guardar los dos textos por proceso costaría más que todo el resto
  // de la tabla junto, y el usuario tiene el enlace al pliego para ver el nuevo.
  [F.adjudicatario]: () => null,
  [F.nombre]: (e) => e.objetoHash,
  [F.descripcion]: () => null,
};

const CAMPOS_POR_HASH: ReadonlySet<string> = new Set<string>([F.nombre]);

export function diffEstados(antes: EstadoProceso, despues: EstadoProceso): CampoCambiado[] {
  const cambios: CampoCambiado[] = [];
  for (const { campo } of CAMPOS_VIGILADOS) {
    const leer = LECTORES[campo];
    if (!leer) continue;
    const a = leer(antes);
    const d = leer(despues);
    if (a === d) continue;
    if (CAMPOS_POR_HASH.has(campo)) {
      cambios.push({
        campo,
        etiqueta: "Objeto o descripción",
        antes: null,
        despues: null,
      });
      continue;
    }
    cambios.push({ campo, etiqueta: etiquetaDe(campo), antes: a, despues: d });
  }
  return cambios;
}

/**
 * `anterior === null` significa que es la primera vez que vemos el proceso.
 * Devuelve `null` cuando no hay nada que reportar.
 *
 * Recibe `nuevo` ya proyectado a `EstadoProceso` — antes recibía el payload
 * crudo y lo proyectaba con `estadoDesdePayload` aquí mismo, pero desde que
 * `correr.ts` dejó de leer `raw_record` (2026-09-12) el llamador es quien
 * decide cómo llegar a `EstadoProceso` (payload o columnas de `proceso`), y
 * este detector queda puro sobre ese tipo.
 */
export function detectarEvento(
  anterior: EstadoProceso | null,
  nuevo: EstadoProceso
): EventoDetectado | null {
  const payloadHash = hashDeEstado(nuevo);

  if (anterior === null) {
    return {
      tipoEvento: "apertura",
      delta: null,
      estadoAnterior: null,
      estadoNuevo: nuevo.estado,
      valorAnterior: null,
      valorNuevo: nuevo.valorEstimado,
      fechaCierreAnterior: null,
      fechaCierreNueva: nuevo.fechaRecepcion,
      payloadHash,
    };
  }

  const delta = diffEstados(anterior, nuevo);
  if (delta.length === 0) return null;

  // La adjudicación gana sobre la adenda: si en la misma corrida el proceso se
  // adjudicó Y cambió otra cosa, lo que le importa al usuario es que ya hay
  // ganador. El resto del cambio viaja igual dentro del `delta`.
  const seAdjudico = anterior.adjudicado !== true && nuevo.adjudicado === true;

  return {
    tipoEvento: seAdjudico ? "adjudicacion" : "adenda",
    delta,
    estadoAnterior: anterior.estado,
    estadoNuevo: nuevo.estado,
    valorAnterior: anterior.valorEstimado,
    valorNuevo: nuevo.valorEstimado,
    fechaCierreAnterior: anterior.fechaRecepcion,
    fechaCierreNueva: nuevo.fechaRecepcion,
    payloadHash,
  };
}

/** Estados en los que un proceso ya no cambia: sale del seguimiento. */
export const ESTADOS_TERMINALES = new Set(["Seleccionado", "Cancelado"]);

export function esTerminal(estado: string | null): boolean {
  return estado !== null && ESTADOS_TERMINALES.has(estado);
}
