"use client";

import { useEffect, useRef } from "react";
import { formatConteo } from "@/src/components/secop/format";
import { escalonDe } from "@/src/lib/mapa/escala";

export const normalizarTerritorio = (texto = "") =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");

export function filtrarTerritorios(departamentos = [], busqueda = "") {
  const termino = normalizarTerritorio(busqueda.trim());
  if (!termino) return departamentos;
  return departamentos.filter((d) => normalizarTerritorio(d.label).includes(termino));
}

export default function ListaTerritorios({
  departamentos = [],
  busqueda,
  onBusqueda,
  seleccionado,
  onSeleccionar,
  datosDisponibles,
  resaltado = null,
  onResaltar = () => {},
}) {
  const visibles = filtrarTerritorios(departamentos, busqueda);
  const listaRef = useRef(null);

  // Si el mapa señala un departamento que está fuera de la vista de la lista,
  // la lista se desplaza hasta él. Solo la lista: mover la página al pasar el
  // ratón por el mapa sería peor que no sincronizar.
  useEffect(() => {
    const lista = listaRef.current;
    if (!lista || !resaltado) return;
    const fila = lista.querySelector(`[data-clave="${resaltado}"]`);
    if (!fila) return;
    const f = fila.getBoundingClientRect();
    const l = lista.getBoundingClientRect();
    if (f.top < l.top) lista.scrollTop -= l.top - f.top;
    else if (f.bottom > l.bottom) lista.scrollTop += f.bottom - l.bottom;
  }, [resaltado]);

  return (
    <section aria-labelledby="aq-territorios-titulo">
      <div className="aqListaCabecera">
        <h2 id="aq-territorios-titulo">Departamentos</h2>
        <span>{datosDisponibles ? departamentos.length : "—"}</span>
      </div>
      <label className="aqBuscador">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          aria-label="Buscar departamento"
          placeholder="Buscar departamento…"
          value={busqueda}
          onChange={(event) => onBusqueda(event.target.value)}
        />
      </label>
      <ul
        ref={listaRef}
        className="aqLista"
        aria-label="Departamentos con procesos abiertos"
        onPointerLeave={() => onResaltar(null)}
      >
        {visibles.map((d) => (
          <li key={d.clave}>
            <button
              type="button"
              aria-pressed={seleccionado?.clave === d.clave}
              aria-controls="aq-ficha-territorial"
              data-clave={d.clave}
              data-resaltado={resaltado === d.clave || undefined}
              onClick={() => onSeleccionar(d.clave)}
              onPointerEnter={() => onResaltar(d.clave)}
              onFocus={() => onResaltar(d.clave)}
              onBlur={() => onResaltar(null)}
            >
              <span className={`aqPunto aqPunto--e${escalonDe(d.n).indice}`} aria-hidden="true" />
              <span className="aqFilaNombre">{d.label}</span>
              <strong>{formatConteo(d.n)}</strong>
              <span className="aqChevron" aria-hidden="true">
                ›
              </span>
            </button>
          </li>
        ))}
      </ul>
      {visibles.length === 0 && (
        <p className="aqVacio" role="status">
          {departamentos.length > 0
            ? "No encontramos ese departamento."
            : datosDisponibles
              ? "No hay procesos abiertos por departamento."
              : "Los conteos se mostrarán cuando estén disponibles."}
        </p>
      )}
    </section>
  );
}
