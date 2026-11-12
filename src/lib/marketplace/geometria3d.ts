/**
 * La geometría del mapa 3D, en coordenadas de escena. Puro: sin three, sin DOM.
 *
 * Sale de la colección que ya existe (DANE MGN 2025 simplificado,
 * `data/geo/departamentos.geo.json`) y de la geometría específica de San Andrés
 * y Providencia (`data/geo/san-andres-providencia.geo.json`), con **la misma
 * proyección** que el mapa 2D (`proyeccion.ts`): el 3D y el 2D no pueden
 * discrepar en la forma. El centro del lienzo 2D es el origen; +x es el este y
 * +z el sur (la `y` de la pantalla), de modo que el norte queda arriba con una
 * cámara que mira desde el sur.
 *
 * Los códigos DIVIPOLA son cadenas («05»): un número perdería el cero.
 */

import departamentos from "@/data/geo/departamentos.geo.json";
import islas from "@/data/geo/san-andres-providencia.geo.json";
import { anclaDe } from "../mapa/etiquetas-procesos";
import { ALTO_MAPA, ANCHO_MAPA } from "../mapa/modelo";
import { BBOX_CONTINENTAL, crearProyeccion, type Geometria } from "../mapa/proyeccion";
import { DEPARTAMENTOS_DANE } from "./adaptador";

/** `[x, z]` en unidades de escena. */
export type Punto = [number, number];
/** Un polígono: el anillo exterior y, después, sus huecos. */
export type Poligono = Punto[][];

export interface Territorio3D {
  /** DIVIPOLA de dos dígitos. */
  codigo: string;
  nombre: string;
  poligonos: Poligono[];
  /** Punto interior validado donde va el marcador agregado; `null` si no hay. */
  ancla: Punto | null;
}

export interface Geometria3D {
  /** El lienzo en unidades de escena (el del mapa 2D). */
  ancho: number;
  alto: number;
  territorios: Territorio3D[];
}

const CODIGO_SAN_ANDRES = "88";

/**
 * El archipiélago va en un recuadro sobre el Caribe, arriba a la izquierda,
 * como en el mapa 2D (`recuadro-islas.ts`): a la escala del país serían dos
 * manchas de 2 unidades. Cada isla se amplía por el mismo factor (San Andrés
 * mide `ALTO_SAN_ANDRES` de alto) y Providencia queda al noreste, con la
 * distancia entre ambas acortada. Es una convención de lectura, no una escala.
 */
const ALTO_SAN_ANDRES = 30;
const DESTINO_SAN_ANDRES: Punto = [-ANCHO_MAPA / 2 + 44, -ALTO_MAPA / 2 + 54];
const DESPLAZAMIENTO_PROVIDENCIA: Punto = [34, -26];

interface FeatureGeo {
  properties: { dpto?: string; nombre: string };
  geometry: Geometria;
}

/** Polígonos de una geometría GeoJSON, sea Polygon o MultiPolygon. */
export function poligonosDe(g: Geometria): number[][][][] {
  if (g.type === "Polygon") return [g.coordinates as number[][][]];
  return g.coordinates as number[][][][];
}

/** `anillo` de [lon, lat] a [x, z] con la proyección dada (y centro del lienzo). */
function proyectarAnillo(
  anillo: number[][],
  proyectar: (lon: number, lat: number) => [number, number],
  dx = 0,
  dz = 0
): Punto[] {
  const pts = anillo.map(([lon, lat]) => {
    const [px, py] = proyectar(lon, lat);
    return [px - ANCHO_MAPA / 2 + dx, py - ALTO_MAPA / 2 + dz] as Punto;
  });
  // GeoJSON repite el primer punto al final; la forma de three lo cierra sola.
  const a = pts[0];
  const z = pts[pts.length - 1];
  return a && z && a[0] === z[0] && a[1] === z[1] ? pts.slice(0, -1) : pts;
}

/** Un polígono GeoJSON (exterior + huecos) a anillos de escena. Conserva los huecos. */
export function poligonoAEscena(
  p: number[][][],
  proyectar: (lon: number, lat: number) => [number, number],
  dx = 0,
  dz = 0
): Poligono {
  return p.map((anillo) => proyectarAnillo(anillo, proyectar, dx, dz)).filter((a) => a.length >= 3);
}

function territoriosContinentales(): Territorio3D[] {
  const proyectar = crearProyeccion(BBOX_CONTINENTAL, ANCHO_MAPA, ALTO_MAPA);
  return (departamentos as unknown as { features: FeatureGeo[] }).features
    .filter((f) => f.properties.dpto && f.properties.dpto !== CODIGO_SAN_ANDRES)
    .map((f) => {
      const codigo = f.properties.dpto as string;
      const ancla = anclaDe(codigo);
      return {
        codigo,
        nombre: DEPARTAMENTOS_DANE.find((d) => d.codigo === codigo)?.nombre ?? f.properties.nombre,
        poligonos: poligonosDe(f.geometry)
          .map((p) => poligonoAEscena(p, proyectar))
          .filter((p) => p.length > 0),
        ancla: ancla ? ([ancla[0] - ANCHO_MAPA / 2, ancla[1] - ALTO_MAPA / 2] as Punto) : null,
      };
    });
}

function territorioIslas(): Territorio3D {
  const proyectar = crearProyeccion(BBOX_CONTINENTAL, ANCHO_MAPA, ALTO_MAPA);
  const features = (islas as unknown as { features: FeatureGeo[] }).features;
  const sa = features.find((f) => f.properties.nombre === "San Andrés") ?? features[0];

  const aPlano = (g: Geometria) =>
    poligonosDe(g).map((p) => p.map((anillo) => anillo.map(([lon, lat]) => proyectar(lon, lat))));
  const centro = (pol: [number, number][][][]): [number, number] => {
    const pts = pol.flat(2);
    return [
      pts.reduce((a, p) => a + p[0], 0) / pts.length,
      pts.reduce((a, p) => a + p[1], 0) / pts.length,
    ];
  };

  const planoSa = aPlano(sa.geometry);
  const ys = planoSa.flat(2).map((p) => p[1]);
  const factor = ALTO_SAN_ANDRES / (Math.max(...ys) - Math.min(...ys));

  const poligonos: Poligono[] = [];
  for (const f of features) {
    const plano = f === sa ? planoSa : aPlano(f.geometry);
    const [cx, cy] = centro(plano);
    const destino: Punto =
      f === sa
        ? DESTINO_SAN_ANDRES
        : [
            DESTINO_SAN_ANDRES[0] + DESPLAZAMIENTO_PROVIDENCIA[0],
            DESTINO_SAN_ANDRES[1] + DESPLAZAMIENTO_PROVIDENCIA[1],
          ];
    for (const pol of plano) {
      const anillos = pol
        .map((anillo) => {
          const pts = anillo.map(
            ([x, y]) => [destino[0] + (x - cx) * factor, destino[1] + (y - cy) * factor] as Punto
          );
          const a = pts[0];
          const z = pts[pts.length - 1];
          return a && z && a[0] === z[0] && a[1] === z[1] ? pts.slice(0, -1) : pts;
        })
        .filter((a) => a.length >= 3);
      if (anillos.length > 0) poligonos.push(anillos);
    }
  }
  return {
    codigo: CODIGO_SAN_ANDRES,
    nombre: DEPARTAMENTOS_DANE.find((d) => d.codigo === CODIGO_SAN_ANDRES)?.nombre ?? "San Andrés",
    poligonos,
    ancla: DESTINO_SAN_ANDRES,
  };
}

let memo: Geometria3D | null = null;

/** Se calcula una vez por montaje del módulo; es estable y no depende de los datos. */
export function geometria3d(): Geometria3D {
  if (!memo) {
    memo = {
      ancho: ANCHO_MAPA,
      alto: ALTO_MAPA,
      territorios: [...territoriosContinentales(), territorioIslas()],
    };
  }
  return memo;
}
