import { ALTO_MAPA, ANCHO_MAPA, LADO_RECUADRO } from "./modelo";

/**
 * Rótulos del mapa de la portada: los departamentos con más procesos abiertos
 * llevan una caja con nombre y cifra, unida por una guía a su centroide.
 *
 * Antes eran cinco departamentos fijos en posiciones escritas a mano, así que
 * Amazonas salía rotulado aunque fuera de los que menos procesos tienen. Ahora
 * se eligen por la cifra y se colocan con una regla determinística: la caja va
 * hacia el borde más cercano del mapa y, si choca con otra, se desliza en
 * vertical. Si no cabe en ningún hueco, ese departamento se queda sin rótulo —
 * sigue en la lista y en su `<title>`, que es donde se lee de verdad.
 */

/** Hueco a cada lado del mapa para que las cajas puedan salir de la silueta. */
export const MARGEN_ROTULOS = 64;
export const ANCHO_ROTULO = 84;
export const ALTO_ROTULO = 30;
export const MAX_ROTULOS = 10;

/** Centroide del polígono principal de cada departamento, en el viewBox del mapa. */
export const ANCLAS: Record<string, [number, number]> = {
  "05": [128, 174],
  "08": [147, 56],
  "11": [171, 255],
  "13": [161, 117],
  "15": [204, 210],
  "17": [136, 223],
  "18": [178, 363],
  "19": [89, 315],
  "20": [192, 92],
  "23": [121, 129],
  "25": [174, 239],
  "27": [86, 204],
  "41": [128, 309],
  "44": [225, 31],
  "47": [169, 70],
  "50": [210, 284],
  "52": [57, 340],
  "54": [212, 137],
  "63": [124, 250],
  "66": [120, 231],
  "68": [193, 181],
  "70": [143, 107],
  "73": [138, 264],
  "76": [99, 269],
  "81": [271, 185],
  "85": [251, 221],
  "86": [119, 375],
  "91": [254, 437],
  "94": [338, 304],
  "95": [235, 329],
  "97": [283, 369],
  "99": [319, 243],
};

export interface Rotulo {
  dpto: string;
  nombre: string;
  n: number;
  /** Centro de la caja. */
  x: number;
  y: number;
  anclaX: number;
  anclaY: number;
}

interface Caja {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const HOLGURA = 4;

function cajaDe(x: number, y: number): Caja {
  return {
    x0: x - ANCHO_ROTULO / 2,
    y0: y - ALTO_ROTULO / 2,
    x1: x + ANCHO_ROTULO / 2,
    y1: y + ALTO_ROTULO / 2,
  };
}

function chocan(a: Caja, b: Caja): boolean {
  return (
    a.x0 < b.x1 + HOLGURA && b.x0 < a.x1 + HOLGURA && a.y0 < b.y1 + HOLGURA && b.y0 < a.y1 + HOLGURA
  );
}

const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** El recuadro de San Andrés ocupa la esquina superior izquierda. */
const RECUADRO: Caja = { x0: 0, y0: 4, x1: LADO_RECUADRO + 14, y1: LADO_RECUADRO + 30 };

const X_MIN = -MARGEN_ROTULOS + ANCHO_ROTULO / 2;
const X_MAX = ANCHO_MAPA + MARGEN_ROTULOS - ANCHO_ROTULO / 2;
const Y_MIN = ALTO_ROTULO / 2;
const Y_MAX = ALTO_MAPA - ALTO_ROTULO / 2;
const LIMITE_OESTE = 150;
const SEPARACION = 66;
const DESPLAZAMIENTOS = [0, -36, 36, -72, 72, -108, 108];

export function colocarRotulos(
  entradas: { dpto: string; nombre: string; n: number }[],
  max = MAX_ROTULOS
): Rotulo[] {
  const candidatas = entradas
    .filter((e) => e.n > 0 && ANCLAS[e.dpto])
    .sort((a, b) => b.n - a.n || a.dpto.localeCompare(b.dpto));

  const ocupadas: Caja[] = [RECUADRO];
  const rotulos: Rotulo[] = [];

  for (const e of candidatas) {
    if (rotulos.length >= max) break;
    const [anclaX, anclaY] = ANCLAS[e.dpto];
    // Una caja ya puesta tapa este centroide: la guía saldría de debajo de otro rótulo.
    if (
      ocupadas
        .slice(1)
        .some((o) => anclaX > o.x0 && anclaX < o.x1 && anclaY > o.y0 && anclaY < o.y1)
    )
      continue;
    // Solo la franja del Pacífico mira a la izquierda: el resto del país tiene
    // su borde libre hacia el oriente, que es donde el mapa está vacío.
    const lado = anclaX < LIMITE_OESTE ? -1 : 1;
    let puesto: Rotulo | null = null;

    for (const sentido of [lado, -lado]) {
      const x = limitar(anclaX + sentido * SEPARACION, X_MIN, X_MAX);
      for (const dy of DESPLAZAMIENTOS) {
        const y = limitar(anclaY + dy, Y_MIN, Y_MAX);
        const caja = cajaDe(x, y);
        const tapaAncla = rotulos.some(
          (r) =>
            r.anclaX > caja.x0 && r.anclaX < caja.x1 && r.anclaY > caja.y0 && r.anclaY < caja.y1
        );
        if (!tapaAncla && !ocupadas.some((o) => chocan(o, caja))) {
          puesto = { dpto: e.dpto, nombre: e.nombre, n: e.n, x, y, anclaX, anclaY };
          ocupadas.push(caja);
          break;
        }
      }
      if (puesto) break;
    }

    if (puesto) rotulos.push(puesto);
  }

  return rotulos;
}
