// Los accesos de la franja de la ficha a un proceso del hero.
//
// Es puro y sin "use client": lo importa un componente de cliente y lo prueban
// los tests.
//
// Hasta el 2026-10-04 aquí vivía también `destacadoDeApi`, que validaba el
// destacado de /api/departamento/[dpto]/resumen para la tarjeta única del hero.
// El hero ya no pide ese resumen: sus procesos llegan del servidor con la ruta
// de la ficha ya construida (src/lib/landing/proceso-portada.ts). Su estado
// previo está en git.

/**
 * Los cinco destinos de un mismo proceso: su ficha y los cuatro accesos de
 * la franja. Salen de aquí juntos para que no puedan apuntar a
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
