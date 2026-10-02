// De un `ProcesoResumen` (src/lib/secop/recientes.ts), tal como lo sirve
// /api/departamento/[dpto]/resumen, al proceso que pinta la tarjeta del hero.
//
// Es puro y sin "use client": lo importa un componente de cliente y lo prueban
// los tests.
//
// Hasta el 2026-10-02 aquí vivía `mapApiItem`, que pintaba las filas de los
// destacados con su semáforo y caía al listado si el proceso no traía ficha.
// La tarjeta del hero (spec 2026-10-02-hero-mapa-ficha §7.4) no puede caer a
// nada: su botón se llama «Ver ficha», y un enlace al listado con ese nombre
// sería una promesa falsa. Su estado previo está en git.

import { idDesdeSlug } from "@/src/lib/secop/slug";
import { frase, titulo } from "./texto";

export const SIN_OBJETO = "Proceso sin objeto publicado";

/** `/licitaciones/<slug>`, sin esquema, sin `//`, sin otra ruta debajo. */
const RUTA_FICHA = /^\/licitaciones\/[A-Za-z0-9.-]+$/;

const texto = (v) => (typeof v === "string" && v.trim() ? v : null);

/**
 * El proceso de la tarjeta, o `null` si no se puede enlazar a su ficha.
 *
 * La ruta tiene que ser la de una ficha y llevar el mismo id que el proceso:
 * nada de URLs externas, `javascript:`, rutas de cuenta ni la faceta del
 * departamento. Sin objeto se dice que no lo hay; no se pone la entidad en su
 * lugar, que se leería como lo que se contrata.
 */
export function destacadoDeApi(p) {
  if (!p || typeof p !== "object") return null;
  const id = texto(p.id);
  const ficha = texto(p.ficha);
  if (!id || !ficha || !RUTA_FICHA.test(ficha)) return null;
  if (idDesdeSlug(ficha.slice("/licitaciones/".length)) !== id.toUpperCase()) return null;
  return {
    id,
    href: ficha,
    objeto: frase(texto(p.objeto)) || SIN_OBJETO,
    // Solo para el nombre accesible del botón: distingue dos objetos iguales.
    entidad: titulo(texto(p.entidad)) || null,
  };
}

/**
 * Los cinco destinos de un mismo proceso: el botón de la tarjeta y los cuatro
 * accesos de la franja. Salen de aquí juntos para que no puedan apuntar a
 * fichas distintas. Los anclajes son los de `ExploradorFicha.tsx`.
 */
export function enlacesDeFicha(href) {
  if (!href) return null;
  return {
    ficha: href,
    resumen: `${href}#ficha-resumen`,
    dinero: `${href}#ficha-dinero`,
    plazos: `${href}#ficha-plazos`,
    pliego: `${href}#pliego`,
  };
}
