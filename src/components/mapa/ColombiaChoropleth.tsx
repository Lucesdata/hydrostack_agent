import { ESCALONES } from "@/src/lib/mapa/escala";
import {
  ALTO_MAPA,
  ANCHO_MAPA,
  LADO_RECUADRO,
  RECUADRO_X,
  RECUADRO_Y,
  construirModeloMapa,
  type EntradaMapa,
} from "@/src/lib/mapa/modelo";
import { ALTO_ROTULO, ANCHO_ROTULO, MARGEN_ROTULOS, colocarRotulos } from "@/src/lib/mapa/rotulos";
import {
  ALTO_ETIQUETA,
  ANCHO_ETIQUETA,
  MARGEN_ETIQUETAS,
  colocarEtiquetas,
} from "@/src/lib/mapa/etiquetas-procesos";
import {
  departamentoCorto,
  familiaDe,
  presupuestoCorto,
  type ProcesoPortada,
} from "@/src/lib/landing/proceso-portada";
import { recuadroIslas } from "@/src/lib/mapa/recuadro-islas";
import { familiasPorDepartamento, gruposDe } from "@/src/lib/landing/grupos-portada";
import type { FilaAgregado } from "@/src/lib/secop/agregados";
import { frase } from "@/src/components/landing/texto";

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
  familia,
}: {
  entrada: EntradaMapa;
  disponible?: boolean;
  tooltipExterno?: boolean;
  /**
   * Solo en el modo selección: `undefined` para un departamento sin procesos
   * elegidos, la familia de color si todos los suyos la comparten, o "mixta".
   * En ese modo el departamento no es enlace ni lleva conteo: el fondo no
   * navega, navegan las etiquetas de cada proceso (spec §8).
   */
  familia?: string | null;
}) {
  if (familia !== undefined) {
    return (
      <path
        d={entrada.d}
        className={`clr-mapa__dpto clr-mapa__dpto--base${familia ? " clr-mapa__dpto--sel" : ""}`}
        data-dpto={entrada.dpto}
        data-familia={familia ?? undefined}
      >
        <title>{entrada.nombre}</title>
      </path>
    );
  }
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
  /**
   * Una capa vacía encima de los departamentos donde el hero dibuja el
   * contorno del elegido (`sincronia.js`). Sin ella, los vecinos que se pintan
   * después tapan la mitad de su borde: en SVG manda el orden del documento.
   */
  capaSeleccion?: boolean;
  /** Cuántos rótulos como mucho. La portada pide 5 (plan portada-esencial). */
  maxRotulos?: number;
  /**
   * Modo selección (hero de la portada, spec 2026-10-04): el mapa deja de ser
   * coroplético y marca **estos** procesos —los mismos objetos que pintan las
   * minifichas—, con un anclaje por departamento y una etiqueta enlazada por
   * proceso. Sin escala de conteos, sin rótulos de departamento y sin enlaces
   * a facetas. Un array vacío es un mapa base sin señales.
   */
  seleccion?: ProcesoPortada[];
}

export default function ColombiaChoropleth({
  filas,
  totalAbiertos,
  etiquetas = false,
  datosDisponibles = true,
  tooltipExterno = false,
  capaSeleccion = false,
  maxRotulos,
  seleccion,
}: ColombiaChoroplethProps) {
  if (seleccion) return <MapaSeleccion procesos={seleccion} />;
  const { continente, sanAndres, totalLocalizados } = construirModeloMapa(filas);
  const sinUbicacion = totalAbiertos == null ? null : totalAbiertos - totalLocalizados;
  const rotulos = etiquetas && datosDisponibles ? colocarRotulos(continente, maxRotulos) : [];
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
        {/* "Sin procesos" lleva rayado además de su tono: sobre el fondo oscuro
            del hero ese tono se distingue apenas 1,37:1, y el color no puede
            ser lo único que lo diga (WCAG 1.4.1). La clase --e0 lo usa. */}
        <defs>
          <pattern
            id="clr-mapa-sin"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="6" height="6" className="clr-mapa__sin-fondo" />
            <line x1="0" y1="0" x2="0" y2="6" className="clr-mapa__sin-raya" />
          </pattern>
        </defs>
        {continente.map((e) => (
          <Departamento
            key={e.dpto}
            entrada={e}
            disponible={datosDisponibles}
            tooltipExterno={tooltipExterno}
          />
        ))}
        {/* Sin `d`: el cliente le copia el contorno del departamento elegido. */}
        {capaSeleccion && (
          <path className="clr-mapa__marca" aria-hidden="true" pointerEvents="none" />
        )}
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

export { familiasPorDepartamento };

/** Ancho aproximado de un texto de Inter, para no salirse de la caja. */
const anchoTexto = (t: string, cuerpo: number) => t.length * cuerpo * 0.56;
const TEXTO_X = 21;
const TEXTO_UTIL = ANCHO_ETIQUETA - TEXTO_X - 8;

/** Las guías, los anclajes y las etiquetas de un grupo de procesos. */
function SenalesGrupo({ procesos }: { procesos: ProcesoPortada[] }) {
  const familias = familiasPorDepartamento(procesos);
  const etiquetas = colocarEtiquetas(
    procesos.map((p) => ({ id: p.id, dpto: p.departamentoCodigo }))
  );
  const porId = new Map(procesos.map((p) => [p.id, p]));
  // Un anclaje por departamento, con los ids que comparte.
  const anclas = new Map<string, { x: number; y: number; ids: string[] }>();
  for (const e of etiquetas) {
    const a = anclas.get(e.dpto) ?? { x: e.anclaX, y: e.anclaY, ids: [] };
    a.ids.push(e.id);
    anclas.set(e.dpto, a);
  }
  return (
    <>
      <g aria-hidden="true" pointerEvents="none">
        {etiquetas.map((e) => (
          <line
            key={e.id}
            className="clr-mapa__guia"
            data-proceso={e.id}
            x1={e.guiaX}
            y1={e.y}
            x2={e.anclaX}
            y2={e.anclaY}
          />
        ))}
        {[...anclas].map(([dpto, a]) => (
          <circle
            key={dpto}
            className="clr-mapa__ancla"
            data-ancla={dpto}
            data-procesos={a.ids.join(" ")}
            data-familia={familias.get(dpto)}
            cx={a.x}
            cy={a.y}
            r={4.2}
          />
        ))}
      </g>
      {etiquetas.map((e) => {
        const p = porId.get(e.id)!;
        // El nombre del departamento sale de la fila del proceso, no del
        // archivo del DANE: así la etiqueta dice lo mismo que la tarjeta.
        const lugar = departamentoCorto(p.departamento);
        const valor = presupuestoCorto(p.presupuesto);
        const x0 = e.x - ANCHO_ETIQUETA / 2;
        const y0 = e.y - ALTO_ETIQUETA / 2;
        // Un nombre que no cabe se comprime un poco en vez de salirse.
        const ajuste = (t: string, cuerpo: number) =>
          anchoTexto(t, cuerpo) > TEXTO_UTIL
            ? { textLength: TEXTO_UTIL, lengthAdjust: "spacingAndGlyphs" as const }
            : {};
        return (
          <a
            key={e.id}
            href={p.href}
            className="clr-mapa__etq"
            data-proceso={p.id}
            data-familia={familiaDe(p.tipoProyecto)}
            // El mismo nombre accesible que el enlace de su tarjeta.
            aria-label={`Ver ficha del proceso ${p.numeroProceso}: ${frase(p.objeto)}`}
          >
            <rect x={x0} y={y0} width={ANCHO_ETIQUETA} height={ALTO_ETIQUETA} rx={7} />
            <circle className="clr-mapa__etq-punto" cx={x0 + 11} cy={y0 + 14} r={4.4} />
            <text
              className="clr-mapa__etq-lugar"
              x={x0 + TEXTO_X}
              y={y0 + 18}
              {...ajuste(lugar, 13)}
            >
              {lugar}
            </text>
            <text
              className="clr-mapa__etq-valor"
              x={x0 + TEXTO_X}
              y={y0 + 36}
              {...ajuste(valor, 14.5)}
            >
              {valor}
            </text>
          </a>
        );
      })}
    </>
  );
}

/**
 * El mapa de los procesos del hero. `procesos` es la muestra entera; se parte
 * en grupos de cinco (`gruposDe`) y se dibujan las señales de **todos** los
 * grupos, cada una en su `<g data-grupo>`. Solo el primero se ve: el cliente
 * cambia de grupo encendiendo otro (`aplicarGrupo` en `sincronia.js`), y un
 * grupo oculto con `display: none` tampoco recibe el foco.
 */
function MapaSeleccion({ procesos }: { procesos: ProcesoPortada[] }) {
  const { continente, sanAndres } = construirModeloMapa([]);
  const grupos = gruposDe(procesos);
  const primero = grupos[0] ?? [];
  // El tinte de los departamentos es el del primer grupo; el cliente lo
  // repinta al cambiar de grupo.
  const familias = familiasPorDepartamento(primero);
  const conFamilia = (e: EntradaMapa) => familias.get(e.dpto) ?? null;

  return (
    <figure className="clr-mapa clr-mapa--seleccion">
      <svg
        className="clr-mapa__svg"
        viewBox={`${-MARGEN_ETIQUETAS} 0 ${ANCHO_MAPA + 2 * MARGEN_ETIQUETAS} ${ALTO_MAPA}`}
        role="group"
        aria-labelledby="clr-mapa-titulo"
        aria-describedby="clr-mapa-desc"
      >
        <title id="clr-mapa-titulo">Mapa de Colombia con los procesos para explorar</title>
        <desc id="clr-mapa-desc">
          {primero.length === 0
            ? "No hay procesos marcados en el mapa."
            : `${primero.length === 1 ? "Un proceso marcado" : `${primero.length} procesos marcados`} en el departamento de su entidad contratante, no en el lugar de la obra. La lista de procesos debajo del mapa tiene la misma información.`}
        </desc>
        {continente.map((e) => (
          <Departamento key={e.dpto} entrada={e} familia={conFamilia(e)} />
        ))}
        {/* San Andrés y Providencia, con sus costas en detalle y a la misma
            escala (recuadro-islas.ts). Sin transform: el anclaje y las guías
            usan las mismas coordenadas que el resto del mapa. */}
        {sanAndres && (
          <g className="clr-mapa__islas">
            <rect
              className="clr-mapa__recuadro clr-mapa__recuadro--islas"
              x={recuadroIslas.x}
              y={recuadroIslas.y}
              width={recuadroIslas.ancho}
              height={recuadroIslas.alto}
              rx={8}
            />
            <Departamento
              entrada={{ ...sanAndres, d: recuadroIslas.d }}
              familia={conFamilia(sanAndres)}
            />
            <text
              className="clr-mapa__recuadro-txt clr-mapa__islas-txt"
              x={recuadroIslas.rotulo.x}
              y={recuadroIslas.rotulo.y1}
              textAnchor="middle"
            >
              San Andrés
            </text>
            <text
              className="clr-mapa__recuadro-txt clr-mapa__islas-txt"
              x={recuadroIslas.rotulo.x}
              y={recuadroIslas.rotulo.y2}
              textAnchor="middle"
            >
              y Providencia
            </text>
          </g>
        )}
        {grupos.map((g, k) => (
          <g key={k} className={`clr-mapa__grupo${k > 0 ? " is-oculto" : ""}`} data-grupo={k}>
            <SenalesGrupo procesos={g} />
          </g>
        ))}
      </svg>
      <figcaption className="clr-mapa__nota">Según ubicación de la entidad contratante</figcaption>
    </figure>
  );
}
