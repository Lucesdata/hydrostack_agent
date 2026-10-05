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

/**
 * La categoría en la pastilla de la tarjeta. Igual que `categoriaDe` salvo la
 * neutra, que se acorta: «Sin subsistema identificado» no cabía junto al estado
 * en ≈225 px, pasaba a dos filas y estiraba las cinco tarjetas de 236 a 257 px
 * (2026-10-05, decisión del usuario). La leyenda y la línea del mapa conservan
 * el texto completo, que también va en el `title` de la pastilla.
 */
export function pastillaDe(tipo) {
  const categoria = categoriaDe(tipo);
  return categoria === ETIQUETA_SIN_TIPO ? "Sin subsistema" : categoria;
}

function IconoLugar() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
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

function IconoDinero() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M14.8 9.2c-.5-.9-1.6-1.4-2.8-1.4-1.6 0-2.8.8-2.8 2s1.1 1.7 2.8 2.1 2.9.9 2.9 2.1-1.3 2-2.9 2c-1.3 0-2.4-.5-2.9-1.4M12 6.2v1.6M12 16.6v1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * El icono de la familia, en el círculo de la cabecera. Decorativo: el nombre
 * de la familia va escrito en la pastilla (tipo-color.ts, regla 1).
 */
const TRAZO_FAMILIA = {
  potable: <path d="M12 3.5s-6 6.6-6 11a6 6 0 0 0 12 0c0-4.4-6-11-6-11z" />,
  residual: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4.5v4.5M12 15v4.5M4.5 12H9M15 12h4.5" />
    </>
  ),
  redes: <path d="M3 9h11a4 4 0 0 1 4 4v8M3 15h8a1 1 0 0 1 1 1v5" />,
  otros: (
    <>
      <circle cx="6" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="18" cy="12" r="1.2" />
    </>
  ),
};

function IconoFamilia({ familia }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {TRAZO_FAMILIA[familia] ?? TRAZO_FAMILIA.otros}
    </svg>
  );
}

/**
 * Estructura (2026-10-04, opción B del usuario): cabecera con el icono de la
 * familia, objeto y entidad; pastillas de estado y categoría; un panel con
 * lugar y presupuesto; y un pie con el número de proceso y «Ver ficha →».
 */
export function Minificha({ proceso: p, activo = false, onActivar = () => {} }) {
  const familia = familiaDe(p.tipoProyecto);
  const objeto = frase(p.objeto);
  const entidad = titulo(p.entidad) || "Entidad no disponible";
  const estado = estadoVisible(p);
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
        <div className="aqMiniCab">
          <span className="aqMiniAvatar" aria-hidden="true">
            <IconoFamilia familia={familia} />
          </span>
          <div className="aqMiniTitulos">
            <h2 id={`aq-mini-${p.id}`} className="aqMiniObjeto" title={objeto}>
              {objeto}
            </h2>
            <p className="aqMiniEntidad" title={entidad}>
              {entidad}
            </p>
          </div>
        </div>
        <div className="aqMiniPastillas">
          <span
            className={`aqMiniEstado${p.abierto ? " aqMiniEstado--abierto" : ""}`}
            title={estado}
          >
            <span className="aqMiniPuntoEstado" aria-hidden="true" />
            <span className="aqMiniEstadoTexto">{estado}</span>
          </span>
          <span className="aqMiniCategoria" title={categoriaDe(p.tipoProyecto)}>
            {pastillaDe(p.tipoProyecto)}
          </span>
        </div>
        <div className="aqMiniPanel">
          <p className="aqMiniLugar">
            <IconoLugar />
            <span>{ubicacionDe(p)}</span>
          </p>
          <p className={`aqMiniValor${p.presupuesto == null ? " aqMiniValor--sin" : ""}`}>
            <IconoDinero />
            <span>{presupuestoLargo(p.presupuesto)}</span>
          </p>
          {p.contextoTipo ? <p className="aqMiniContexto">{p.contextoTipo}</p> : null}
        </div>
        <div className="aqMiniPie">
          {/* «Proceso:» se oye pero no se ve: en 250 px de tarjeta no caben
              el rótulo, el número entero y el botón. */}
          <p className="aqMiniNumero">
            <span className="sr-only">Proceso: </span>
            <span translate="no">{p.numeroProceso}</span>
          </p>
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
