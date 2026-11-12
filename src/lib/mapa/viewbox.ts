/**
 * Las medidas del lienzo del mapa y el `viewBox` del hero, **sin importar
 * geometría**. Viven aparte porque el navegador las necesita (`escena.js` coloca
 * la baliza con ellas) y `modelo.ts` y `etiquetas-procesos.ts` cargan los
 * GeoJSON de los departamentos y de las islas: importarlos desde un módulo de
 * cliente metió ~14 kB gzip en el JS de primera carga de la portada y rompió su
 * presupuesto (scripts/presupuesto-portada.mjs, 2026-11-12). Un módulo de
 * cliente importa de aquí; los de servidor pueden seguir importando de donde
 * siempre, que reexportan estos mismos valores.
 */
export const ANCHO_MAPA = 420;
export const ALTO_MAPA = 520;

/** El `viewBox` del mapa del hero: el país con un margen mínimo. */
export const VIEWBOX_SELECCION = { x: -8, y: 0, ancho: ANCHO_MAPA + 16, alto: ALTO_MAPA } as const;
