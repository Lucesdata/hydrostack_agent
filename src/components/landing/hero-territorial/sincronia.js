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
  tipoFiltro = null,
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
    // Con el mapa filtrado por tipo, cuántos de sus abiertos son de ese tipo.
    ...(tipoFiltro ? { nTipo: fila?.tipos?.[tipoFiltro] ?? 0 } : {}),
    principal: principal
      ? { ...principal, label: tipos[principal.clave] ?? principal.clave }
      : null,
  };
}

/**
 * El escalón de color de cada departamento según el modo del mapa. `null` en
 * "procesos": es lo que ya pinta el servidor y no hay nada que cambiar.
 *
 * - "monto": escalón del monto en juego (sin presupuesto publicado → 0).
 * - "tipo": escalón de los abiertos de ese tipo, con la escala de procesos.
 *
 * Puro, para probarlo. Las escalas llegan por parámetro para que este archivo
 * no dependa de ellas.
 */
export function indicesDeModo({ modo, tipo, departamentos, escalonDe, escalonMontoDe }) {
  if (modo === "monto") {
    return new Map(departamentos.map((d) => [d.clave, escalonMontoDe(d.montoAbierto ?? 0).indice]));
  }
  if (modo === "tipo" && tipo) {
    return new Map(departamentos.map((d) => [d.clave, escalonDe(d.tipos?.[tipo] ?? 0).indice]));
  }
  return null;
}

const ESCALON = /clr-mapa__dpto--e\d/;

/**
 * Pinta el mapa con los escalones dados cambiando la clase `clr-mapa__dpto--eN`
 * de cada camino, no con un color en línea: así el CSS del mapa —incluido el
 * rayado de "sin procesos"— se aplica igual en todos los modos. La clase del
 * servidor se guarda en `data-e-orig` y se restaura con `indices === null`.
 * Los departamentos que no están en `indices` (sin procesos abiertos) van a 0.
 */
export function usePinturaEnMapa(contenedorRef, modo, indices) {
  useEffect(() => {
    const raiz = contenedorRef.current;
    if (!raiz) return;
    for (const camino of raiz.querySelectorAll("[data-dpto]")) {
      const actual = camino.getAttribute("class") ?? "";
      if (camino.dataset.eOrig == null) camino.dataset.eOrig = actual.match(ESCALON)?.[0] ?? "";
      const destino = indices
        ? `clr-mapa__dpto--e${indices.get(camino.getAttribute("data-dpto")) ?? 0}`
        : camino.dataset.eOrig;
      camino.setAttribute("class", actual.replace(ESCALON, destino).trim());
    }
    raiz.setAttribute("data-metrica", modo);
  }, [contenedorRef, modo, indices]);
}
