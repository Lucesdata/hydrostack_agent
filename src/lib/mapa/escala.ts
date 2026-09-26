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

/**
 * Escalones del mapa por **monto en juego**: la suma del presupuesto de los
 * abiertos que lo publican (`montoAbierto` de `detallePorDepartamento`).
 *
 * Mismo criterio que los de procesos: cortes fijos y redondos, no cuantiles,
 * para que el mapa de hoy y el de mañana se comparen. Van por décadas en la
 * escala que se dice en Colombia (mil millones, billón), porque el monto de un
 * departamento puede ser mil veces el de otro y una escala lineal dejaría todo
 * el país en el primer tono. El índice 0 es "sin presupuesto publicado", que no
 * es lo mismo que "sin procesos": se dice así en la leyenda.
 */
export const ESCALONES_MONTO: readonly Escalon[] = [
  { indice: 0, min: 0, max: 0, etiqueta: "Sin presupuesto publicado" },
  { indice: 1, min: 1, max: 1e10 - 1, etiqueta: "< $10 mil M" },
  { indice: 2, min: 1e10, max: 1e11 - 1, etiqueta: "$10–100 mil M" },
  { indice: 3, min: 1e11, max: 1e12 - 1, etiqueta: "$100 mil M–1 billón" },
  { indice: 4, min: 1e12, max: null, etiqueta: "$1 billón o más" },
] as const;

export function escalonMontoDe(monto: number): Escalon {
  if (!Number.isFinite(monto) || monto <= 0) return ESCALONES_MONTO[0];
  return ESCALONES_MONTO.find((e) => e.max === null || monto <= e.max) ?? ESCALONES_MONTO[0];
}
