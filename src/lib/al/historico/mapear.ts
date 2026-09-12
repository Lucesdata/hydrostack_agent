/**
 * Mapeo puro fila de `proceso` (o de proponentes) → fila de
 * `al_oferentes_historico` (SDD §4.7, módulo 2).
 *
 * Sin IO y sin base: se prueba con literales. `mapearAdjudicatario` leía del
 * payload crudo hasta 2026-09-12; ahora lee de las columnas canónicas de
 * `proceso`, que ya llegan tipadas (booleano real, money normalizado) desde la
 * ingesta. `mapearProponente` sigue leyendo del dataset de proponentes
 * (`hgi6-6wh3`), que no pasa por `proceso` y sí necesita los normalizadores
 * que ya existen para la ingesta — `cleanText` y `canonicalizeNit` —, no una
 * copia local de la lista de centinelas.
 */

import { cleanText, stripAccents } from "@/src/lib/transform/normalize";
import { canonicalizeNit } from "@/src/lib/transform/nit";
import { UNSPSC_PREFIX } from "@/src/lib/secop/ingest-net";

export interface FilaHistorico {
  secopProcesoId: string;
  procesoId: string | null;
  proveedorKey: string;
  proveedorNit: string | null;
  proveedorNombre: string;
  adjudicado: boolean;
  entidadId: string | null;
  entidadNit: string | null;
  geografiaId: string | null;
  unspsc: string | null;
  modalidad: string | null;
  valorEstimado: string | null;
  valorAdjudicado: string | null;
  fechaAdjudicacion: string | null;
  fechaPublicacion: string | null;
  fuente: "proceso" | "proponentes";
  rawRecordId: string | null;
}

/**
 * ¿Este documento es un NIT/cédula creíble?
 *
 * La fuente publica basura numérica en el campo de documento: "0", "0000",
 * "00000", "1", "2026". Medido sobre la carga real: 77 filas con menos de 6
 * dígitos y 21 con un dígito repetido; el valor "0" agrupaba **22 razones
 * sociales distintas** y "1111111111" otras 6. Como
 * la llave de deduplicación usa el NIT cuando existe, aceptar esa basura fusiona
 * empresas sin relación en un mismo "competidor" — `historialCompetidor("0")`
 * habría mostrado 22 empresas como una.
 *
 * Un documento implausible se trata como ausente y la llave cae al nombre, que
 * es lo conservador: separa de más antes que fusionar de menos. Los NITs reales
 * se concentran en 8–10 dígitos (13.334 de 15.000 filas con documento).
 */
export function nitPlausible(nit: string | null): boolean {
  if (!nit) return false;
  if (!/^\d{6,12}$/.test(nit)) return false;
  // Comodines: un mismo dígito repetido ("0000", "1111111111", "999999999").
  // Medidos en la carga real, fusionaban 41 razones sociales distintas.
  if (/^(\d)\1+$/.test(nit)) return false;
  // Secuencias de teclado ("123456789", "1234567890"): la fuente de sanciones
  // trae 6 filas con "123456789" y el nombre "PRUEBA CONTRATISTA".
  return !esSecuenciaAscendente(nit);
}

/** "12345678" sí; "12345679" no. */
function esSecuenciaAscendente(d: string): boolean {
  for (let i = 1; i < d.length; i++) {
    if ((Number(d[i - 1]) + 1) % 10 !== Number(d[i])) return false;
  }
  return true;
}

/**
 * Llave de deduplicación del proveedor dentro de un proceso.
 *
 * El NIT manda cuando existe. Cuando no —la mitad de los adjudicados— se usa el
 * nombre normalizado, porque un índice único sobre una columna NULL no
 * deduplica nada en Postgres: cada NULL es distinto de los demás y el backfill
 * insertaría la misma participación en cada corrida.
 *
 * El prefijo evita que un proveedor cuyo nombre sean dígitos colisione con un NIT.
 */
export function proveedorKey(nit: string | null, nombre: string): string {
  if (nitPlausible(nit)) return `nit:${nit}`;
  return `nom:${normalizarNombre(nombre)}`;
}

/** Mayúsculas, sin tildes, sin puntuación y con espacios colapsados. */
export function normalizarNombre(s: string): string {
  return stripAccents(s)
    .toUpperCase()
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Money de la fuente: string con dígitos. Un 0 no es un precio, es "sin dato". */
function money(v: unknown): string | null {
  const s = cleanText(v);
  if (s === null) return null;
  const n = Number(s.replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n.toFixed(2);
}

/** "2018-05-18T00:00:00.000" → "2018-05-18". */
function fecha(v: unknown): string | null {
  const s = cleanText(v);
  if (s === null) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : null;
}

/** "V1.77121701" → "77121701". El prefijo es de versión, no del código. */
function unspsc(v: unknown): string | null {
  const s = cleanText(v);
  if (s === null) return null;
  const sinPrefijo = s.startsWith(UNSPSC_PREFIX) ? s.slice(UNSPSC_PREFIX.length) : s;
  return /^\d{6,10}$/.test(sinPrefijo) ? sinPrefijo : null;
}

/** Contexto del proceso canónico, ya resuelto por la ingesta. */
export interface ContextoProceso {
  procesoId: string | null;
  entidadId: string | null;
  entidadNit: string | null;
  geografiaId: string | null;
  modalidad: string | null;
  valorEstimado: string | null;
  fechaPublicacion: string | null;
}

/**
 * Fila de `proceso` con los campos que necesita `mapearAdjudicatario`. Ya
 * llegan tipados desde la ingesta (`mapProcesoRow`), salvo dos cosas que
 * siguen necesitando los normalizadores locales: `unspsc` conserva el
 * prefijo de versión ("V1.") porque `mapProcesoRow` solo le aplica
 * `cleanText`, y `valorEstimado`/`valorAdjudicacion` conservan un `0` como
 * número real (`parseMoney("0") === 0`, no `null`) porque esa regla de
 * "0 no es precio" vive aquí, no en la ingesta.
 */
export interface FilaProceso {
  secopProcesoId: string;
  adjudicado: boolean | null;
  adjudicatario: string | null;
  nitAdjudicatario: string | null;
  unspsc: string | null;
  modalidad: string | null;
  valorEstimado: string | null;
  valorAdjudicacion: string | null;
  fechaAdjudicacion: string | null;
}

/**
 * Fila del ADJUDICATARIO a partir de la fila canónica de `proceso`.
 *
 * Devuelve `null` cuando el proceso no está adjudicado, y ése es el filtro que
 * importa: `estado_del_procedimiento='Seleccionado'` **no** implica adjudicado —
 * 23.195 de nuestros 36.724 "Seleccionado" tienen `adjudicado='No'`. Usar el
 * estado como criterio habría cargado un 63% de filas sin ganador.
 *
 * Hasta 2026-09-12 esto leía el payload crudo de `raw_record`; `adjudicado`
 * era el string `"Si"`/`"No"` y ahora es un booleano real, así que la
 * comparación es `=== true`, no `cleanText(...)?.toLowerCase() === "si"`.
 */
export function mapearAdjudicatario(
  fila: FilaProceso,
  ctx: ContextoProceso,
  rawRecordId: string | null
): FilaHistorico | null {
  if (fila.adjudicado !== true) return null;

  const nombre = cleanText(fila.adjudicatario);
  if (nombre === null) return null; // sin ganador atribuible no hay fila que escribir

  const { nitCanonico } = canonicalizeNit(fila.nitAdjudicatario, "NIT");

  return {
    secopProcesoId: fila.secopProcesoId,
    procesoId: ctx.procesoId,
    proveedorKey: proveedorKey(nitCanonico, nombre),
    // Un documento implausible tampoco se guarda: cruzaría mal contra
    // `al_sanciones` y contra `proveedor.nit_canonico`.
    proveedorNit: nitPlausible(nitCanonico) ? nitCanonico : null,
    proveedorNombre: nombre,
    adjudicado: true,
    entidadId: ctx.entidadId,
    entidadNit: ctx.entidadNit,
    geografiaId: ctx.geografiaId,
    unspsc: unspsc(fila.unspsc),
    modalidad: ctx.modalidad ?? fila.modalidad,
    valorEstimado: ctx.valorEstimado ?? money(fila.valorEstimado),
    valorAdjudicado: money(fila.valorAdjudicacion),
    fechaAdjudicacion: fecha(fila.fechaAdjudicacion),
    fechaPublicacion: ctx.fechaPublicacion,
    fuente: "proceso",
    rawRecordId,
  };
}

/** Fila de un PROPONENTE del dataset `hgi6-6wh3`. */
export interface FilaProponenteFuente {
  id_procedimiento?: unknown;
  nit_proveedor?: unknown;
  proveedor?: unknown;
  nit_entidad?: unknown;
  fecha_publicaci_n?: unknown;
}

/**
 * `adjudicado` se deja en `false`: quién ganó lo decide la fila que viene del
 * proceso, no esta fuente. Si el proponente resulta ser el ganador, el upsert
 * por `(secop_proceso_id, proveedor_key)` colisiona con la fila de
 * `fuente='proceso'` y **no la degrada** — el escritor no pisa `adjudicado`
 * ni `valor_adjudicado` con datos de proponentes.
 */
export function mapearProponente(
  row: FilaProponenteFuente,
  ctx: ContextoProceso
): FilaHistorico | null {
  const secopProcesoId = cleanText(row.id_procedimiento);
  const nombre = cleanText(row.proveedor);
  if (secopProcesoId === null || nombre === null) return null;

  const { nitCanonico } = canonicalizeNit(row.nit_proveedor, "NIT");

  return {
    secopProcesoId,
    procesoId: ctx.procesoId,
    proveedorKey: proveedorKey(nitCanonico, nombre),
    proveedorNit: nitPlausible(nitCanonico) ? nitCanonico : null,
    proveedorNombre: nombre,
    adjudicado: false,
    entidadId: ctx.entidadId,
    entidadNit: ctx.entidadNit ?? cleanText(row.nit_entidad),
    geografiaId: ctx.geografiaId,
    unspsc: null, // la fuente de proponentes no trae UNSPSC
    modalidad: ctx.modalidad,
    valorEstimado: ctx.valorEstimado,
    valorAdjudicado: null, // la fuente NO publica el precio del que pierde
    fechaAdjudicacion: null,
    fechaPublicacion: ctx.fechaPublicacion ?? fecha(row.fecha_publicaci_n),
    fuente: "proponentes",
    rawRecordId: null,
  };
}
