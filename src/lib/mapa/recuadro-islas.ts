import islas from "@/data/geo/san-andres-providencia.geo.json";
import { mercatorY, pathDe, type Geometria } from "./proyeccion";

/**
 * El recuadro de San Andrés y Providencia del mapa del hero (2026-10-04).
 *
 * El recuadro de siempre (`ColombiaChoropleth`, otros mapas) dibuja la isla de
 * San Andrés con la geometría simplificada del país: 5 puntos, una astilla, y
 * Providencia ni sale. Este dibuja las dos costas con detalle
 * (`data/geo/san-andres-providencia.geo.json`, geoBoundaries CC BY 4.0) **a la
 * misma escala**, con Providencia al noreste de San Andrés como en la
 * realidad; lo único que se acorta es la distancia entre ellas (90 km de mar).
 *
 * Va sobre el Caribe, arriba a la izquierda, en un hueco medido: la costa más
 * cercana (golfo de Morrosquillo) queda a 7 unidades del borde derecho, y
 * `recuadro-islas.test` lo vigila contra la geometría real.
 */

export const RECUADRO_ISLAS = { x: 6, y: 4, ancho: 94, alto: 104 } as const;

/** Margen interior y lo que ocupa el rótulo de dos líneas, abajo. */
const PAD = 6;
const ALTO_ROTULO = 26;
/** Alto de San Andrés en unidades del mapa: fija la escala de las dos islas. */
const ALTO_SAN_ANDRES = 46;

interface Feature {
  properties: { dane: string; nombre: string };
  geometry: Geometria;
}
const FEATURES = (islas as unknown as { features: Feature[] }).features;

function anillos(g: Geometria): number[][][] {
  return g.type === "Polygon"
    ? (g.coordinates as number[][][])
    : (g.coordinates as number[][][][]).flat();
}

function extension(g: Geometria) {
  const pts = anillos(g).flat();
  const lons = pts.map((p) => p[0]);
  const ys = pts.map((p) => mercatorY(p[1]));
  return {
    lonMin: Math.min(...lons),
    lonMax: Math.max(...lons),
    yMin: Math.min(...ys),
    yMax: Math.max(...ys),
  };
}

export interface RecuadroIslas {
  x: number;
  y: number;
  ancho: number;
  alto: number;
  /** Las dos islas en un solo `d`: es un departamento. */
  d: string;
  /** Centro de San Andrés: el anclaje del departamento 88. */
  ancla: [number, number];
  /** Cajas de cada isla, para las pruebas. */
  cajas: { nombre: string; x0: number; y0: number; x1: number; y1: number }[];
  rotulo: { x: number; y1: number; y2: number };
}

/**
 * El punto de San Andrés más alejado de su costa, buscado en una rejilla de
 * 0,25: la isla es estrecha y con entrantes, y el centro de su caja quedaba a
 * 1,4 unidades del borde. El anclaje tiene que leerse sobre la isla.
 */
function puntoInterior(poligono: [number, number][][]): [number, number] {
  const pts = poligono.flat();
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const dentro = (x: number, y: number) => {
    let d = false;
    for (const a of poligono) {
      for (let i = 0, j = a.length - 1; i < a.length; j = i++) {
        const [xi, yi] = a[i];
        const [xj, yj] = a[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) d = !d;
      }
    }
    return d;
  };
  const alBorde = (x: number, y: number) => {
    let min = Infinity;
    for (const a of poligono) {
      for (let i = 0; i < a.length; i++) {
        const [ax, ay] = a[i];
        const [bx, by] = a[(i + 1) % a.length];
        const dx = bx - ax;
        const dy = by - ay;
        const t = Math.max(
          0,
          Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1))
        );
        min = Math.min(min, Math.hypot(x - ax - t * dx, y - ay - t * dy));
      }
    }
    return min;
  };
  let mejor: [number, number] = [xs[0], ys[0]];
  let distancia = -1;
  for (let x = Math.min(...xs); x <= Math.max(...xs); x += 0.25) {
    for (let y = Math.min(...ys); y <= Math.max(...ys); y += 0.25) {
      if (!dentro(x, y)) continue;
      const m = alBorde(x, y);
      if (m > distancia) {
        distancia = m;
        mejor = [x, y];
      }
    }
  }
  return [Math.round(mejor[0] * 10) / 10, Math.round(mejor[1] * 10) / 10];
}

function construir(): RecuadroIslas {
  const { x, y, ancho, alto } = RECUADRO_ISLAS;
  const sa = FEATURES.find((f) => f.properties.dane === "88001")!;
  const pr = FEATURES.find((f) => f.properties.dane === "88564")!;
  const eSa = extension(sa.geometry);
  const ePr = extension(pr.geometry);
  const escala = ALTO_SAN_ANDRES / (eSa.yMax - eSa.yMin);
  const anchoSa = (eSa.lonMax - eSa.lonMin) * escala;
  const anchoPr = (ePr.lonMax - ePr.lonMin) * escala;
  const altoPr = (ePr.yMax - ePr.yMin) * escala;

  // San Andrés abajo a la izquierda, Providencia arriba a la derecha.
  const util = ancho - 2 * PAD;
  const fondo = y + alto - ALTO_ROTULO;
  const saX0 = x + PAD + util * 0.3 - anchoSa / 2;
  const saY0 = fondo - ALTO_SAN_ANDRES;
  const prX0 = x + PAD + util * 0.72 - anchoPr / 2;
  const prY0 = y + PAD + 2;

  const proyectarEn =
    (e: ReturnType<typeof extension>, x0: number, y0: number) => (lon: number, lat: number) =>
      [x0 + (lon - e.lonMin) * escala, y0 + (e.yMax - mercatorY(lat)) * escala] as [number, number];

  const proyectarSa = proyectarEn(eSa, saX0, saY0);
  const d = pathDe(sa.geometry, proyectarSa) + pathDe(pr.geometry, proyectarEn(ePr, prX0, prY0));

  return {
    x,
    y,
    ancho,
    alto,
    d,
    ancla: puntoInterior(
      anillos(sa.geometry).map((a) => a.map(([lon, lat]) => proyectarSa(lon, lat)))
    ),
    cajas: [
      { nombre: "San Andrés", x0: saX0, y0: saY0, x1: saX0 + anchoSa, y1: saY0 + ALTO_SAN_ANDRES },
      { nombre: "Providencia", x0: prX0, y0: prY0, x1: prX0 + anchoPr, y1: prY0 + altoPr },
    ],
    rotulo: { x: x + ancho / 2, y1: y + alto - 15, y2: y + alto - 5 },
  };
}

/** Se calcula una vez: es geometría fija. */
export const recuadroIslas: RecuadroIslas = construir();
