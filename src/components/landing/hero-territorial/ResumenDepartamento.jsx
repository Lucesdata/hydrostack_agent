"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { destacadoDeApi } from "@/src/components/landing/proceso-resumen";

/**
 * El proceso destacado del departamento elegido: la tarjeta del hero y, por
 * `PortadaCliente`, los cuatro accesos de la franja de abajo (spec
 * 2026-10-02-hero-mapa-ficha §7.4, §8 y §9).
 *
 * Sale de /api/departamento/[dpto]/resumen, que sirve tres procesos abiertos
 * ordenados por presupuesto. Se pinta solo el primero: es una muestra en ese
 * orden, no una recomendación. Se pide al elegir un departamento —nunca al
 * pasar el puntero— y una sola vez por departamento y visita.
 *
 * Hasta el 2026-10-02 pintaba dos filas con el semáforo absoluto y el gancho
 * «Crea tu perfil». La referencia aprobada lleva una tarjeta sin semáforo: el
 * semáforo sigue en la ficha, en «Quiero participar».
 */

/**
 * Estados de una respuesta. `empty` y `invalido` son respuestas válidas (no
 * hay destacado, o el primero no se puede enlazar) y se guardan; `error` no,
 * para que reintentar vuelva a pedir.
 *
 * @returns {{ status: "live", destacado: object } | { status: "empty" | "invalido" | "error", destacado: null }}
 */
export function estadoDesdeRespuesta(d) {
  if (!d || typeof d !== "object" || !Array.isArray(d.destacados)) {
    return { status: "error", destacado: null };
  }
  if (d.destacados.length === 0) return { status: "empty", destacado: null };
  const destacado = destacadoDeApi(d.destacados[0]);
  return destacado ? { status: "live", destacado } : { status: "invalido", destacado: null };
}

const cache = new Map();
const CARGANDO = { status: "loading", destacado: null };

/**
 * El estado del destacado de `clave`. Cada resultado lleva la clave que lo
 * pidió y se devuelve `loading` para cualquier otra: una respuesta tardía de A
 * nunca se pinta con B elegido. Al cambiar de clave la petición anterior se
 * aborta.
 */
export function useResumenDepartamento(clave) {
  const [estado, setEstado] = useState({ clave: null, ...CARGANDO });
  const [intento, setIntento] = useState(0);
  const enVuelo = useRef(false);

  useEffect(() => {
    if (!clave) return undefined;
    if (cache.has(clave)) {
      setEstado({ clave, ...cache.get(clave) });
      return undefined;
    }
    const ctrl = new AbortController();
    enVuelo.current = true;
    setEstado({ clave, ...CARGANDO });
    fetch(`/api/departamento/${clave}/resumen`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        if (ctrl.signal.aborted) return;
        const resultado = estadoDesdeRespuesta(d);
        if (resultado.status !== "error") cache.set(clave, resultado);
        setEstado({ clave, ...resultado });
      })
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        // Sin volcar la respuesta: basta con saber qué departamento y por qué.
        console.warn(`[resumen ${clave}]`, e instanceof Error ? e.message : "respuesta inválida");
        setEstado({ clave, status: "error", destacado: null });
      })
      .finally(() => {
        if (!ctrl.signal.aborted) enVuelo.current = false;
      });
    return () => {
      ctrl.abort();
      enVuelo.current = false;
    };
  }, [clave, intento]);

  const reintentar = useCallback(() => {
    if (enVuelo.current) return;
    setIntento((i) => i + 1);
  }, []);

  const actual = estado.clave === clave ? estado : { clave, ...CARGANDO };
  return { ...actual, reintentar };
}

/**
 * La tarjeta según el estado del destacado. Sin red: se prueba con estados
 * fijos.
 */
export default function TarjetaProceso({ estado }) {
  const { status, destacado, reintentar } = estado;

  if (status === "live") {
    const nombre = destacado.entidad
      ? `Ver ficha: ${destacado.objeto}, de ${destacado.entidad}`
      : `Ver ficha: ${destacado.objeto}`;
    return (
      <article className="aqTarjeta" aria-labelledby="aq-tarjeta-objeto">
        <span className="aqChip">PROCESO SECOP II</span>
        <div className="aqTarjetaCuerpo">
          <div className="aqTarjetaTexto">
            <h3 id="aq-tarjeta-objeto" className="aqTarjetaObjeto" title={destacado.objeto}>
              {destacado.objeto}
            </h3>
            <p className="aqTarjetaTemas">Objeto · Presupuesto · Plazos · Requisitos</p>
          </div>
          <Link className="aqVerFicha" href={destacado.href} aria-label={nombre}>
            Ver ficha <span aria-hidden="true">→</span>
          </Link>
        </div>
      </article>
    );
  }

  if (status === "error") {
    return (
      <div className="aqTarjeta aqTarjeta--nota">
        <p className="aqTarjetaNota">No pudimos cargar el proceso. Inténtalo de nuevo.</p>
        <button type="button" className="aqReintentar" onClick={reintentar}>
          Reintentar
        </button>
      </div>
    );
  }

  if (status === "empty" || status === "invalido") {
    return (
      <div className="aqTarjeta aqTarjeta--nota">
        <p className="aqTarjetaNota">
          No hay un proceso destacado disponible en este departamento.
        </p>
      </div>
    );
  }

  return (
    <div className="aqTarjeta aqTarjeta--nota" aria-busy="true">
      <p className="aqTarjetaNota">Cargando proceso…</p>
      {/* El destacado se pide desde el navegador: sin JS no llega nunca. */}
      <noscript>
        <p className="aqTarjetaNota">
          Abre un departamento del mapa o utiliza el buscador para consultar sus fichas.
        </p>
      </noscript>
    </div>
  );
}
