/**
 * La regla del cero: en SECOP un 0 no es un precio, es un hueco.
 *
 * Medido el 2026-09-19 sobre la base viva: `proceso.valor_estimado = 0` en
 * 9.436 filas, 9.163 de ellas todavía abiertas. No son procesos gratuitos —
 * son procesos cuya entidad no publicó la cuantía, y el dataset guarda 0 donde
 * debería guardar NULL. Pintar "$ 0" afirma un presupuesto que nadie fijó, que
 * es peor que no decir nada: el visitante lo lee como "el presupuesto es cero".
 *
 * Vive en `lib/` y no en `components/secop/format.ts` porque no es formato,
 * es normalización del dato: la aplican por igual los mapeadores de DTO, la
 * plantilla del correo y la UI. Los formateadores de moneda ya saben pintar
 * "—" cuando reciben `null`; esta función es la que decide cuándo hay null.
 *
 * **Dónde NO aplica:** en el diff de una adenda (`antes → después`) el 0 es el
 * dato — "de $ 0 a $2.000" es literalmente lo que cambió en el pliego. Ahí se
 * imprime lo que publicó SECOP, sin pasar por aquí.
 */

/**
 * Cuantía publicada, o `null` si no la hay. Acepta el `number` de la API live
 * y el `numeric::text` de Postgres, que llega como string.
 */
export function montoConDato(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}
