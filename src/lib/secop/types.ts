/**
 * Tipos normalizados de SECOP.
 * La UI y el agente trabajan SIEMPRE con estas formas, nunca con el JSON
 * crudo de Socrata. Así, si cambian los nombres de campo, solo tocas el
 * normalizador en client.ts (y config.ts), no el resto del código.
 */

import type { DocumentAccess } from './document-access';
import type { SectorKey } from './sectorKeywords';

/**
 * Apertura del proceso (campo `estado_de_apertura_del_proceso`). Único insumo
 * Nivel-0 de la compuerta Plazo del veredicto: el dataset Procesos NO trae fecha
 * de cierre exacta (spike 2026-06-27). Vive aquí por ser metadata normalizada
 * general (la UI también podría mostrarla).
 */
export type EstadoApertura = 'Abierto' | 'Cerrado';

export interface SecopProceso {
  id: string;
  referencia: string;
  nombre: string;
  descripcion: string;
  entidad: string;
  departamento: string;
  ciudad: string;
  estado: string;
  fase: string;
  modalidad: string;
  tipoContrato: string;
  fechaPublicacion: string | null;
  precioBase: number | null;
  adjudicado: boolean;
  valorAdjudicacion: number | null;
  adjudicatario: string | null;
  unspsc: string | null;
  url: string | null;
  /** Apertura del proceso (Abierto/Cerrado). null si la fuente no lo trae. */
  estadoApertura: EstadoApertura | null;
  /** Gate de acceso documental (Fase B2/C). Preliminar vía preclassify; se
   *  refina con el probe on-demand. */
  documentAccess: DocumentAccess;
  accessMessage: string;
}

export interface SecopContrato {
  id: string;
  referencia: string;
  objeto: string;
  entidad: string;
  departamento: string;
  ciudad: string;
  estado: string;
  proveedor: string | null;
  fechaFirma: string | null;
  valor: number | null;
  unspsc: string | null;
  url: string | null;
}

export interface SecopQuery {
  /** Texto libre (busca en nombre/descripción del proceso). */
  q?: string;
  departamento?: string;
  estado?: string;
  /** Valor mínimo en COP. */
  valorMin?: number;
  /** Solo procesos publicados desde esta fecha ISO (YYYY-MM-DD). */
  desde?: string;
  /** Filtra por apertura del proceso (Abierto = aún recibe ofertas). */
  apertura?: EstadoApertura;
  /** Orden: fecha de publicación desc (default) o precio base desc. */
  orden?: 'fecha' | 'valor';
  /** Si true, aplica el filtro de palabras clave del sector agua. */
  soloAgua?: boolean;
  /** Filtra por sub-sector (taxonomía nueva: acueducto/alcantarillado/ptar/psmv/etap). */
  sector?: SectorKey;
  page?: number;
  pageSize?: number;
}

export interface SecopResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  /** SODA no devuelve total barato; lo dejamos opcional. */
  total?: number;
}
