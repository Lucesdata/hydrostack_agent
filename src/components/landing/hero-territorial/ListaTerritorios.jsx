"use client";

import { formatConteo } from "@/src/components/secop/format";

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
  const max = Math.max(1, ...departamentos.map((d) => d.n));

  return (
    <section aria-labelledby="aq-territorios-titulo">
      <div className="aqListaCabecera">
        <h2 id="aq-territorios-titulo">Departamentos</h2>
        <span>{datosDisponibles ? departamentos.length : "—"}</span>
      </div>
      <label className="aqBuscador">
        <span aria-hidden="true">⌕</span>
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
              <span className="aqFilaNombre">{d.label}</span>
              <span className="aqBarra" aria-hidden="true">
                <span style={{ width: `${(100 * d.n) / max}%` }} />
              </span>
              <strong>{formatConteo(d.n)}</strong>
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
