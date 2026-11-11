"use client";

import { useEffect, useRef } from "react";
import { PESTANA } from "@/src/lib/landing/destacados-portada";
import styles from "./hero-v3.module.css";

/**
 * Las tres familias como tarjetas junto al mapa. Son las **pestañas** del hero
 * (patrón ARIA de pestañas con activación automática): elegir una cambia la
 * capa del mapa y la ficha de la franja.
 *
 * Todo lo que pinta es dato real de `conteosPorFamilia()`: la cifra son los
 * procesos de la familia publicados en 2026 y el medidor, cuántos de ellos
 * reciben ofertas hoy. Sin conteos la tarjeta se queda con el nombre: nunca un
 * número inventado. La cifra «cuenta» al aparecer (un adorno: el HTML del
 * servidor ya trae el número final) y la tarjeta elegida lleva la barra del
 * recorrido, que dice cuánto falta para pasar a la siguiente.
 */

const ICONOS = {
  potable: <path d="M12 3.5s-6 6.6-6 11a6 6 0 0 0 12 0c0-4.4-6-11-6-11z" />,
  residual: (
    <>
      <path d="M3 9c2.5-2 4.5-2 7 0s4.5 2 7 0 2.5-1.5 4-1.5M3 14c2.5-2 4.5-2 7 0s4.5 2 7 0 2.5-1.5 4-1.5M3 19c2.5-2 4.5-2 7 0s4.5 2 7 0 2.5-1.5 4-1.5" />
    </>
  ),
  redes: (
    <>
      <circle cx="12" cy="12" r="2.2" />
      <circle cx="5" cy="5.5" r="1.8" />
      <circle cx="19" cy="5.5" r="1.8" />
      <circle cx="5" cy="18.5" r="1.8" />
      <circle cx="19" cy="18.5" r="1.8" />
      <path d="m6.5 6.8 4 3.4M17.5 6.8l-4 3.4M6.5 17.2l4-3.4M17.5 17.2l-4-3.4" />
    </>
  ),
};

const numero = new Intl.NumberFormat("es-CO");

function sumaDe(conteos, familia, campo) {
  if (!conteos) return null;
  return conteos.reduce((s, c) => s + c[familia][campo], 0);
}

/** Cuánto dura la cuenta de una cifra al aparecer. */
const DURACION_CUENTA = 900;
/**
 * Pasado este tiempo desde que se pidió la página, la cifra ya se leyó tal como
 * la mandó el servidor: contar desde cero sería verla saltar hacia atrás.
 */
const TOPE_CUENTA = 2500;

/**
 * La cifra de la tarjeta. El servidor pinta el número final; en el navegador,
 * si la página acaba de cargar y no se pidió reducir el movimiento, cuenta de
 * cero a ese número una vez. Escribe en el nodo, no en el estado: no vuelve a
 * renderizar el hero en cada fotograma.
 */
function Cifra({ valor }) {
  const ref = useRef(null);
  useEffect(() => {
    const nodo = ref.current;
    if (!nodo || valor < 2 || typeof window === "undefined") return undefined;
    if (!window.requestAnimationFrame || !window.matchMedia) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    if (performance.now() > TOPE_CUENTA) return undefined;
    let cuadro = 0;
    let inicio = 0;
    const paso = (t) => {
      if (!inicio) inicio = t;
      const p = Math.min(1, (t - inicio) / DURACION_CUENTA);
      // Sale rápido y frena al llegar.
      const suave = 1 - (1 - p) ** 3;
      nodo.textContent = numero.format(Math.round(valor * suave));
      if (p < 1) cuadro = window.requestAnimationFrame(paso);
    };
    cuadro = window.requestAnimationFrame(paso);
    return () => {
      window.cancelAnimationFrame(cuadro);
      nodo.textContent = numero.format(valor);
    };
  }, [valor]);
  return <strong ref={ref}>{numero.format(valor)}</strong>;
}

/**
 * @param {{
 *   lista: import("@/src/lib/landing/destacados-portada").DestacadoPortada[],
 *   activa: string | null,
 *   conteos: import("@/src/lib/landing/conteos-familia").ConteoDepartamento[] | null,
 *   onElegir: (familia: string) => void,
 *   onTeclear: (e: import("react").KeyboardEvent) => void,
 *   recorrido?: boolean,
 * }} props — `recorrido` es `true` mientras el recorrido avanza solo: la
 * tarjeta elegida pinta entonces su barra de tiempo.
 */
export default function FamiliaCards({
  lista,
  activa,
  conteos,
  onElegir,
  onTeclear,
  recorrido = false,
}) {
  return (
    <div role="tablist" aria-label="Tipo de obra" className={styles.tarjetas} onKeyDown={onTeclear}>
      {lista.map((d) => {
        const elegida = d.familia === activa;
        const total = sumaDe(conteos, d.familia, "n");
        const abiertos = sumaDe(conteos, d.familia, "abiertos");
        // La parte de la barra que recibe ofertas; con alguno, nunca invisible.
        const parte = total ? Math.max(abiertos / total, abiertos > 0 ? 0.04 : 0) : 0;
        return (
          <button
            key={d.familia}
            id={`aq-pestana-${d.familia}`}
            type="button"
            role="tab"
            className={styles.tarjeta}
            data-familia={d.familia}
            aria-selected={elegida}
            aria-controls="aq-panel-destacado"
            tabIndex={elegida ? 0 : -1}
            onClick={() => onElegir(d.familia)}
          >
            <span className={styles.tarjetaIcono} aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                focusable="false"
              >
                {ICONOS[d.familia]}
              </svg>
            </span>
            <span className={styles.tarjetaTexto}>
              <span className={styles.tarjetaNombre}>
                {d.familia === "redes" ? "Redes y alcantarillado" : PESTANA[d.familia]}
              </span>
              {total != null ? (
                <span className={styles.tarjetaCifra}>
                  <Cifra valor={total} /> {total === 1 ? "proceso" : "procesos"} en 2026
                </span>
              ) : null}
            </span>
            {total != null ? (
              <span className={styles.tarjetaMedidor}>
                <span
                  className={styles.tarjetaBarra}
                  style={{ "--parte": parte.toFixed(3) }}
                  aria-hidden="true"
                />
                <span className={styles.tarjetaAbiertos}>
                  {abiertos === 0
                    ? "Ninguno recibe ofertas hoy"
                    : `${numero.format(abiertos)} ${abiertos === 1 ? "recibe" : "reciben"} ofertas hoy`}
                </span>
              </span>
            ) : null}
            {/* La barra del recorrido: nace con cada turno y dura lo que él. */}
            {elegida && recorrido ? (
              <span className={styles.tarjetaTurno} aria-hidden="true" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
