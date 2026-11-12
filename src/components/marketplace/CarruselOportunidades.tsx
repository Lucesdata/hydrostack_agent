"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import s from "./marketplace.module.css";

/**
 * Carrusel **manual** (sin autoplay, WCAG 2.2.2): una lista con desplazamiento
 * nativo y *snap*, y botones Anterior/Siguiente que solo aparecen si hay
 * desbordamiento. Con teclado, la región se enfoca y las flechas desplazan.
 * Los botones se deshabilitan en los extremos y lo dicen (`disabled`).
 */
export default function CarruselOportunidades({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: ReactNode;
}) {
  const pista = useRef<HTMLUListElement>(null);
  const [estado, setEstado] = useState({ desborda: false, inicio: true, fin: true });

  const medir = useCallback(() => {
    const el = pista.current;
    if (!el) return;
    const desborda = el.scrollWidth - el.clientWidth > 2;
    setEstado({
      desborda,
      inicio: el.scrollLeft <= 2,
      fin: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
    });
  }, []);

  useEffect(() => {
    const el = pista.current;
    if (!el) return undefined;
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [medir]);

  const mover = (dir: 1 | -1) => {
    const el = pista.current;
    if (!el) return;
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: quieto ? "auto" : "smooth" });
  };

  return (
    <div className={s.carrusel}>
      <ul ref={pista} className={s.pista} aria-label={etiqueta} onScroll={medir} tabIndex={0}>
        {children}
      </ul>
      {estado.desborda ? (
        <div className={s.botonesCarrusel}>
          <button
            type="button"
            onClick={() => mover(-1)}
            disabled={estado.inicio}
            aria-label="Oportunidades anteriores"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
              <path
                d="m14.5 6-6 6 6 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => mover(1)}
            disabled={estado.fin}
            aria-label="Oportunidades siguientes"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
              <path
                d="m9.5 6 6 6-6 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}
