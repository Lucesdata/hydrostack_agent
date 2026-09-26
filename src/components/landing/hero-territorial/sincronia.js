"use client";

import { useEffect } from "react";

/**
 * Sincronía mapa ↔ lista ↔ ficha del hero.
 *
 * El mapa es SVG de servidor y no lleva JS: cada departamento trae su código en
 * `data-dpto`. El hero escucha por delegación sobre el contenedor y marca con
 * clases los caminos que toca resaltar. El clic del mapa sigue navegando a la
 * faceta (decisión D del 2026-09-21); esto solo añade el resaltado.
 */

/** Código DIVIPOLA del departamento bajo el puntero o el foco, o `null`. */
export function dptoDesdeObjetivo(objetivo) {
  const el = objetivo?.closest?.("[data-dpto]");
  if (el) return el.getAttribute("data-dpto");
  // El foco de teclado cae en el <a> que envuelve al camino, no en el camino.
  // Solo en el <a>: sobre el hueco entre departamentos el objetivo es el
  // <svg>, y buscar dentro devolvería el primer departamento del mapa.
  if (objetivo?.matches?.("a.clr-mapa__link")) {
    const hijo = objetivo.querySelector("[data-dpto]");
    return hijo ? hijo.getAttribute("data-dpto") : null;
  }
  return null;
}

/** Aplica `is-resaltado` y `is-seleccionado` a los caminos del mapa. */
export function useMarcasEnMapa(contenedorRef, resaltado, seleccionado) {
  useEffect(() => {
    const raiz = contenedorRef.current;
    if (!raiz) return;
    for (const camino of raiz.querySelectorAll("[data-dpto]")) {
      const codigo = camino.getAttribute("data-dpto");
      camino.classList.toggle("is-resaltado", codigo === resaltado);
      camino.classList.toggle("is-seleccionado", codigo === seleccionado);
    }
    raiz.toggleAttribute("data-resaltando", resaltado != null);
  }, [contenedorRef, resaltado, seleccionado]);
}
