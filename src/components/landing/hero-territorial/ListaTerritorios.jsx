"use client";

import { formatConteo } from "@/src/components/secop/format";
import { escalonDe } from "@/src/lib/mapa/escala";

/**
 * Los departamentos como lista: la alternativa en texto al mapa (cada cifra,
 * legible) y la forma de elegir uno con teclado o en móvil, donde tocar el mapa
 * navega a la faceta.
 *
 * Desde el 2026-09-27 va plegada en un `<details>` bajo el mapa (plan
 * portada-esencial), así que perdió su buscador propio —el hero tenía dos
 * campos de búsqueda casi iguales— y el desplazamiento sincronizado con el
 * mapa, que no tiene sentido con la lista cerrada.
 */
export default function ListaTerritorios({
  departamentos = [],
  seleccionado,
  onSeleccionar,
  resaltado = null,
  onResaltar = () => {},
}) {
  if (departamentos.length === 0) return null;
  return (
    <ul
      className="aqLista"
      aria-label="Departamentos con procesos abiertos"
      onPointerLeave={() => onResaltar(null)}
    >
      {departamentos.map((d) => (
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
          </button>
        </li>
      ))}
    </ul>
  );
}
