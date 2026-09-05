/**
 * Mapeo puro de las dos fuentes de multas a `al_sanciones` (SDD módulo 3).
 *
 * Cada fuente cruza por una llave distinta y eso no es un detalle de
 * implementación, es el hallazgo que define el módulo:
 *
 *  - SECOP I  → por PROVEEDOR. `documento_contratista` es un documento real.
 *  - SECOP II → por PROCESO. Su campo de documento son 7–8 dígitos sin un solo
 *    NIT de empresa (0 de 251 cruzan), pero su `id_proceso` es un `CO1.BDOS.*`
 *    que empata con `proceso.portafolio_id`.
 */

import { cleanText } from "@/src/lib/transform/normalize";
import { canonicalizeNit } from "@/src/lib/transform/nit";
import { nitPlausible } from "@/src/lib/al/historico/mapear";

export interface FilaSancion {
  fuente: "secop_i_multas" | "secop_ii_multas";
  registroKey: string;
  documento: string | null;
  nitCanonico: string | null;
  proveedorNombre: string | null;
  portafolioId: string | null;
  entidadNit: string | null;
  entidadNombre: string | null;
  tipo: string | null;
  valorSancion: string | null;
  numeroActo: string | null;
  numeroContrato: string | null;
  fechaFirmeza: string | null;
  fechaPublicacion: string | null;
  urlProceso: string | null;
  payload: Record<string, unknown>;
}

function money(v: unknown): string | null {
  const s = cleanText(v);
  if (s === null) return null;
  const n = Number(s.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n > 0 ? n.toFixed(2) : null;
}

function fecha(v: unknown): string | null {
  const s = cleanText(v);
  if (s === null) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : null;
}

function soloDigitos(v: unknown): string | null {
  const s = cleanText(v);
  if (s === null) return null;
  const d = s.replace(/\D/g, "");
  return d === "" ? null : d;
}

/**
 * Llave natural del registro, compuesta y determinista. La recarga es semanal y
 * completa: sin una llave estable, cada lunes duplicaría las 2.262 filas.
 * Las partes vacías se dejan como cadena vacía para que la posición no se
 * desplace y dos registros distintos no colapsen.
 */
function key(...partes: Array<string | null>): string {
  return partes.map((p) => (p ?? "").trim()).join("|");
}

export function mapearSancionSecopI(row: Record<string, unknown>): FilaSancion | null {
  const documento = soloDigitos(row.documento_contratista);
  const acto = cleanText(row.numero_de_resolucion);
  const contrato = cleanText(row.numero_de_contrato);
  if (documento === null && acto === null && contrato === null) return null;

  const entidadNit = soloDigitos(row.nit_entidad);
  const { nitCanonico } = canonicalizeNit(documento, "NIT");

  /**
   * Fila malformada: la entidad puso su propio NIT en el campo del contratista y
   * el número de resolución en el del nombre. Son 14 filas medidas. La fila se
   * conserva —la sanción existió— pero NO se promueve a NIT: cruzarla diría que
   * un hospital se sancionó a sí mismo.
   */
  const esAutorreferencia = documento !== null && documento === entidadNit;

  return {
    fuente: "secop_i_multas",
    registroKey: key(documento, acto, contrato),
    documento,
    // Solo se promueve a NIT lo que tiene forma creíble: cruzar por un documento
    // comodín fusionaría sancionados distintos, igual que en el histórico.
    nitCanonico: !esAutorreferencia && nitPlausible(nitCanonico) ? nitCanonico : null,
    proveedorNombre: cleanText(row.nombre_contratista),
    portafolioId: null, // esta fuente es de SECOP I: no hay CO1.BDOS
    entidadNit,
    entidadNombre: cleanText(row.nombre_entidad),
    tipo: "Multa",
    valorSancion: money(row.valor_sancion),
    numeroActo: acto,
    numeroContrato: contrato,
    fechaFirmeza: fecha(row.fecha_de_firmeza),
    fechaPublicacion: fecha(row.fecha_de_publicacion),
    urlProceso: cleanText(row.ruta_de_proceso),
    payload: row,
  };
}

export function mapearSancionSecopII(row: Record<string, unknown>): FilaSancion | null {
  const portafolioId = cleanText(row.id_proceso);
  const acto = cleanText(row.numero_de_acto);
  const documento = soloDigitos(row.as_codigo_proveedor_objeto);
  if (portafolioId === null && acto === null) return null;

  const { nitCanonico } = canonicalizeNit(documento, "NIT");

  return {
    fuente: "secop_ii_multas",
    registroKey: key(portafolioId, acto, documento, cleanText(row.numero_de_version)),
    documento,
    /**
     * En la práctica esto será casi siempre NULL: los 251 documentos distintos de
     * esta fuente tienen 7 u 8 dígitos y ninguno forma de NIT de empresa. Se
     * intenta igual por si la fuente mejora; el cruce real es por proceso.
     */
    nitCanonico: nitPlausible(nitCanonico) ? nitCanonico : null,
    proveedorNombre: cleanText(row.nombre_proveedor_objeto_de),
    portafolioId,
    entidadNit: null,
    entidadNombre: cleanText(row.nombre_entidad_creadora),
    tipo: cleanText(row.tipo_de_sancion),
    valorSancion: money(row.valor),
    numeroActo: acto,
    numeroContrato: cleanText(row.id_contrato),
    fechaFirmeza: fecha(row.fecha_evento),
    fechaPublicacion: null,
    urlProceso: null,
    payload: row,
  };
}
