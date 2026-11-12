import { ALTO_MAPA, ANCHO_MAPA, construirModeloMapa } from "@/src/lib/mapa/modelo";
import { recuadroIslas } from "@/src/lib/mapa/recuadro-islas";
import type { Region } from "@/src/lib/marketplace/tipos";
import s from "./marketplace.module.css";

/**
 * El mapa 2D del hero: la alternativa que ya viene en el HTML del servidor. Es
 * lo que ve quien no tiene JavaScript, WebGL, un ancho de escritorio o prefiere
 * poco movimiento, y lo que se ve mientras la escena 3D se carga.
 *
 * Usa el mismo modelo geométrico que el mapa de siempre (`construirModeloMapa`)
 * pero cada departamento enlaza a la **misma navegación** que el clic del 3D y
 * que el `<select>`: `/marketplace` con ese departamento y los demás filtros.
 * Mismo estado de URL, mismas tarjetas, mismos conteos.
 *
 * Color por intensidad relativa a los conteos de la consulta actual (cinco
 * tramos): con filtros activos los cortes fijos del mapa de la portada dejarían
 * casi todo en un solo tono. El color nunca va solo: cada departamento lleva su
 * nombre y su cifra en `aria-label`.
 */

const numero = new Intl.NumberFormat("es-CO");

function nivelDe(n: number, maximo: number): number {
  if (n <= 0) return 0;
  return Math.min(5, 1 + Math.floor((4 * n) / Math.max(1, maximo)));
}

function etiqueta(nombre: string, n: number, sel: boolean): string {
  const cifra =
    n === 0
      ? "sin oportunidades"
      : n === 1
        ? "1 oportunidad"
        : `${numero.format(n)} oportunidades`;
  return `${nombre}, ${cifra}${sel ? " (seleccionado)" : ""}`;
}

export default function Mapa2D({
  regiones,
  seleccionCodigo,
  destinos,
}: {
  regiones: Region[];
  seleccionCodigo: string | null;
  /** Código DIVIPOLA → URL de `/marketplace` con ese departamento. */
  destinos: Record<string, string>;
}) {
  const modelo = construirModeloMapa(
    regiones.map((r) => ({ clave: r.codigo, label: r.nombre, slug: r.slug, n: r.total }))
  );
  const maximo = Math.max(1, ...regiones.map((r) => r.total));
  const islas = recuadroIslas;
  const entradaIslas = modelo.sanAndres;
  const nIslas = entradaIslas?.n ?? 0;
  const selIslas = seleccionCodigo === "88";

  return (
    <svg
      className={s.mapa2d}
      viewBox={`0 0 ${ANCHO_MAPA} ${ALTO_MAPA}`}
      role="group"
      aria-label="Mapa de Colombia por departamento. Cada departamento es un enlace."
    >
      {modelo.continente.map((e) => {
        const sel = e.dpto === seleccionCodigo;
        const href = destinos[e.dpto];
        const path = (
          <path
            d={e.d}
            className={s.dep}
            data-nivel={nivelDe(e.n, maximo)}
            data-sel={sel || undefined}
          />
        );
        return href ? (
          <a
            key={e.dpto}
            href={href}
            aria-label={etiqueta(e.nombre, e.n, sel)}
            aria-current={sel ? "true" : undefined}
          >
            {path}
          </a>
        ) : (
          <g key={e.dpto}>{path}</g>
        );
      })}
      {entradaIslas && destinos["88"] ? (
        <a
          href={destinos["88"]}
          aria-label={etiqueta("San Andrés, Providencia y Santa Catalina", nIslas, selIslas)}
          aria-current={selIslas ? "true" : undefined}
        >
          <path
            d={islas.d}
            className={s.dep}
            data-nivel={nivelDe(nIslas, maximo)}
            data-sel={selIslas || undefined}
          />
        </a>
      ) : null}
    </svg>
  );
}
