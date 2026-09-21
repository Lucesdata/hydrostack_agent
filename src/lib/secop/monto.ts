/**
 * El criterio de "¿este monto es un dato?" para todo lo que lee dinero del
 * SECOP. Un solo sitio, fuera de la UI, porque la respuesta no es obvia:
 *
 * **El SECOP no deja los montos en NULL — escribe 0.** Medido sobre la base
 * viva el 2026-09-19: `proceso.valor_estimado` nunca es NULL y es 0 en 9.436 de
 * 90.622 filas (9.163 de ellas con `estado_apertura = 'Abierto'`);
 * `valor_adjudicacion` es 0 en 76.746 filas, que son las no adjudicadas. Así
 * que el `?? ` de JavaScript no sirve para caer al siguiente valor, y comparar
 * el 0 contra un rango de pesos no da "fuera de rango": da una afirmación falsa
 * sobre un proceso del que no se sabe el presupuesto.
 *
 * Vive en `src/lib/secop/` y no en `components/`: lo necesita el veredicto
 * (`verdict.ts`), que es cálculo y decide a quién se le muestra y a quién se le
 * notifica un proceso, no solo cómo se pinta.
 *
 * El criterio es "hay dato", no "no es cero": un negativo tampoco es un precio.
 */

/** Lo que puede llegar como monto: número ya convertido, el string de una
 *  columna `numeric` de Postgres, o nada. */
export type MontoCrudo = string | number | null | undefined;

/**
 * El monto si es un dato real; `null` si no lo es. Un 0, un negativo, un NaN,
 * un infinito o un string no numérico son todos "sin dato".
 *
 * Es deliberadamente estricto con los strings: acepta el `"500000000.00"` que
 * devuelve `numeric::text` y rechaza cualquier otra cosa sin limpiarla. Lo que
 * necesita limpieza de centinelas de la fuente cruda ("No definido" y compañía)
 * ya pasa por `cleanText` antes, en la ingesta.
 */
export function montoConDato(v: MontoCrudo): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** El mismo criterio como predicado, para los sitios que solo preguntan. */
export function tieneMonto(v: MontoCrudo): boolean {
  return montoConDato(v) !== null;
}
