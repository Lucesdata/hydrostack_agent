import { ESCALONES } from "@/src/lib/mapa/escala";
import {
  ALTO_MAPA,
  ANCHO_MAPA,
  LADO_RECUADRO,
  construirModeloMapa,
  type EntradaMapa,
} from "@/src/lib/mapa/modelo";
import type { FilaAgregado } from "@/src/lib/secop/agregados";

/**
 * El mapa de procesos abiertos por departamento.
 *
 * Componente de servidor y SVG dibujado a mano: **cero dependencias y cero kB
 * de cliente**. Una librería de mapas cuesta 40–150 kB en una portada que está
 * en 113 kB de JS, y de todo lo que trae solo se usaría la proyección.
 *
 * No consulta la base. Recibe las filas de `procesosPorDepartamento()` por
 * props, como hace `PaginaFaceta`: así la portada sigue siendo estática y esto
 * se puede probar sin Supabase.
 *
 * ── Tres decisiones que se ven en el HTML ──────────────────────────────────
 *
 * 1. **El departamento sin procesos no es un enlace.** Mandar a alguien a una
 *    faceta vacía es peor que no dejarle clicar, y además lo saca del recorrido
 *    con teclado, donde 33 paradas serían 33 paradas.
 * 2. **Cada departamento clicable es un `<a>` de verdad**, con `aria-label` que
 *    dice el nombre y la cifra. Un `onClick` sobre un `<path>` no lo alcanza el
 *    teclado, no lo lee un lector de pantalla y no se puede abrir en otra
 *    pestaña.
 * 3. **San Andrés va en un recuadro con escala propia.** A escala real son dos
 *    manchas de un píxel a 700 km de la costa; con el encuadre ajustado a ellas
 *    el continente encoge. Se dibuja la isla de San Andrés, y el enlace sigue
 *    siendo el del departamento entero.
 */

const numero = new Intl.NumberFormat("es-CO");

/** Arriba a la izquierda, sobre el Pacífico, que es donde el mapa tiene hueco. */
const RECUADRO_X = 6;
const RECUADRO_Y = 10;

function etiquetaDe(e: EntradaMapa): string {
  if (e.n === 0) return `${e.nombre}, sin procesos abiertos`;
  // Vichada tiene 1. "1 procesos abiertos" es lo que lee en voz alta un lector
  // de pantalla, y es justo el departamento donde más se nota.
  if (e.n === 1) return `${e.nombre}, 1 proceso abierto`;
  return `${e.nombre}, ${numero.format(e.n)} procesos abiertos`;
}

function Departamento({ entrada }: { entrada: EntradaMapa }) {
  const path = (
    <path d={entrada.d} className={`clr-mapa__dpto clr-mapa__dpto--e${entrada.escalon.indice}`}>
      <title>{etiquetaDe(entrada)}</title>
    </path>
  );

  if (!entrada.href) return path;

  return (
    <a href={entrada.href} className="clr-mapa__link" aria-label={etiquetaDe(entrada)}>
      {path}
    </a>
  );
}

export interface ColombiaChoroplethProps {
  filas: FilaAgregado[];
  /**
   * El total de procesos abiertos. Con él, el mapa enuncia cuántos no tienen
   * ubicación en vez de repartirlos entre departamentos — que es lo que haría
   * creer que están donde no están.
   */
  totalAbiertos?: number;
}

export default function ColombiaChoropleth({ filas, totalAbiertos }: ColombiaChoroplethProps) {
  const { continente, sanAndres, totalLocalizados } = construirModeloMapa(filas);
  const sinUbicacion = totalAbiertos == null ? null : totalAbiertos - totalLocalizados;

  return (
    <figure className="clr-mapa">
      <svg
        className="clr-mapa__svg"
        viewBox={`0 0 ${ANCHO_MAPA} ${ALTO_MAPA}`}
        role="group"
        aria-labelledby="clr-mapa-titulo"
      >
        <title id="clr-mapa-titulo">Procesos abiertos de agua y saneamiento por departamento</title>
        {continente.map((e) => (
          <Departamento key={e.dpto} entrada={e} />
        ))}
        {sanAndres && (
          <g transform={`translate(${RECUADRO_X} ${RECUADRO_Y})`}>
            <rect
              className="clr-mapa__recuadro"
              x={-4}
              y={-4}
              width={LADO_RECUADRO + 8}
              height={LADO_RECUADRO + 8}
            />
            <Departamento entrada={sanAndres} />
            <text className="clr-mapa__recuadro-txt" x={-4} y={LADO_RECUADRO + 16}>
              San Andrés
            </text>
          </g>
        )}
      </svg>

      <ul className="clr-mapa__leyenda">
        {ESCALONES.map((e) => (
          <li key={e.indice}>
            <span
              className="clr-mapa__swatch"
              style={{ background: `var(--mapa-e${e.indice})` }}
              aria-hidden="true"
            />
            {e.etiqueta}
          </li>
        ))}
      </ul>

      <figcaption className="clr-mapa__nota">Según ubicación de la entidad contratante</figcaption>

      {sinUbicacion != null && sinUbicacion > 0 && (
        <p className="clr-mapa__sin">
          {numero.format(sinUbicacion)} procesos abiertos sin ubicación resuelta, que no se reparten
          en el mapa.
        </p>
      )}
    </figure>
  );
}
