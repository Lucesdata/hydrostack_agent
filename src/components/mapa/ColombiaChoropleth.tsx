import { ESCALONES } from "@/src/lib/mapa/escala";
import {
  ALTO_MAPA,
  ANCHO_MAPA,
  LADO_RECUADRO,
  construirModeloMapa,
  type EntradaMapa,
} from "@/src/lib/mapa/modelo";
import { ALTO_ROTULO, ANCHO_ROTULO, MARGEN_ROTULOS, colocarRotulos } from "@/src/lib/mapa/rotulos";
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

function Departamento({
  entrada,
  disponible = true,
  tooltipExterno = false,
}: {
  entrada: EntradaMapa;
  disponible?: boolean;
  tooltipExterno?: boolean;
}) {
  const enlazado = disponible && !!entrada.href;
  // Con tooltip propio (el hero), el <title> de un departamento enlazado solo
  // añadiría el tooltip nativo del navegador encima: su nombre accesible ya lo
  // da el aria-label del enlace. Los no enlazados lo conservan siempre.
  const conTitle = !(tooltipExterno && enlazado);
  const path = (
    <path
      d={entrada.d}
      className={`clr-mapa__dpto clr-mapa__dpto--e${entrada.escalon.indice}`}
      // El código DIVIPOLA, para que el hero (cliente) sincronice mapa, lista
      // y ficha por delegación de eventos sin mandar el mapa al navegador.
      data-dpto={entrada.dpto}
      data-nombre={entrada.nombre}
    >
      {conTitle && (
        <title>
          {disponible ? etiquetaDe(entrada) : `${entrada.nombre}, datos no disponibles`}
        </title>
      )}
    </path>
  );

  if (!enlazado) return path;

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
  /** Etiquetas visuales de referencia; no incorporan datos ni geometría al cliente. */
  etiquetas?: boolean;
  datosDisponibles?: boolean;
  /** Quien monta el mapa pinta su propio tooltip (el hero de la portada). */
  tooltipExterno?: boolean;
}

export default function ColombiaChoropleth({
  filas,
  totalAbiertos,
  etiquetas = false,
  datosDisponibles = true,
  tooltipExterno = false,
}: ColombiaChoroplethProps) {
  const { continente, sanAndres, totalLocalizados } = construirModeloMapa(filas);
  const sinUbicacion = totalAbiertos == null ? null : totalAbiertos - totalLocalizados;
  const rotulos = etiquetas && datosDisponibles ? colocarRotulos(continente) : [];
  // Con rótulos, el lienzo se ensancha a los lados para que las cajas puedan
  // salir de la silueta sin tapar la costa.
  const viewBox = etiquetas
    ? `${-MARGEN_ROTULOS} 0 ${ANCHO_MAPA + 2 * MARGEN_ROTULOS} ${ALTO_MAPA}`
    : `0 0 ${ANCHO_MAPA} ${ALTO_MAPA}`;

  return (
    <figure className="clr-mapa">
      <svg
        className="clr-mapa__svg"
        viewBox={viewBox}
        role="group"
        aria-labelledby="clr-mapa-titulo"
      >
        <title id="clr-mapa-titulo">Procesos abiertos de agua y saneamiento por departamento</title>
        {continente.map((e) => (
          <Departamento
            key={e.dpto}
            entrada={e}
            disponible={datosDisponibles}
            tooltipExterno={tooltipExterno}
          />
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
            <Departamento
              entrada={sanAndres}
              disponible={datosDisponibles}
              tooltipExterno={tooltipExterno}
            />
            <text className="clr-mapa__recuadro-txt" x={-4} y={LADO_RECUADRO + 16}>
              San Andrés
            </text>
          </g>
        )}
        {rotulos.map((r) => {
          const bordeX = r.anclaX < r.x ? -ANCHO_ROTULO / 2 : ANCHO_ROTULO / 2;
          return (
            <g
              key={r.dpto}
              className="atlas-map-label"
              transform={`translate(${r.x} ${r.y})`}
              aria-hidden="true"
              pointerEvents="none"
            >
              <line x1={bordeX} y1={0} x2={r.anclaX - r.x} y2={r.anclaY - r.y} />
              <circle
                className="atlas-map-label-ancla"
                cx={r.anclaX - r.x}
                cy={r.anclaY - r.y}
                r={2.6}
              />
              <rect
                x={-ANCHO_ROTULO / 2}
                y={-ALTO_ROTULO / 2}
                width={ANCHO_ROTULO}
                height={ALTO_ROTULO}
                rx={5}
              />
              <text x={-ANCHO_ROTULO / 2 + 7} y={-3}>
                {r.nombre}
              </text>
              <text x={-ANCHO_ROTULO / 2 + 7} y={10} className="atlas-map-label-count">
                {numero.format(r.n)}
              </text>
            </g>
          );
        })}
      </svg>

      {datosDisponibles ? (
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
      ) : (
        <p className="clr-mapa__sin">Datos territoriales no disponibles · —</p>
      )}

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
