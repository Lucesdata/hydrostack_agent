"use client";

import { useEffect, useState } from "react";

/**
 * Los datos del panel de una región (spec 2026-10-07-hero-tres-destacados,
 * PR 3). Es la única petición del hero y solo sale al **pulsar** un
 * departamento: la selección del hero (destacados y conteos) sigue llegando
 * del servidor en el HTML.
 *
 * Una respuesta por región y familia, guardada en memoria mientras dure la
 * visita (el CDN la cachea 6 h). Al cambiar de región o de pestaña se aborta la
 * anterior, y una respuesta que no es de la región pedida se descarta: si no,
 * un clic rápido podía pintar Antioquia con los datos de Meta.
 */

const cache = new Map();

export function urlRegion(dpto, familia) {
  return `/api/portada/region/${dpto}/${familia}`;
}

/** ¿La respuesta es la de esta región y familia, con la forma esperada? */
export function esRespuestaDe(datos, dpto, familia) {
  return (
    datos != null &&
    datos.dpto === dpto &&
    datos.familia === familia &&
    Array.isArray(datos.procesos) &&
    typeof datos.conteo?.n === "number"
  );
}

/**
 * `{ fase: "vacio" | "cargando" | "listo" | "error", datos?, reintentar }`.
 * `dpto` o `familia` nulos = no hay región abierta.
 */
export function useRegion(dpto, familia) {
  const clave = dpto && familia ? `${dpto}/${familia}` : null;
  const [estado, setEstado] = useState({ clave: null, fase: "vacio" });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!clave) return undefined;
    if (cache.has(clave)) {
      setEstado({ clave, fase: "listo", datos: cache.get(clave) });
      return undefined;
    }
    const ctrl = new AbortController();
    setEstado({ clave, fase: "cargando" });
    fetch(urlRegion(dpto, familia), { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((datos) => {
        if (!esRespuestaDe(datos, dpto, familia)) throw new Error("respuesta de otra región");
        cache.set(clave, datos);
        setEstado({ clave, fase: "listo", datos });
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setEstado({ clave, fase: "error" });
      });
    return () => ctrl.abort();
    // `dpto` y `familia` van en `clave`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, intento]);

  const actual = estado.clave === clave ? estado : { clave, fase: clave ? "cargando" : "vacio" };
  return { ...actual, reintentar: () => setIntento((i) => i + 1) };
}
