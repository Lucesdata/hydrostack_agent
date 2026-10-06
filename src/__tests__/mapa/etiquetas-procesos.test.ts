import { describe, expect, it } from "vitest";
import geo from "@/data/geo/departamentos.geo.json";
import {
  ALTO_ETIQUETA,
  ANCHO_ETIQUETA,
  CODIGOS_CON_ANCLA,
  ALTO_FLOTANTE,
  ANCHO_FLOTANTE,
  MARGEN_ETIQUETAS,
  VIEWBOX_SELECCION,
  anclaDe,
  colocarEtiquetaFlotante,
  colocarEtiquetas,
} from "@/src/lib/mapa/etiquetas-procesos";
import { ALTO_MAPA, ANCHO_MAPA } from "@/src/lib/mapa/modelo";
import { recuadroIslas, RECUADRO_ISLAS } from "@/src/lib/mapa/recuadro-islas";
import { BBOX_CONTINENTAL, crearProyeccion, type Geometria } from "@/src/lib/mapa/proyeccion";

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

/** Los anillos de un `d` "M x yLx y…Z" ya proyectado. */
function anillosDeD(d: string): Punto[][] {
  return d
    .split("M")
    .filter(Boolean)
    .map((sub) =>
      sub
        .replace("Z", "")
        .split("L")
        .map((p) => p.trim().split(" ").map(Number) as Punto)
    );
}

function poligonosDe(dpto: string): Punto[][] {
  const f = features.find((x) => x.properties.dpto === dpto)!;
  // San Andrés va en su recuadro de islas, con su propia geometría.
  if (dpto === "88") return anillosDeD(recuadroIslas.d);
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
    expect([e.anclaX, e.anclaY]).toEqual(recuadroIslas.ancla);
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

describe("recuadro de San Andrés y Providencia", () => {
  const r = RECUADRO_ISLAS;
  const dentroDeCaja = ([x, y]: Punto) =>
    x >= r.x && x <= r.x + r.ancho && y >= r.y && y <= r.y + r.alto;

  it("no pisa la costa: ningún punto del continente cae dentro del recuadro", () => {
    for (const f of features) {
      if (f.properties.dpto === "88") continue;
      for (const anillo of poligonosDe(f.properties.dpto)) {
        for (const p of anillo) expect(dentroDeCaja(p), `${f.properties.dpto} ${p}`).toBe(false);
      }
    }
  });

  it("las dos islas caben dentro, con Providencia al noreste de San Andrés", () => {
    const [sa, pr] = recuadroIslas.cajas;
    for (const c of [sa, pr]) {
      expect(dentroDeCaja([c.x0, c.y0]) && dentroDeCaja([c.x1, c.y1]), c.nombre).toBe(true);
    }
    // Providencia más arriba y más a la derecha, sin tocarse.
    expect((pr.x0 + pr.x1) / 2).toBeGreaterThan((sa.x0 + sa.x1) / 2);
    expect((pr.y0 + pr.y1) / 2).toBeLessThan((sa.y0 + sa.y1) / 2);
    expect(pr.x0).toBeGreaterThan(sa.x1);
    // A la misma escala: Providencia es más pequeña que San Andrés.
    expect(pr.y1 - pr.y0).toBeLessThan(sa.y1 - sa.y0);
  });

  it("el anclaje del 88 cae dentro de la isla de San Andrés", () => {
    const sa = anillosDeD(recuadroIslas.d).slice(0, 1);
    expect(dentro(recuadroIslas.ancla, sa)).toBe(true);
  });

  it("la costa caribe va a la columna este: su guía no cruza el recuadro", () => {
    const e = colocarEtiquetas(["08", "47"].map((dpto) => ({ id: dpto, dpto })));
    expect(e.map((x) => x.lado)).toEqual(["este", "este"]);
  });

  it("ninguna etiqueta del oeste tapa el recuadro", () => {
    const e = colocarEtiquetas(
      ["88", "88", "27", "05", "23", "70", "13"].map((dpto, i) => ({ id: `p${i}`, dpto }))
    );
    for (const a of e.filter((x) => x.lado === "oeste")) {
      expect(a.x + ANCHO_ETIQUETA / 2).toBeLessThanOrEqual(r.x);
    }
  });
});

describe("colocarEtiquetaFlotante (hero con ficha central)", () => {
  const { x: vx, ancho: vAncho } = VIEWBOX_SELECCION;

  it("los 33 departamentos: la etiqueta queda dentro del lienzo y no tapa su anclaje", () => {
    for (const dpto of CODIGOS_CON_ANCLA) {
      const [ax, ay] = anclaDe(dpto)!;
      const { x0, y0 } = colocarEtiquetaFlotante(ax, ay);
      expect(x0, dpto).toBeGreaterThanOrEqual(vx);
      expect(x0 + ANCHO_FLOTANTE, dpto).toBeLessThanOrEqual(vx + vAncho);
      expect(y0, dpto).toBeGreaterThanOrEqual(0);
      expect(y0 + ALTO_FLOTANTE, dpto).toBeLessThanOrEqual(ALTO_MAPA);
      expect(ax < x0 || ax > x0 + ANCHO_FLOTANTE, `${dpto} tapa su anclaje`).toBe(true);
    }
  });

  it("a la derecha del punto, salvo en el oriente", () => {
    expect(colocarEtiquetaFlotante(100, 200)).toEqual({ x0: 114, y0: 180 });
    expect(colocarEtiquetaFlotante(350, 200)).toEqual({ x0: 228, y0: 180 });
    expect(colocarEtiquetaFlotante(100, 0).y0).toBe(4);
    expect(colocarEtiquetaFlotante(100, ALTO_MAPA).y0).toBe(ALTO_MAPA - ALTO_FLOTANTE - 4);
  });
});
