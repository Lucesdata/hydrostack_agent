"use client";

import { PESTANA } from "@/src/lib/landing/destacados-portada";
import { textoConteo } from "@/src/lib/landing/conteos-familia";
import styles from "./hero-v3.module.css";

/**
 * Las tres familias como tarjetas a la derecha del mapa. Son las **pestañas** del
 * hero (patrón ARIA de pestañas con activación automática): elegir una cambia
 * la capa del mapa y la ficha de la franja. La cifra es la real —procesos de la
 * familia publicados en 2026, sumados de los conteos del servidor— y sin
 * conteos la tarjeta se queda con el nombre: nunca un número inventado.
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

function totalDe(conteos, familia) {
  if (!conteos) return null;
  return conteos.reduce((s, c) => s + c[familia].n, 0);
}

export default function FamiliaCards({ lista, activa, conteos, onElegir, onTeclear }) {
  return (
    <div role="tablist" aria-label="Tipo de obra" className={styles.tarjetas} onKeyDown={onTeclear}>
      {lista.map((d) => {
        const elegida = d.familia === activa;
        const total = totalDe(conteos, d.familia);
        const abiertos = conteos ? conteos.reduce((s, c) => s + c[d.familia].abiertos, 0) : null;
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
            title={conteos ? textoConteo({ n: total, abiertos }) : undefined}
          >
            <svg
              viewBox="0 0 24 24"
              width="26"
              height="26"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              {ICONOS[d.familia]}
            </svg>
            <span className={styles.tarjetaTexto}>
              <span className={styles.tarjetaNombre}>
                {d.familia === "redes" ? "Redes y alcantarillado" : PESTANA[d.familia]}
              </span>
              {total != null ? (
                <span className={styles.tarjetaCifra}>
                  <strong>{numero.format(total)}</strong> procesos
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
