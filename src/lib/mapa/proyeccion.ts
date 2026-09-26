/**
 * La proyección del mapa departamental: Mercator a mano, cero dependencias.
 *
 * Una librería de mapas cuesta entre 40 y 150 kB en una portada que está en
 * 113 kB de JS, y de todo lo que trae aquí solo haría falta esto: pasar de
 * grados a píxeles. Mercator y no una cónica porque Colombia está sobre el
 * ecuador, donde la deformación de Mercator es la menor de todas.
 *
 * El encuadre sale de un bbox **declarado** y no del extremo de los datos. Es
 * la diferencia entre un mapa y una esquina con un mapa dentro: San Andrés está
 * a 2,7° al oeste del continente, y ajustar el lienzo a los datos lo ensancharía
 * para enseñar una mancha de un píxel. Va en su propio recuadro.
 */

export interface Bbox {
  lonMin: number;
  lonMax: number;
  latMin: number;
  latMax: number;
}

/**
 * La Colombia continental, medida sobre `data/geo/departamentos.geo.json` y
 * redondeada hacia fuera. Sin San Andrés.
 */
export const BBOX_CONTINENTAL: Bbox = {
  lonMin: -79.01,
  lonMax: -66.85,
  latMin: -4.23,
  latMax: 12.45,
};

/**
 * La isla de San Andrés sola, ajustada a su contorno real.
 *
 * Providencia queda fuera del dibujo —a 90 km, en un recuadro de 58 px las dos
 * son dos puntos de un píxel— pero no del enlace: el departamento sigue siendo
 * uno solo y se clica entero.
 */
export const BBOX_SAN_ANDRES: Bbox = {
  lonMin: -81.74,
  lonMax: -81.685,
  latMin: 12.5,
  latMax: 12.585,
};

export type Proyeccion = (lon: number, lat: number) => [number, number];

export interface Geometria {
  type: string;
  coordinates: number[][][] | number[][][][];
}

/** La y de Mercator, en grados, para que comparta unidad con la longitud. */
function mercatorY(lat: number): number {
  return (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
}

/**
 * Encaja `bbox` dentro de `ancho`×`alto` **conservando la proporción** y
 * centrando lo que sobre. Escalar cada eje por su cuenta llenaría el lienzo,
 * pero estiraría el país.
 */
export function crearProyeccion(bbox: Bbox, ancho: number, alto: number): Proyeccion {
  const x0 = bbox.lonMin;
  const anchoGrados = bbox.lonMax - bbox.lonMin;
  const yArriba = mercatorY(bbox.latMax);
  const altoGrados = yArriba - mercatorY(bbox.latMin);

  const escala = Math.min(ancho / anchoGrados, alto / altoGrados);
  const margenX = (ancho - anchoGrados * escala) / 2;
  const margenY = (alto - altoGrados * escala) / 2;

  return (lon, lat) => [
    (lon - x0) * escala + margenX,
    (yArriba - mercatorY(lat)) * escala + margenY,
  ];
}

/** Todos los anillos de una geometría, sea Polygon o MultiPolygon. */
function anillos(g: Geometria): number[][][] {
  if (g.type === "Polygon") return g.coordinates as number[][][];
  return (g.coordinates as number[][][][]).flat();
}

/**
 * El atributo `d` de una geometría: un subcamino cerrado por anillo.
 *
 * Un decimal y no más. Es lo que de verdad se paga —estos `d` viajan dentro del
 * HTML de la portada— y a 420 px de ancho la décima de píxel no la ve nadie.
 */
export function pathDe(g: Geometria, proyectar: Proyeccion): string {
  return anillos(g)
    .map((anillo) => {
      const puntos = anillo.map(([lon, lat]) => {
        const [x, y] = proyectar(lon, lat);
        return `${x.toFixed(1)} ${y.toFixed(1)}`;
      });
      return `M${puntos.join("L")}Z`;
    })
    .join("");
}

/**
 * Se queda con las partes de una geometría que caen dentro de `bbox`.
 *
 * Existe por el recuadro de San Andrés: el departamento 88 son dos polígonos a
 * 90 km uno de otro, y al proyectar el recuadro sobre la isla grande, el de
 * Providencia cae fuera de la caja y se pintaría suelto encima del mapa. Se
 * compara el centro de cada parte, no todos sus puntos: una isla que asomara un
 * vértice por el borde seguiría siendo esa isla.
 */
export function recortarA(g: Geometria, bbox: Bbox): Geometria {
  const dentro = (anillo: number[][]) => {
    const lon = anillo.reduce((a, c) => a + c[0], 0) / anillo.length;
    const lat = anillo.reduce((a, c) => a + c[1], 0) / anillo.length;
    return lon >= bbox.lonMin && lon <= bbox.lonMax && lat >= bbox.latMin && lat <= bbox.latMax;
  };

  if (g.type === "Polygon") {
    const anillos = g.coordinates as number[][][];
    return dentro(anillos[0]) ? g : { type: "Polygon", coordinates: [] };
  }

  const partes = (g.coordinates as number[][][][]).filter((parte) => dentro(parte[0]));
  return { type: "MultiPolygon", coordinates: partes };
}
