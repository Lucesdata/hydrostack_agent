"use client";

import { useEffect, useState } from "react";
import { VIEWBOX_SELECCION } from "@/src/lib/mapa/viewbox";

/**
 * La escena del mapa del hero (2026-11-11): el país flota y se inclina un poco
 * hacia el puntero, y una baliza late sobre el anclaje del proceso activo.
 *
 * Como `sincronia.js`, no toca el SVG de servidor: la inclinación son dos
 * variables CSS (`--rx`, `--ry`) en la caja que lo envuelve, y la baliza es un
 * elemento HTML encima, colocado con un porcentaje del viewBox. Así lo que se
 * anima sin parar son capas que el navegador compone solo, y el SVG —que lleva
 * el relieve con filtros— no se repinta en cada fotograma.
 */

/** Cuánto se inclina la caja con el puntero en el borde, en unidades de la variable. */
const LIMITE = 1;

/**
 * Inclina `cajaRef` hacia el puntero mientras se mueve sobre `zonaRef`. Solo
 * con puntero fino (un ratón): en táctil no hay «pasar por encima», y con
 * «reducir movimiento» no se engancha.
 */
export function useInclinacion(zonaRef, cajaRef, activo = true) {
  useEffect(() => {
    const zona = zonaRef.current;
    const caja = cajaRef.current;
    if (!activo || !zona || !caja || typeof window === "undefined" || !window.matchMedia) {
      return undefined;
    }
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return undefined;
    let cuadro = 0;
    let destino = [0, 0];
    const pintar = () => {
      cuadro = 0;
      caja.style.setProperty("--rx", destino[0].toFixed(3));
      caja.style.setProperty("--ry", destino[1].toFixed(3));
    };
    const pedir = () => {
      if (!cuadro) cuadro = window.requestAnimationFrame(pintar);
    };
    const alMover = (e) => {
      const r = zona.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const x = ((e.clientX - r.left) / r.width) * 2 - 1;
      const y = ((e.clientY - r.top) / r.height) * 2 - 1;
      destino = [Math.max(-LIMITE, Math.min(LIMITE, x)), Math.max(-LIMITE, Math.min(LIMITE, y))];
      pedir();
    };
    const alSalir = () => {
      destino = [0, 0];
      pedir();
    };
    zona.addEventListener("pointermove", alMover, { passive: true });
    zona.addEventListener("pointerleave", alSalir, { passive: true });
    return () => {
      zona.removeEventListener("pointermove", alMover);
      zona.removeEventListener("pointerleave", alSalir);
      if (cuadro) window.cancelAnimationFrame(cuadro);
      caja.style.removeProperty("--rx");
      caja.style.removeProperty("--ry");
    };
  }, [zonaRef, cajaRef, activo]);
}

/**
 * Dónde cae un punto del viewBox del mapa, en porcentaje de su caja, con el
 * despiece de su pieza (`ex`, `ey`) aparte para que el CSS lo multiplique por
 * el mismo factor que mueve la pieza. Puro: se prueba sin DOM.
 */
export function posicionEnCaja(cx, cy, ex = 0, ey = 0) {
  const { x, y, ancho, alto } = VIEWBOX_SELECCION;
  return {
    x: ((cx - x) / ancho) * 100,
    y: ((cy - y) / alto) * 100,
    ex: (ex / ancho) * 100,
    ey: (ey / alto) * 100,
  };
}

const numeroDe = (texto) => {
  const n = Number.parseFloat(texto ?? "");
  return Number.isFinite(n) ? n : 0;
};

/**
 * La posición de la baliza: el anclaje que `sincronia.js` marcó como activo
 * (`data-activa`). `null` si el mapa no marca ninguno. Se recalcula cuando
 * cambia `clave` (el proceso activo): debe ir **después** de `useActivoEnMapa`
 * en el componente, porque lee lo que ese efecto acaba de escribir.
 */
export function useBaliza(mapaRef, clave) {
  const [baliza, setBaliza] = useState(null);
  useEffect(() => {
    const ancla = mapaRef.current?.querySelector?.("[data-activa]");
    if (!ancla) {
      setBaliza(null);
      return;
    }
    const pieza = ancla.closest(".clr-mapa__pieza");
    const p = posicionEnCaja(
      numeroDe(ancla.getAttribute("cx")),
      numeroDe(ancla.getAttribute("cy")),
      numeroDe(pieza?.style.getPropertyValue("--ex")),
      numeroDe(pieza?.style.getPropertyValue("--ey"))
    );
    setBaliza({ ...p, familia: ancla.getAttribute("data-activa") });
  }, [mapaRef, clave]);
  return baliza;
}
