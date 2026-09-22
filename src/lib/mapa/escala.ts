/**
 * Los cinco escalones de color del mapa departamental.
 *
 * Son **rangos fijos y no cuantiles**, decidido el 2026-09-22 con la
 * distribución real delante: 5.155 procesos abiertos en Antioquia y 1 en
 * Vichada, mediana en 643. Los cuantiles reparten mejor el color, pero tienen
 * tres defectos que aquí pesan más:
 *
 * 1. **Parten empates.** Tolima y Quindío tienen 708 los dos y caerían a los
 *    dos lados de una frontera de grupo: el mismo número, dos colores.
 * 2. **Los cortes se mueven con cada ingesta**, así que el mapa de ayer y el de
 *    hoy no se pueden comparar aunque se vean igual.
 * 3. **La leyenda dice "353–708"**, que no significa nada para quien la lee.
 *
 * Estos cortes se leen en cifras redondas y sobreviven a que cambien los datos.
 */

export interface Escalon {
  /** 0 es "sin procesos"; 4 es el más intenso. */
  indice: number;
  min: number;
  /** `null` en el último: no tiene techo. */
  max: number | null;
  etiqueta: string;
}

export const ESCALONES: readonly Escalon[] = [
  { indice: 0, min: 0, max: 0, etiqueta: "Sin procesos" },
  { indice: 1, min: 1, max: 99, etiqueta: "1–99" },
  { indice: 2, min: 100, max: 499, etiqueta: "100–499" },
  { indice: 3, min: 500, max: 1499, etiqueta: "500–1.499" },
  { indice: 4, min: 1500, max: null, etiqueta: "1.500+" },
] as const;

/**
 * El escalón de un conteo. Devuelve siempre uno de los objetos de `ESCALONES`,
 * no una copia: dos departamentos con el mismo número comparten identidad, que
 * es justo lo que el test comprueba.
 */
export function escalonDe(n: number): Escalon {
  if (!Number.isFinite(n) || n <= 0) return ESCALONES[0];
  return ESCALONES.find((e) => e.max === null || n <= e.max) ?? ESCALONES[0];
}
