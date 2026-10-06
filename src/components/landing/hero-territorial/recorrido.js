"use client";

import { useEffect, useRef, useState } from "react";

/**
 * El recorrido del hero (2026-10-04, opción D): resalta por turnos cada uno de
 * los procesos visibles —tarjeta, etiqueta, anclaje y departamento—, para que
 * el mapa se lea vivo sin que cambie el contenido.
 *
 * Reglas, por accesibilidad (WCAG 2.2.2) y por la portada aligerada del
 * 2026-09-27:
 * - un paso cada `INTERVALO_RECORRIDO` ms, tiempo para leer la etiqueta;
 * - se detiene mientras el usuario señala o enfoca algo del hero, y con el
 *   botón «Pausar recorrido»;
 * - no arranca si el sistema pide reducir el movimiento;
 * - no avanza con la pestaña oculta;
 * - nunca desplaza la página ni cambia la selección.
 */

export const INTERVALO_RECORRIDO = 5000;

/** El índice siguiente del recorrido, dando la vuelta. */
export function siguienteIndice(actual, total) {
  if (total <= 0) return -1;
  return (actual + 1) % total;
}

/**
 * El índice a `paso` posiciones de `actual`, dando la vuelta en los dos
 * sentidos: las flechas de la ficha (← −1, → +1) son circulares.
 */
export function indiceRelativo(actual, paso, total) {
  if (total <= 0) return -1;
  return (((actual + paso) % total) + total) % total;
}

/** `true` si el sistema pide reducir el movimiento. Falso en el servidor. */
export function usePrefiereMenosMovimiento() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const leer = () => setReduce(mq.matches);
    leer();
    mq.addEventListener?.("change", leer);
    return () => mq.removeEventListener?.("change", leer);
  }, []);
  return reduce;
}

/**
 * Mueve `onActivar` por los `ids` mientras `activo` sea verdadero, desde el
 * proceso que está a la vista (`actual`): si el usuario avanzó con las
 * flechas, el recorrido sigue desde ahí y no desde donde lo dejó él.
 */
export function useRecorrido(ids, onActivar, activo, actual = null) {
  const actualRef = useRef(actual);
  actualRef.current = actual;
  const clave = ids.join(" ");
  useEffect(() => {
    if (!activo || ids.length < 2) return undefined;
    const t = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      onActivar(ids[siguienteIndice(ids.indexOf(actualRef.current), ids.length)]);
    }, INTERVALO_RECORRIDO);
    return () => clearInterval(t);
    // `clave` resume `ids`: una lista nueva con los mismos ids no reinicia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, onActivar, activo]);
}
