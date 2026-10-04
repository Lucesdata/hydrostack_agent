import { describe, expect, it } from "vitest";
import geo from "@/data/geo/departamentos.geo.json";
import {
  ALTO_ETIQUETA,
  ANCHO_ETIQUETA,
  CODIGOS_CON_ANCLA,
  MARGEN_ETIQUETAS,
  anclaDe,
  colocarEtiquetas,
} from "@/src/lib/mapa/etiquetas-procesos";
import {
  ALTO_MAPA,
  ANCHO_MAPA,
  LADO_RECUADRO,
  RECUADRO_X,
  RECUADRO_Y,
} from "@/src/lib/mapa/modelo";
import {
  BBOX_CONTINENTAL,
  BBOX_SAN_ANDRES,
  crearProyeccion,
  recortarA,
  type Geometria,
} from "@/src/lib/mapa/proyeccion";

type Punto = [number, number];

function anillos(g: Geometria): number[][][] {
  return g.type === "Polygon"
    ? (g.coordinates as number[][][])
    : (g.coordinates as number[][][][]).flat();
}

/** Par-impar sobre todos los anillos ya proyectados. */
function dentro([x, y]: Punto, poligonos: Punto[][]): boolean {
  let d = false;
  for (const anillo of poligonos) {
    for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
      const [xi, yi] = anillo[i];
      const [xj, yj] = anillo[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) d = !d;
    }
  }
  return d;
}

const features = (
  geo as unknown as { features: { properties: { dpto: string }; geometry: Geometria }[] }
).features;
const proyectar = crearProyeccion(BBOX_CONTINENTAL, ANCHO_MAPA, ALTO_MAPA);
const proyectarIsla = crearProyeccion(BBOX_SAN_ANDRES, LADO_RECUADRO, LADO_RECUADRO);

function poligonosDe(dpto: string): Punto[][] {
  const f = features.find((x) => x.properties.dpto === dpto)!;
  if (dpto === "88") {
    return anillos(recortarA(f.geometry, BBOX_SAN_ANDRES)).map((a) =>
      a.map(([lon, lat]) => {
        const [x, y] = proyectarIsla(lon, lat);
        return [x + RECUADRO_X, y + RECUADRO_Y] as Punto;
      })
    );
  }
  return anillos(f.geometry).map((a) => a.map(([lon, lat]) => proyectar(lon, lat) as Punto));
}

function distanciaAlBorde([x, y]: Punto, poligonos: Punto[][]): number {
  let min = Infinity;
  for (const anillo of poligonos) {
    for (let i = 0; i < anillo.length; i++) {
      const [ax, ay] = anillo[i];
      const [bx, by] = anillo[(i + 1) % anillo.length];
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
}

const cajasSeSolapan = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.abs(a.x - b.x) < ANCHO_ETIQUETA && Math.abs(a.y - b.y) < ALTO_ETIQUETA;

describe("anclajes", () => {
  it("los 33 departamentos tienen anclaje, y cae DENTRO de su departamento", () => {
    expect(CODIGOS_CON_ANCLA).toHaveLength(33);
    for (const dpto of CODIGOS_CON_ANCLA) {
      const a = anclaDe(dpto)!;
      const poligonos = poligonosDe(dpto);
      expect(dentro(a, poligonos), `anclaje de ${dpto} fuera de su polígono`).toBe(true);
      // Ni pegado al borde: un punto a media unidad de Bogotá se lee en Bogotá.
      expect(
        distanciaAlBorde(a, poligonos),
        `anclaje de ${dpto} pegado al borde`
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it("un código desconocido no tiene anclaje", () => {
    expect(anclaDe("00")).toBeNull();
  });
});

describe("colocarEtiquetas", () => {
  it("cinco departamentos distintos: cada uno su etiqueta, sin solaparse, fuera de la silueta", () => {
    const e = colocarEtiquetas(
      ["76", "52", "11", "17", "13"].map((dpto, i) => ({ id: `p${i}`, dpto }))
    );
    expect(e.map((x) => x.id)).toEqual(["p0", "p1", "p2", "p3", "p4"]);
    for (const a of e) {
      expect(a.x - ANCHO_ETIQUETA / 2 >= ANCHO_MAPA || a.x + ANCHO_ETIQUETA / 2 <= 0, a.id).toBe(
        true
      );
      expect(a.x - ANCHO_ETIQUETA / 2).toBeGreaterThanOrEqual(-MARGEN_ETIQUETAS);
      expect(a.x + ANCHO_ETIQUETA / 2).toBeLessThanOrEqual(ANCHO_MAPA + MARGEN_ETIQUETAS);
      expect(a.y - ALTO_ETIQUETA / 2).toBeGreaterThanOrEqual(0);
      expect(a.y + ALTO_ETIQUETA / 2).toBeLessThanOrEqual(ALTO_MAPA);
      for (const b of e) if (a !== b) expect(cajasSeSolapan(a, b), `${a.id}/${b.id}`).toBe(false);
    }
  });

  it("cinco procesos en el mismo departamento comparten el anclaje real; nadie se desplaza", () => {
    const e = colocarEtiquetas([0, 1, 2, 3, 4].map((i) => ({ id: `p${i}`, dpto: "11" })));
    expect(e).toHaveLength(5);
    const [ax, ay] = anclaDe("11")!;
    for (const a of e) {
      expect([a.anclaX, a.anclaY]).toEqual([ax, ay]);
      expect(a.lado).toBe(e[0].lado);
    }
    for (const a of e) for (const b of e) if (a !== b) expect(cajasSeSolapan(a, b)).toBe(false);
  });

  it("vecinos cercanos (Caldas, Risaralda, Quindío) no se pisan", () => {
    const e = colocarEtiquetas(["17", "66", "63"].map((dpto) => ({ id: dpto, dpto })));
    for (const a of e) for (const b of e) if (a !== b) expect(cajasSeSolapan(a, b)).toBe(false);
  });

  it("San Andrés se ancla en su recuadro", () => {
    const [e] = colocarEtiquetas([{ id: "x", dpto: "88" }]);
    expect([e.anclaX, e.anclaY]).toEqual([
      RECUADRO_X + LADO_RECUADRO / 2,
      RECUADRO_Y + LADO_RECUADRO / 2,
    ]);
    expect(e.lado).toBe("oeste");
  });

  it("es determinístico y deja fuera lo que no tiene anclaje", () => {
    const entradas = [
      { id: "a", dpto: "05" },
      { id: "b", dpto: "00" },
      { id: "c", dpto: "05" },
    ];
    expect(colocarEtiquetas(entradas)).toEqual(colocarEtiquetas(entradas));
    expect(colocarEtiquetas(entradas).map((e) => e.id)).toEqual(["a", "c"]);
  });
});
