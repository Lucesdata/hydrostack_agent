/**
 * Detección de eventos contractuales por diff entre snapshots (0.2 §4, 0.1 §2).
 *
 * El contrato es una foto mutable; los cambios sustantivos entre una foto y la
 * siguiente se vuelven filas append-only en `contrato_evento`. Este módulo es
 * lógica PURA: compara dos snapshots normalizados y devuelve los eventos. No
 * toca la BD, no resuelve FKs (proveedor) ni asigna `correlation_id` — eso es del
 * escritor. La ejecución financiera (valor_pagado, etc.) NO genera evento (D13).
 *
 * Mapa de §4:
 *   sube valor_del_contrato            → adicion
 *   se mueve fecha_de_fin_del_contrato → prorroga
 *   estado → suspendido                → suspension
 *   estado → terminado/cerrado         → terminacion
 *   cambia documento_proveedor         → cesion
 */

import { cleanText, parseDate, parseMoney, stripAccents } from './normalize';
import { canonicalizeNit } from './nit';

export type TipoEvento = 'adicion' | 'prorroga' | 'suspension' | 'terminacion' | 'cesion';

/** Subconjunto normalizado del contrato que dispara eventos. */
export interface ContratoSnapshot {
  valor: number | null; // valor_del_contrato
  fechaFin: string | null; // fecha_de_fin_del_contrato (YYYY-MM-DD)
  estado: string | null; // estado_contrato (texto crudo limpio)
  docProveedor: string | null; // documento_proveedor canónico (sin DV)
}

/** Evento detectado, en forma neutra de BD (sin ids ni correlation_id). */
export interface DetectedEvent {
  tipoEvento: TipoEvento;
  valorAnterior?: number | null;
  valorNuevo?: number | null;
  fechaAnterior?: string | null;
  fechaNueva?: string | null;
  estadoAnterior?: string | null;
  estadoNuevo?: string | null;
  docProveedorAnterior?: string | null;
  docProveedorNuevo?: string | null;
}

type SodaRow = Record<string, unknown>;

/** Extrae el snapshot que dispara eventos desde una fila cruda de Contratos. */
export function contratoSnapshotFromRow(row: SodaRow): ContratoSnapshot {
  return {
    valor: parseMoney(row['valor_del_contrato']),
    fechaFin: parseDate(row['fecha_de_fin_del_contrato']),
    estado: cleanText(row['estado_contrato']),
    docProveedor: canonicalizeNit(row['documento_proveedor'], row['tipodocproveedor']).nitCanonico,
  };
}

/** `true` si el estado limpio indica suspensión. */
function isSuspended(estado: string | null): boolean {
  if (estado === null) return false;
  return stripAccents(estado.toLowerCase()).includes('suspend');
}

/** `true` si el estado limpio indica terminación/cierre/liquidación. */
function isTerminated(estado: string | null): boolean {
  if (estado === null) return false;
  const k = stripAccents(estado.toLowerCase());
  return k.includes('terminad') || k.includes('cerrad') || k.includes('liquidad');
}

/**
 * Compara dos snapshots y devuelve los eventos detectados. Un mismo snapshot
 * puede disparar varios (otrosí que adiciona valor y prorroga a la vez): el
 * escritor los agrupa con un `correlation_id` común.
 */
export function diffContrato(prev: ContratoSnapshot, next: ContratoSnapshot): DetectedEvent[] {
  const events: DetectedEvent[] = [];

  // adicion: el valor sube (estrictamente). Una baja no es evento contractual normal.
  if (prev.valor !== null && next.valor !== null && next.valor > prev.valor) {
    events.push({ tipoEvento: 'adicion', valorAnterior: prev.valor, valorNuevo: next.valor });
  }

  // prorroga: la fecha de fin se mueve hacia adelante (orden lexicográfico = cronológico en ISO).
  if (prev.fechaFin !== null && next.fechaFin !== null && next.fechaFin > prev.fechaFin) {
    events.push({ tipoEvento: 'prorroga', fechaAnterior: prev.fechaFin, fechaNueva: next.fechaFin });
  }

  // suspension / terminacion: transición HACIA el estado (no se re-emite si ya estaba).
  if (isSuspended(next.estado) && !isSuspended(prev.estado)) {
    events.push({ tipoEvento: 'suspension', estadoAnterior: prev.estado, estadoNuevo: next.estado });
  }
  if (isTerminated(next.estado) && !isTerminated(prev.estado)) {
    events.push({ tipoEvento: 'terminacion', estadoAnterior: prev.estado, estadoNuevo: next.estado });
  }

  // cesion: cambia el documento del proveedor (ambos presentes y distintos).
  if (
    prev.docProveedor !== null &&
    next.docProveedor !== null &&
    prev.docProveedor !== next.docProveedor
  ) {
    events.push({
      tipoEvento: 'cesion',
      docProveedorAnterior: prev.docProveedor,
      docProveedorNuevo: next.docProveedor,
    });
  }

  return events;
}

/** Atajo: diff directo entre dos filas crudas de Contratos. */
export function diffContratoRows(prev: SodaRow, next: SodaRow): DetectedEvent[] {
  return diffContrato(contratoSnapshotFromRow(prev), contratoSnapshotFromRow(next));
}
