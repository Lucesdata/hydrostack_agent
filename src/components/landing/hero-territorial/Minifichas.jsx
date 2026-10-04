"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { COLOR_TIPO } from "@/src/lib/classify/tipo-color";
import {
  estadoVisible,
  familiaDe,
  presupuestoLargo,
  ubicacionDe,
} from "@/src/lib/landing/proceso-portada";
import { frase, titulo } from "@/src/components/landing/texto";

/**
 * Las minifichas del hero: hasta cinco procesos reales, en una lista (spec
 * 2026-10-04-hero-cinco-minifichas §6). Son la alternativa textual completa al
 * mapa: todo lo que dice una etiqueta del mapa está aquí, y más.
 *
 * Cada tarjeta tiene **un** enlace, «Ver ficha →», que se estira sobre la
 * tarjeta entera con un pseudoelemento: toda la tarjeta se puede pulsar sin
 * enlaces anidados, y el lector de pantalla oye un solo destino por proceso.
 */

const ETIQUETA_SIN_TIPO = "Sin subsistema identificado";

export function categoriaDe(tipo) {
  return tipo ? COLOR_TIPO[tipo].familiaLabel : ETIQUETA_SIN_TIPO;
}

function IconoLugar() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path
        d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="10" r="2.3" fill="currentColor" />
    </svg>
  );
}

function IconoEntidad() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path
        d="M3 9.5 12 4l9 5.5M5 10v8M9.7 10v8M14.3 10v8M19 10v8M3.5 20.5h17"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Minificha({ proceso: p, activo = false, onActivar = () => {} }) {
  const familia = familiaDe(p.tipoProyecto);
  const objeto = frase(p.objeto);
  const entidad = titulo(p.entidad) || "Entidad no disponible";
  return (
    <li
      className="aqMini"
      data-proceso={p.id}
      data-familia={familia}
      data-activo={activo ? "" : undefined}
      onPointerEnter={() => onActivar(p.id)}
      onPointerLeave={() => onActivar(null)}
      onFocus={() => onActivar(p.id)}
      onBlur={() => onActivar(null)}
    >
      <article aria-labelledby={`aq-mini-${p.id}`}>
        <span className="aqMiniCategoria">
          <span className="aqMiniPunto" aria-hidden="true" />
          {categoriaDe(p.tipoProyecto)}
        </span>
        <p className="aqMiniLugar">
          <IconoLugar />
          <span>{ubicacionDe(p)}</span>
        </p>
        <h2 id={`aq-mini-${p.id}`} className="aqMiniObjeto" title={objeto}>
          {objeto}
        </h2>
        {p.contextoTipo ? <p className="aqMiniNumero">{p.contextoTipo}</p> : null}
        <p className="aqMiniNumero">
          Proceso: <span translate="no">{p.numeroProceso}</span>
        </p>
        <p className="aqMiniEntidad" title={entidad}>
          <IconoEntidad />
          <span>{entidad}</span>
        </p>
        <p className={`aqMiniValor${p.presupuesto == null ? " aqMiniValor--sin" : ""}`}>
          {presupuestoLargo(p.presupuesto)}
        </p>
        <div className="aqMiniPie">
          <span className={`aqMiniEstado${p.abierto ? " aqMiniEstado--abierto" : ""}`}>
            <span aria-hidden="true" />
            {estadoVisible(p)}
          </span>
          <Link
            className="aqMiniVer"
            href={p.href}
            aria-label={`Ver ficha del proceso ${p.numeroProceso}: ${objeto}`}
          >
            Ver ficha <span aria-hidden="true">→</span>
          </Link>
        </div>
      </article>
    </li>
  );
}

/**
 * En pantallas táctiles no hay puntero que señale: la tarjeta que queda a la
 * vista en la fila desplazable es la activa, y el mapa la marca. Solo cuando la
 * fila de verdad se desplaza; nunca mueve la página.
 */
function useActivarAlDesplazar(listaRef, onActivar) {
  useEffect(() => {
    const lista = listaRef.current;
    if (!lista || typeof IntersectionObserver === "undefined" || !window.matchMedia) return;
    if (!window.matchMedia("(hover: none)").matches) return;
    const visibles = new Map();
    const obs = new IntersectionObserver(
      (entradas) => {
        if (lista.scrollWidth <= lista.clientWidth + 1) return;
        for (const e of entradas)
          visibles.set(e.target.getAttribute("data-proceso"), e.intersectionRatio);
        let mejor = null;
        let ratio = 0.6;
        for (const [id, r] of visibles) {
          if (r >= ratio) {
            mejor = id;
            ratio = r;
          }
        }
        if (mejor) onActivar(mejor);
      },
      { root: lista, threshold: [0, 0.6, 0.9, 1] }
    );
    for (const li of lista.querySelectorAll("[data-proceso]")) obs.observe(li);
    return () => obs.disconnect();
  }, [listaRef, onActivar]);
}

export default function Minifichas({ procesos, activo = null, onActivar = () => {} }) {
  const listaRef = useRef(null);
  useActivarAlDesplazar(listaRef, onActivar);
  return (
    <ul
      ref={listaRef}
      className="aqMinifichas"
      data-n={procesos.length}
      // Sin título visible: el nombre de la lista va en aria-label.
      aria-label="Procesos para explorar"
    >
      {procesos.map((p) => (
        <Minificha key={p.id} proceso={p} activo={activo === p.id} onActivar={onActivar} />
      ))}
    </ul>
  );
}
