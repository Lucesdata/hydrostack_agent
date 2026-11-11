import { ALTO_MAPA, ANCHO_MAPA } from "./modelo";
import { CODIGOS_CON_ANCLA, anclaDe } from "./etiquetas-procesos";

/**
 * El «despiece» del mapa del hero (2026-11-11): hacia dónde se separa cada
 * departamento cuando el país se desarma, y en qué orden vuelve a su sitio.
 *
 * Cada pieza se aleja del centro del país en la dirección de su propio anclaje,
 * así que el despiece conserva la forma: Nariño sale hacia el suroeste y La
 * Guajira hacia el noreste. El vector va en unidades del viewBox y el hero lo
 * multiplica por un factor (`--g` en su CSS): 1 es el país desarmado, ~0,04 las
 * rendijas del país armado. Es **solo presentación**: no mueve anclajes de dato
 * ni cambia qué departamento es cuál, y el SVG sigue siendo de servidor.
 *
 * Puro y determinístico (sin azar): se prueba sin DOM.
 */

/** El centro del despiece: el del lienzo, un poco al norte (ahí vive el país). */
export const CENTRO_DESPIECE: [number, number] = [ANCHO_MAPA / 2, ALTO_MAPA / 2 - 14];

export interface Despiece {
  /** Desplazamiento en unidades del viewBox con el país desarmado del todo. */
  x: number;
  y: number;
  /** Turno de ensamblaje: 0 es la pieza más cercana al centro. */
  orden: number;
}

const redondo = (v: number) => Math.round(v * 10) / 10;

const VECTORES = new Map<string, [number, number]>(
  CODIGOS_CON_ANCLA.flatMap((dpto) => {
    const ancla = anclaDe(dpto);
    if (!ancla) return [];
    return [[dpto, [ancla[0] - CENTRO_DESPIECE[0], ancla[1] - CENTRO_DESPIECE[1]]] as const];
  }).map(([dpto, v]) => [dpto, v as [number, number]])
);

/** Del centro hacia fuera: el país se arma desde el corazón andino. */
const ORDEN = new Map(
  [...VECTORES]
    .sort((a, b) => Math.hypot(...a[1]) - Math.hypot(...b[1]) || a[0].localeCompare(b[0]))
    .map(([dpto], i) => [dpto, i])
);

/** El despiece de un departamento, o `null` si el mapa no sabe anclarlo. */
export function despieceDe(dpto: string): Despiece | null {
  const v = VECTORES.get(dpto);
  if (!v) return null;
  return { x: redondo(v[0]), y: redondo(v[1]), orden: ORDEN.get(dpto) ?? 0 };
}

/**
 * Las variables CSS de una pieza, para el atributo `style` del SVG de servidor.
 * `undefined` si no hay despiece: la pieza se queda quieta.
 */
export function estiloDespiece(dpto: string): Record<string, string> | undefined {
  const d = despieceDe(dpto);
  if (!d) return undefined;
  return { "--ex": `${d.x}px`, "--ey": `${d.y}px`, "--i": String(d.orden) };
}
