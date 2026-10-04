import { ALTO_MAPA, ANCHO_MAPA, LADO_RECUADRO, RECUADRO_X, RECUADRO_Y } from "./modelo";
import { ANCLAS } from "./rotulos";

/**
 * Dónde van las etiquetas de los procesos del hero sobre el mapa (spec
 * 2026-10-04-hero-cinco-minifichas §7.4–§7.7).
 *
 * **El anclaje es departamental**: la base guarda municipio, pero no sus
 * coordenadas, y la ubicación es la sede de la entidad. Un punto en una ciudad
 * afirmaría una precisión que el dato no tiene. Se reutilizan los anclajes de
 * `ANCLAS`, corregidos donde no caían dentro de su departamento (abajo), y,
 * para San Andrés, el centro de su recuadro.
 *
 * Varios procesos en un mismo departamento **comparten el anclaje** y cada uno
 * lleva su etiqueta: nadie se desplaza a un lugar falso para separarlos. Las
 * etiquetas van en dos columnas, fuera de la silueta (oeste y este), apiladas
 * sin solaparse cerca de la altura de su anclaje y unidas a él por una guía.
 * Con cinco caben siempre: cada columna admite diez.
 *
 * Puro y determinístico: lo usa el SVG de servidor y se prueba sin DOM.
 */

/** Hueco a cada lado del mapa para las columnas de etiquetas. */
export const MARGEN_ETIQUETAS = 158;
export const ANCHO_ETIQUETA = 150;
export const ALTO_ETIQUETA = 44;
const SEPARACION = 8;
/** Distancia entre la etiqueta y el borde del lienzo del mapa. */
const AIRE = 4;

/**
 * Anclajes corregidos para este mapa. Los de `ANCLAS` son centroides y sirven
 * para un rótulo de departamento, pero no todos caen dentro: el de Risaralda
 * queda fuera de su polígono y el de Cundinamarca a media unidad de Bogotá, así
 * que un punto «en Cundinamarca» se leería en Bogotá. Estos son puntos
 * interiores (el más alejado del borde, buscado en una rejilla de 0,5 sobre la
 * geometría proyectada); `etiquetas-procesos.test` exige que todos los
 * anclajes queden dentro y a 2 unidades o más del borde. No se tocan las
 * `ANCLAS` compartidas: las usan los rótulos de otros mapas.
 */
const ANCLAS_INTERIORES: Record<string, [number, number]> = {
  "11": [174, 246],
  "13": [172, 129],
  "15": [214, 211],
  "17": [131, 229],
  "25": [166, 230],
  "63": [124, 248],
  "66": [115, 225],
  "70": [149, 116],
};

/** El centro del recuadro de San Andrés, en el viewBox del mapa. */
const ANCLA_SAN_ANDRES: [number, number] = [
  RECUADRO_X + LADO_RECUADRO / 2,
  RECUADRO_Y + LADO_RECUADRO / 2,
];

/** El anclaje de un departamento, o `null` si el mapa no sabe dónde ponerlo. */
export function anclaDe(dpto: string): [number, number] | null {
  if (dpto === "88") return ANCLA_SAN_ANDRES;
  return ANCLAS_INTERIORES[dpto] ?? ANCLAS[dpto] ?? null;
}

/** Los códigos que el mapa sabe anclar: los únicos candidatos del hero. */
export const CODIGOS_CON_ANCLA: string[] = [...Object.keys(ANCLAS), "88"].sort();

export type LadoEtiqueta = "oeste" | "este";

export interface EtiquetaColocada {
  id: string;
  dpto: string;
  lado: LadoEtiqueta;
  /** Centro de la caja. */
  x: number;
  y: number;
  anclaX: number;
  anclaY: number;
  /** Extremo de la guía en el borde interior de la caja. */
  guiaX: number;
}

/** Centro x de cada columna. */
export const X_COLUMNA: Record<LadoEtiqueta, number> = {
  oeste: -MARGEN_ETIQUETAS + AIRE + ANCHO_ETIQUETA / 2,
  este: ANCHO_MAPA + MARGEN_ETIQUETAS - AIRE - ANCHO_ETIQUETA / 2,
};

const Y_MIN = ALTO_ETIQUETA / 2 + 2;
const Y_MAX = ALTO_MAPA - ALTO_ETIQUETA / 2 - 2;
const PASO = ALTO_ETIQUETA + SEPARACION;

/**
 * Apila una columna: cada caja tan cerca de su altura deseada como permita la
 * anterior, y si la última se sale por abajo, se empuja todo hacia arriba.
 */
function apilar(deseadas: number[]): number[] {
  const ys = [...deseadas];
  for (let i = 0; i < ys.length; i++) {
    ys[i] = Math.max(ys[i], Y_MIN, i > 0 ? ys[i - 1] + PASO : -Infinity);
  }
  for (let i = ys.length - 1; i >= 0; i--) {
    ys[i] = Math.min(ys[i], Y_MAX, i < ys.length - 1 ? ys[i + 1] - PASO : Infinity);
  }
  return ys;
}

/**
 * Las etiquetas de `entradas`, en su orden. Las que no tienen anclaje quedan
 * fuera (la consulta ya no las deja pasar). Todas las de un departamento van
 * al mismo lado, una debajo de otra, centradas en la altura del anclaje.
 */
export function colocarEtiquetas(entradas: { id: string; dpto: string }[]): EtiquetaColocada[] {
  const grupos = new Map<string, string[]>();
  for (const e of entradas) {
    if (!anclaDe(e.dpto)) continue;
    grupos.set(e.dpto, [...(grupos.get(e.dpto) ?? []), e.id]);
  }

  const porLado: Record<LadoEtiqueta, { id: string; dpto: string; deseada: number }[]> = {
    oeste: [],
    este: [],
  };
  for (const [dpto, ids] of grupos) {
    const [ax, ay] = anclaDe(dpto)!;
    const lado: LadoEtiqueta = ax < ANCHO_MAPA / 2 ? "oeste" : "este";
    ids.forEach((id, i) => {
      porLado[lado].push({ id, dpto, deseada: ay + (i - (ids.length - 1) / 2) * PASO });
    });
  }

  const colocadas = new Map<string, EtiquetaColocada>();
  for (const lado of ["oeste", "este"] as const) {
    // Orden estable: por altura deseada y, a igualdad, por llegada.
    const columna = porLado[lado]
      .map((e, i) => ({ ...e, i }))
      .sort((a, b) => a.deseada - b.deseada || a.i - b.i);
    const ys = apilar(columna.map((e) => e.deseada));
    const x = X_COLUMNA[lado];
    columna.forEach((e, i) => {
      const [anclaX, anclaY] = anclaDe(e.dpto)!;
      colocadas.set(e.id, {
        id: e.id,
        dpto: e.dpto,
        lado,
        x,
        y: ys[i],
        anclaX,
        anclaY,
        guiaX: lado === "oeste" ? x + ANCHO_ETIQUETA / 2 : x - ANCHO_ETIQUETA / 2,
      });
    });
  }

  return entradas.flatMap((e) => colocadas.get(e.id) ?? []);
}
