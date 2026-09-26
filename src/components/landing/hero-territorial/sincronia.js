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

/**
 * Lo que dice el tooltip del mapa sobre un departamento: nombre, procesos
 * abiertos, % nacional y subsistema más frecuente. Puro, para probarlo.
 *
 * El "más frecuente" deja fuera `otros`: `otros` es "sin subsistema
 * identificado", no un subsistema, y ganaría en casi todos (es el 35 %).
 * Si ninguno clasificado tiene procesos, no se nombra ninguno.
 */
export function contenidoTooltip({
  dpto,
  nombre = null,
  departamentos = [],
  totalAbiertos = null,
  tipos = {},
}) {
  const fila = departamentos.find((d) => d.clave === dpto) ?? null;
  const n = fila?.n ?? 0;
  const pct = totalAbiertos > 0 && n > 0 ? (100 * n) / totalAbiertos : null;
  let principal = null;
  if (fila?.tipos) {
    for (const [clave, cuenta] of Object.entries(fila.tipos)) {
      if (clave === "otros" || cuenta <= 0) continue;
      if (!principal || cuenta > principal.n) principal = { clave, n: cuenta };
    }
  }
  return {
    nombre: fila?.label ?? nombre ?? null,
    n,
    pct,
    monto: fila?.montoAbierto ?? 0,
    principal: principal
      ? { ...principal, label: tipos[principal.clave] ?? principal.clave }
      : null,
  };
}

/**
 * Recolorea el mapa según la métrica elegida. El SVG de servidor trae el color
 * por procesos en su clase (`clr-mapa__dpto--eN`); con "monto", cada camino
 * recibe el escalón de su monto en un `style.fill` que gana a la clase, y al
 * volver a "procesos" se quita. `escalonMonto` llega por parámetro para que
 * este archivo no dependa de la escala.
 */
export function useMetricaEnMapa(contenedorRef, metrica, departamentos, escalonMonto) {
  useEffect(() => {
    const raiz = contenedorRef.current;
    if (!raiz) return;
    const monto = new Map(departamentos.map((d) => [d.clave, d.montoAbierto ?? 0]));
    for (const camino of raiz.querySelectorAll("[data-dpto]")) {
      if (metrica === "monto") {
        const i = escalonMonto(monto.get(camino.getAttribute("data-dpto")) ?? 0).indice;
        camino.style.fill = `var(--mapa-e${i})`;
      } else {
        camino.style.removeProperty("fill");
      }
    }
    raiz.setAttribute("data-metrica", metrica);
  }, [contenedorRef, metrica, departamentos, escalonMonto]);
}
