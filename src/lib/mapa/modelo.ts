import geojson from "@/data/geo/departamentos.geo.json";
import type { FilaAgregado } from "@/src/lib/secop/agregados";
import { escalonDe, type Escalon } from "./escala";
import {
  BBOX_CONTINENTAL,
  BBOX_SAN_ANDRES,
  crearProyeccion,
  pathDe,
  recortarA,
  type Geometria,
} from "./proyeccion";

/**
 * El modelo de vista del mapa: geometría + conteos → lo que el SVG pinta.
 *
 * Va aparte del componente porque lo que decide si Antioquia sale coloreada es
 * aritmética de códigos, no JSX, y aquí se comprueba sin rascar HTML. Mismo
 * patrón que `semaforo.ts`, que también es modelo de vista puro.
 *
 * **El cruce es por código de dos dígitos**, nunca por nombre: el archivo trae
 * "VALLE DEL CAUCA" en mayúsculas del DANE y la base "Valle del Cauca". El
 * nombre que se lee y el enlace salen de la base; del archivo solo sale la
 * forma.
 */

export const ANCHO_MAPA = 420;
export const ALTO_MAPA = 520;
export const LADO_RECUADRO = 58;

export interface EntradaMapa {
  /** Código DIVIPOLA de dos dígitos. */
  dpto: string;
  /** El de la base cuando hay filas; el del archivo cuando no. */
  nombre: string;
  /** Atributo `d` ya proyectado. */
  d: string;
  n: number;
  escalon: Escalon;
  /** `null` cuando no hay procesos: mandar a alguien a una faceta vacía es peor
   * que no dejarle clicar. */
  href: string | null;
}

export interface ModeloMapa {
  /** Los 32 que se dibujan en el mapa grande. */
  continente: EntradaMapa[];
  /** El 88, que se dibuja en su recuadro con escala propia. */
  sanAndres: EntradaMapa | null;
  /** Lo que el mapa representa, para poder contrastarlo con el total abierto. */
  totalLocalizados: number;
}

interface Feature {
  properties: { dpto: string; nombre: string };
  geometry: Geometria;
}

const FEATURES = (geojson as unknown as { features: Feature[] }).features;
const CODIGO_SAN_ANDRES = "88";

/** Título de cortesía para el nombre del DANE, que llega en mayúsculas. */
function comoTitulo(nombre: string): string {
  return nombre
    .toLocaleLowerCase("es")
    .replace(/(^|[\s(])([a-záéíóúñ])/g, (_, pre, letra) => pre + letra.toLocaleUpperCase("es"));
}

function entrada(f: Feature, fila: FilaAgregado | undefined, d: string): EntradaMapa {
  const n = fila?.n ?? 0;
  return {
    dpto: f.properties.dpto,
    nombre: fila?.label ?? comoTitulo(f.properties.nombre),
    d,
    n,
    escalon: escalonDe(n),
    href: n > 0 && fila ? `/licitaciones/departamento/${fila.slug}` : null,
  };
}

export function construirModeloMapa(filas: FilaAgregado[]): ModeloMapa {
  const porCodigo = new Map(filas.map((f) => [f.clave, f]));

  const proyectar = crearProyeccion(BBOX_CONTINENTAL, ANCHO_MAPA, ALTO_MAPA);
  const proyectarIsla = crearProyeccion(BBOX_SAN_ANDRES, LADO_RECUADRO, LADO_RECUADRO);

  const continente: EntradaMapa[] = [];
  let sanAndres: EntradaMapa | null = null;

  for (const f of FEATURES) {
    const codigo = f.properties.dpto;
    const fila = porCodigo.get(codigo);
    if (codigo === CODIGO_SAN_ANDRES) {
      // Solo la isla grande: ver `recortarA`.
      const isla = recortarA(f.geometry, BBOX_SAN_ANDRES);
      sanAndres = entrada(f, fila, pathDe(isla, proyectarIsla));
    } else {
      continente.push(entrada(f, fila, pathDe(f.geometry, proyectar)));
    }
  }

  const codigosConGeometria = new Set(FEATURES.map((f) => f.properties.dpto));
  const totalLocalizados = filas
    .filter((f) => codigosConGeometria.has(f.clave))
    .reduce((n, f) => n + f.n, 0);

  return { continente, sanAndres, totalLocalizados };
}
