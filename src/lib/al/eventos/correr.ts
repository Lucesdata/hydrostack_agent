/**
 * Corrida del detector de eventos (SDD Fase 5).
 *
 * Lee el estado vigente de cada proceso vigilado (columnas de `proceso`, no
 * `raw_record.payload` — 2026-09-12, ver ADR de adelgazamiento), lo compara
 * con `al_proceso_estado` y escribe en `al_proceso_evento` lo que cambió.
 * Después actualiza la línea base y suelta del seguimiento los procesos que
 * llegaron a un estado terminal — es lo que mantiene la tabla acotada, y es la
 * lección que dejó `contrato_evento` al retirarse en `drizzle/0011`.
 *
 * **Qué se vigila:** los procesos no terminales, MÁS los que ya tienen línea
 * base aunque ahora sean terminales. Ese "más" no es un detalle: la transición
 * *hacia* `Seleccionado` es exactamente el evento de adjudicación, y filtrando
 * solo por no-terminal nunca se vería. Se detecta en esa corrida y en la
 * siguiente la fila ya está liberada.
 *
 * **La apertura solo se emite dentro de una ventana reciente.** Sin esa regla,
 * la primera corrida emitiría 50.584 aperturas de golpe: todo proceso vivo sin
 * línea base parecería nuevo. Y sería falso — un proceso publicado hace dos años
 * no se está abriendo hoy, simplemente no lo habíamos visto. Fuera de la ventana
 * se siembra la línea base en silencio, que es la verdad: empezamos a vigilarlo.
 */

import { createHash } from "node:crypto";
import { and, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { alProcesoEstado, alProcesoEvento } from "@/src/lib/db/schema/aqualicita";
import { proceso } from "@/src/lib/db/schema/hechos";
import { detectarEvento, esTerminal, type EstadoProceso } from "./detectar";

/** Días desde la publicación dentro de los que un proceso nuevo cuenta como apertura. */
export const VENTANA_APERTURA_DIAS = 30;

const LOTE = 1000;

export interface ResumenEventos {
  evaluados: number;
  apertura: number;
  adenda: number;
  adjudicacion: number;
  lineaBaseSembrada: number;
  seguimientoLiberado: number;
}

function dentroDeVentana(fechaPublicacion: string | null, dias: number): boolean {
  if (!fechaPublicacion) return false;
  return new Date(fechaPublicacion).getTime() >= Date.now() - dias * 24 * 60 * 60 * 1000;
}

/** La fila canónica de `proceso` que necesita el detector — el select de abajo. */
export interface FilaProceso {
  secopProcesoId: string;
  estadoActual: string | null;
  estadoApertura: string | null;
  valorEstimado: string | null;
  modalidad: string | null;
  fechaRecepcion: string | null;
  adjudicado: boolean | null;
  valorAdjudicacion: string | null;
  nitAdjudicatario: string | null;
  objeto: string | null;
  descripcion: string | null;
}

/**
 * Hash de objeto+descripción — detecta QUE cambió el pliego, no CÓMO. Igual
 * razón que en `detectar.ts`: guardar los dos textos por proceso costaría más
 * que todo el resto de la tabla junto, y el usuario tiene el enlace al pliego.
 */
function hashObjeto(objeto: string | null, descripcion: string | null): string {
  return createHash("sha256")
    .update(`${objeto ?? ""} ${descripcion ?? ""}`)
    .digest("hex");
}

/**
 * Proyecta la fila canónica de `proceso` al estado que se guarda en
 * `al_proceso_estado` y se compara. Reemplaza a `estadoDesdePayload`
 * (`detectar.ts`) en esta corrida: las columnas ya llegan tipadas y limpias
 * desde la ingesta, así que no hace falta re-parsear texto/money/fecha.
 */
export function estadoDesdeProceso(fila: FilaProceso): EstadoProceso {
  return {
    estado: fila.estadoActual,
    estadoApertura: fila.estadoApertura,
    valorEstimado: fila.valorEstimado,
    modalidad: fila.modalidad,
    fechaRecepcion: fila.fechaRecepcion,
    adjudicado: fila.adjudicado,
    valorAdjudicado: fila.valorAdjudicacion,
    adjudicatarioNit: fila.nitAdjudicatario,
    objetoHash: hashObjeto(fila.objeto, fila.descripcion),
  };
}

export async function correrDeteccionEventos(
  opts: { ventanaDias?: number; lote?: number } = {}
): Promise<ResumenEventos> {
  const ventana = opts.ventanaDias ?? VENTANA_APERTURA_DIAS;
  const lote = opts.lote ?? LOTE;

  const r: ResumenEventos = {
    evaluados: 0,
    apertura: 0,
    adenda: 0,
    adjudicacion: 0,
    lineaBaseSembrada: 0,
    seguimientoLiberado: 0,
  };

  let offset = 0;
  for (;;) {
    const filas = await db
      .select({
        secopProcesoId: proceso.secopProcesoId,
        procesoId: proceso.id,
        rawRecordId: proceso.rawRecordIdActual,
        fechaPublicacion: sql<string | null>`${proceso.fechaPublicacion}::text`,
        estadoActual: proceso.estadoActual,
        estadoApertura: proceso.estadoApertura,
        valorEstimado: sql<string | null>`${proceso.valorEstimado}::text`,
        modalidad: proceso.modalidad,
        fechaRecepcion: sql<string | null>`${proceso.fechaRecepcion}::text`,
        adjudicado: proceso.adjudicado,
        valorAdjudicacion: sql<string | null>`${proceso.valorAdjudicacion}::text`,
        nitAdjudicatario: proceso.nitAdjudicatario,
        objeto: proceso.objeto,
        descripcion: proceso.descripcion,
        base: alProcesoEstado,
      })
      .from(proceso)
      .leftJoin(alProcesoEstado, eq(alProcesoEstado.secopProcesoId, proceso.secopProcesoId))
      .where(
        and(
          isNull(proceso.deletedAt),
          or(
            sql`${proceso.estadoActual} IS DISTINCT FROM 'Seleccionado'
                AND ${proceso.estadoActual} IS DISTINCT FROM 'Cancelado'`,
            // Ya vigilado: hay que verlo una vez más para cazar la transición.
            isNotNull(alProcesoEstado.secopProcesoId)
          )
        )
      )
      .orderBy(proceso.secopProcesoId)
      .limit(lote)
      .offset(offset);

    if (filas.length === 0) break;
    offset += lote;

    const eventos: (typeof alProcesoEvento.$inferInsert)[] = [];
    const baseNueva: (typeof alProcesoEstado.$inferInsert)[] = [];
    const aLiberar: string[] = [];

    for (const f of filas) {
      r.evaluados++;

      const previo = f.base;
      const anterior: EstadoProceso | null =
        previo && previo.secopProcesoId
          ? {
              estado: previo.estado,
              estadoApertura: previo.estadoApertura,
              valorEstimado: previo.valorEstimado,
              modalidad: previo.modalidad,
              fechaRecepcion: previo.fechaRecepcion,
              adjudicado: previo.adjudicado,
              valorAdjudicado: previo.valorAdjudicado,
              adjudicatarioNit: previo.adjudicatarioNit,
              objetoHash: previo.objetoHash,
            }
          : null;

      const nuevo = estadoDesdeProceso(f);
      const evento = detectarEvento(anterior, nuevo);
      const terminal = esTerminal(nuevo.estado);

      if (terminal) {
        // Se suelta después de emitir el evento de esta corrida: ya no cambiará.
        if (anterior !== null) aLiberar.push(f.secopProcesoId);
      } else if (evento !== null) {
        // Solo se reescribe la línea base cuando algo cambió. En régimen normal
        // casi nada cambia de un día para otro, así que reescribir las 50.584
        // filas en cada corrida era el 90% del tiempo de ejecución — y los 300 s
        // de `maxDuration` ahora se reparten entre todas las etapas de `tick`.
        // Si no hubo evento, lo guardado ya es idéntico a lo nuevo.
        baseNueva.push({ secopProcesoId: f.secopProcesoId, ...nuevo, actualizadoEn: new Date() });
      }

      if (!evento) continue;

      if (evento.tipoEvento === "apertura" && !dentroDeVentana(f.fechaPublicacion, ventana)) {
        r.lineaBaseSembrada++;
        continue;
      }

      r[evento.tipoEvento]++;
      eventos.push({
        procesoId: f.procesoId,
        secopProcesoId: f.secopProcesoId,
        tipoEvento: evento.tipoEvento,
        // Antes venía de `rawRecord.sourceUpdatedAt` (el JOIN que se quitó). La
        // columna es metadata sin lector hoy (grep sobre `sourceObservedAt` en
        // src/ solo devuelve esta escritura y la definición del esquema), así
        // que se deja `null` en vez de inventar un proxy que nadie pidió.
        sourceObservedAt: null,
        estadoAnterior: evento.estadoAnterior,
        estadoNuevo: evento.estadoNuevo,
        valorAnterior: evento.valorAnterior,
        valorNuevo: evento.valorNuevo,
        fechaCierreAnterior: evento.fechaCierreAnterior,
        fechaCierreNueva: evento.fechaCierreNueva,
        delta: evento.delta,
        rawRecordId: f.rawRecordId,
        payloadHash: evento.payloadHash,
      });
    }

    if (eventos.length > 0) {
      await db
        .insert(alProcesoEvento)
        .values(eventos)
        // El detector reprocesa el mismo universo cada día: el mismo snapshot no
        // puede producir dos veces el mismo evento.
        .onConflictDoNothing({
          target: [
            alProcesoEvento.procesoId,
            alProcesoEvento.tipoEvento,
            alProcesoEvento.payloadHash,
          ],
        });
    }

    if (baseNueva.length > 0) {
      await db
        .insert(alProcesoEstado)
        .values(baseNueva)
        .onConflictDoUpdate({
          target: alProcesoEstado.secopProcesoId,
          set: {
            estado: sql`excluded.estado`,
            estadoApertura: sql`excluded.estado_apertura`,
            valorEstimado: sql`excluded.valor_estimado`,
            modalidad: sql`excluded.modalidad`,
            fechaRecepcion: sql`excluded.fecha_recepcion`,
            adjudicado: sql`excluded.adjudicado`,
            valorAdjudicado: sql`excluded.valor_adjudicado`,
            adjudicatarioNit: sql`excluded.adjudicatario_nit`,
            objetoHash: sql`excluded.objeto_hash`,
            actualizadoEn: new Date(),
          },
        });
    }

    if (aLiberar.length > 0) {
      await db.delete(alProcesoEstado).where(inArray(alProcesoEstado.secopProcesoId, aLiberar));
      r.seguimientoLiberado += aLiberar.length;
    }
  }

  return r;
}
