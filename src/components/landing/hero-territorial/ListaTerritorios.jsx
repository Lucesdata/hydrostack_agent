"use client";

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
}) {
  const visibles = filtrarTerritorios(departamentos, busqueda);

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
      <ul className="aqLista" aria-label="Departamentos con procesos abiertos">
        {visibles.map((d) => (
          <li key={d.clave}>
            <button
              type="button"
              aria-pressed={seleccionado?.clave === d.clave}
              aria-controls="aq-ficha-territorial"
              onClick={() => onSeleccionar(d.clave)}
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
