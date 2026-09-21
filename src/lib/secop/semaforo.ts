/**
 * El modelo de vista del semáforo de cinco compuertas.
 *
 * Existe para separar dos cosas que estaban pegadas: QUÉ dice cada compuerta y
 * CÓMO se dibuja. El cálculo vive en `verdict.ts` y la pintura en
 * `components/secop/semaforo/`; esto es el puente, y es puro — se puede probar
 * sin montar un componente.
 *
 * ── El quinto estado ────────────────────────────────────────────────────────
 * `verdict.ts` tiene cuatro: PASS, WARN, FAIL, UNKNOWN. Los cuatro presuponen un
 * perfil de oferente contra el que comparar. Sin perfil —que es como llega
 * cualquiera desde un buscador— no hay veredicto que dar, y pintar verde sería
 * mentir: el verde dice "calificas", no "el proceso es de acueducto".
 *
 * Por eso se añade `DATO`: la lectura absoluta, que enuncia lo que el proceso
 * EXIGE en ese eje sin juzgar a nadie. Es lo que el spec pide para el visitante
 * sin cuenta, y lo que convierte el semáforo en un gancho honesto — se ve la
 * forma de la respuesta, falta la mitad que compara.
 */

import type { GateStatus, Verdict } from "./verdict";
import type { VerdictRespuesta } from "./verdict-publico";
import { formatCopCompact } from "@/src/components/secop/format";
import { montoConDato } from "./monto";
import { TIPO_PROYECTO, type TipoProyecto } from "../classify/tipo-proyecto";

export type EstadoCompuerta = GateStatus | "DATO";

/** Las cinco, en el orden en que se muestran. Es el orden del spec. */
export const CLAVES_COMPUERTA = [
  "sectorial",
  "cuantia",
  "plazo",
  "ubicacion",
  "habilitacion",
] as const;
export type ClaveCompuerta = (typeof CLAVES_COMPUERTA)[number];

/**
 * El rótulo corto de cada compuerta. `ubicacion` se muestra como "Zona": el
 * código la llamó así antes de que el producto la llamara de la otra forma, y
 * renombrar la clave arrastraría `verdict.ts`, sus tests y el endpoint. El
 * usuario lee "Zona"; el código sigue diciendo `ubicacion`.
 */
export const ETIQUETA_COMPUERTA: Record<ClaveCompuerta, string> = {
  sectorial: "Sector",
  cuantia: "Cuantía",
  plazo: "Plazo",
  ubicacion: "Zona",
  habilitacion: "Habilitación",
};

/**
 * La palabra que acompaña al color. NUNCA se pinta un punto sin ella: es la
 * regla 4 del spec de rediseño, y la razón es que verde y ámbar difieren un 4%
 * en luminancia — para quien no distingue esos tonos, el color solo no dice nada.
 */
export const PALABRA_ESTADO: Record<EstadoCompuerta, string> = {
  PASS: "cumple",
  WARN: "revisar",
  FAIL: "no cumple",
  UNKNOWN: "sin datos",
  DATO: "exige",
};

export interface CompuertaVista {
  clave: ClaveCompuerta;
  etiqueta: string;
  estado: EstadoCompuerta;
  /** La frase que explica el estado. `null` cuando la política la redacta. */
  explicacion: string | null;
  /**
   * Lo que se muestra en la fila densa, donde no cabe la frase entera.
   *
   * No es la palabra del estado repetida cinco veces: en la lectura absoluta eso
   * daría "Sector exige · Cuantía exige · Plazo exige", que ocupa sitio y no
   * dice nada — se probó y se descartó. Aquí va el VALOR ("PTAR", "$49 M",
   * "Cundinamarca"), que es lo que distingue un proceso de otro de un vistazo.
   * En la lectura relativa sí es el estado, porque ahí el estado ES la
   * información.
   */
  valorCorto: string;
  /** true si hay explicación pero pide cuenta para verla (verdict-publico). */
  redactada: boolean;
}

/** Las cinco compuertas de un veredicto real, con o sin explicación redactada. */
export function compuertasDesdeVeredicto(v: Verdict | VerdictRespuesta): CompuertaVista[] {
  return CLAVES_COMPUERTA.map((clave) => {
    const g = v.gates[clave];
    const redactada = "redactado" in g && g.redactado === true;
    return {
      clave,
      etiqueta: ETIQUETA_COMPUERTA[clave],
      estado: g.status,
      explicacion: redactada ? null : ((g as { reason: string }).reason ?? null),
      valorCorto: PALABRA_ESTADO[g.status],
      redactada,
    };
  });
}

/** Lo que hace falta saber del proceso para la lectura absoluta. */
export interface ProcesoParaSemaforo {
  tipoProyecto: TipoProyecto | null;
  valorEstimado: string | number | null;
  departamento: string | null;
  municipio: string | null;
  estadoApertura: string | null;
  fechaRecepcion: string | null;
}

/**
 * La lectura ABSOLUTA: qué exige el proceso en cada eje, sin compararlo con
 * nadie. Es la versión que ve quien llega sin perfil.
 *
 * Todas las compuertas salen en `DATO` salvo las que de verdad no tienen dato,
 * que salen en `UNKNOWN`. Ninguna sale en PASS o FAIL: sin perfil no hay nada
 * que aprobar ni que suspender, y fingirlo sería el tipo de veredicto a ciegas
 * que el producto dice no dar.
 */
export function compuertasAbsolutas(p: ProcesoParaSemaforo): CompuertaVista[] {
  const valor = montoConDato(p.valorEstimado);
  const lugar = [p.municipio, p.departamento].filter(Boolean).join(", ");

  const dato = (
    clave: ClaveCompuerta,
    valorCorto: string | null,
    explicacion: string | null
  ): CompuertaVista => ({
    clave,
    etiqueta: ETIQUETA_COMPUERTA[clave],
    estado: explicacion === null ? "UNKNOWN" : "DATO",
    explicacion,
    valorCorto: valorCorto ?? PALABRA_ESTADO.UNKNOWN,
    redactada: false,
  });

  return [
    dato(
      "sectorial",
      p.tipoProyecto ? TIPO_PROYECTO[p.tipoProyecto].label : null,
      p.tipoProyecto && p.tipoProyecto !== "otros"
        ? // Sin `toLowerCase()`: PTAP y PTAR son siglas y en minúscula quedaban
          // como "Proyecto de ptar", que parece una errata. Los otros dos
          // rótulos ya vienen en caja de frase.
          `Proyecto de ${TIPO_PROYECTO[p.tipoProyecto].label}.`
        : "El objeto no declara un subsistema concreto de agua o saneamiento."
    ),
    dato(
      "cuantia",
      // Sin `formatCopCompact(valor)` a secas: para "sin dato" esta compuerta
      // no dice "—" sino la palabra de UNKNOWN, que `dato()` pone cuando le
      // llega null.
      valor !== null ? formatCopCompact(valor) : null,
      // Sin presupuesto publicado no hay exigencia que enunciar. El 0 del
      // dataset ya vino filtrado por `montoConDato`, así que `valor === null`
      // cubre igual "no hay columna" y "la columna dice 0".
      valor !== null ? `Presupuesto oficial de ${formatCopCompact(valor)}.` : null
    ),
    dato(
      "plazo",
      p.fechaRecepcion
        ? new Date(p.fechaRecepcion).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })
        : p.estadoApertura === "Abierto"
          ? "abierto"
          : null,
      // El dataset del SECOP no trae fecha de cierre: solo la ventana binaria de
      // apertura y, en un 31% de las filas, una fecha de recepción. Se dice lo
      // que hay, no se deduce un plazo que nadie publicó.
      p.fechaRecepcion
        ? `Recepción de ofertas hasta el ${new Date(p.fechaRecepcion).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}.`
        : p.estadoApertura === "Abierto"
          ? "Abierto a ofertas. El SECOP no publica la fecha de cierre en este dataset."
          : null
    ),
    dato("ubicacion", p.departamento ?? p.municipio, lugar ? `Se ejecuta en ${lugar}.` : null),
    dato(
      "habilitacion",
      null,
      // Siempre UNKNOWN en Nivel 0, y aquí tampoco se puede enunciar: los
      // requisitos habilitantes viven en el pliego y `requisitos_proceso` está
      // vacía. Decirlo es más útil que dejar el hueco.
      null
    ),
  ];
}
