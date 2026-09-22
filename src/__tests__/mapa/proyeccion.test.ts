import { describe, it, expect } from "vitest";
import { BBOX_CONTINENTAL, crearProyeccion, pathDe } from "@/src/lib/mapa/proyeccion";

/**
 * La proyección del mapa: doce líneas de Mercator y cero dependencias.
 *
 * El encuadre sale de un bbox DECLARADO —el continente— y no del extremo de los
 * datos. Si se ajustara a los datos, San Andrés (lon -81,7) ensancharía el mapa
 * 2,7° hacia el oeste para mostrar una mancha de un píxel, y el país encogería.
 * Por eso San Andrés se dibuja aparte, en su propio recuadro.
 */

const ANCHO = 420;
const ALTO = 520;

describe("proyección del mapa", () => {
  const proyectar = crearProyeccion(BBOX_CONTINENTAL, ANCHO, ALTO);

  it("pone el centro del bbox declarado en el centro del lienzo", () => {
    const lon = (BBOX_CONTINENTAL.lonMin + BBOX_CONTINENTAL.lonMax) / 2;
    const [x] = proyectar(lon, 0);
    expect(x).toBeCloseTo(ANCHO / 2, 6);
  });

  it("deja el norte arriba", () => {
    const [, yNorte] = proyectar(-74, 11);
    const [, ySur] = proyectar(-74, -3);
    expect(yNorte).toBeLessThan(ySur);
  });

  it("mantiene el país dentro del lienzo", () => {
    const esquinas: Array<[number, number]> = [
      [BBOX_CONTINENTAL.lonMin, BBOX_CONTINENTAL.latMin],
      [BBOX_CONTINENTAL.lonMin, BBOX_CONTINENTAL.latMax],
      [BBOX_CONTINENTAL.lonMax, BBOX_CONTINENTAL.latMin],
      [BBOX_CONTINENTAL.lonMax, BBOX_CONTINENTAL.latMax],
    ];
    for (const [lon, lat] of esquinas) {
      const [x, y] = proyectar(lon, lat);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(ANCHO);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(ALTO);
    }
  });

  it("no deforma: la misma distancia en el mapa mide lo mismo en los dos ejes", () => {
    // Un grado de longitud y un grado de Mercator en latitud, cerca del ecuador,
    // tienen que dar el mismo número de píxeles. Si no, el país sale estirado.
    const [x0] = proyectar(-74, 0);
    const [x1] = proyectar(-73, 0);
    const [, y0] = proyectar(-74, 0);
    const [, y1] = proyectar(-74, 1);
    const gradoMercator = (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + Math.PI / 360));
    expect(Math.abs(x1 - x0)).toBeCloseTo(Math.abs(y1 - y0) / gradoMercator, 4);
  });

  it("saca del lienzo lo que cae fuera del bbox declarado", () => {
    // San Andrés: lon -81,7, al oeste del continente. Que salga negativo es la
    // prueba de que el encuadre NO se ajusta a los datos.
    const [x, y] = proyectar(-81.7, 12.58);
    expect(x).toBeLessThan(0);
    expect(y).toBeLessThan(0);
  });
});

describe("pathDe", () => {
  const proyectar = crearProyeccion(BBOX_CONTINENTAL, ANCHO, ALTO);

  it("convierte un Polygon en un subcamino cerrado", () => {
    const d = pathDe(
      {
        type: "Polygon",
        coordinates: [
          [
            [-74, 4],
            [-73, 4],
            [-73, 5],
            [-74, 4],
          ],
        ],
      },
      proyectar
    );
    expect(d.startsWith("M")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
    expect(d.split("M")).toHaveLength(2); // un solo anillo
  });

  it("da un subcamino por anillo de un MultiPolygon", () => {
    const anillo = (lon: number) => [
      [lon, 4],
      [lon + 1, 4],
      [lon + 1, 5],
      [lon, 4],
    ];
    const d = pathDe(
      { type: "MultiPolygon", coordinates: [[anillo(-74)], [anillo(-70)]] },
      proyectar
    );
    expect(d.match(/M/g)).toHaveLength(2);
    expect(d.match(/Z/g)).toHaveLength(2);
  });

  it("redondea a un decimal: más precisión es peso de HTML que nadie ve", () => {
    const d = pathDe(
      {
        type: "Polygon",
        coordinates: [
          [
            [-74, 4],
            [-73, 4],
            [-73, 5],
            [-74, 4],
          ],
        ],
      },
      proyectar
    );
    for (const n of d.match(/-?\d+\.?\d*/g) ?? []) {
      expect(n).toMatch(/^-?\d+(\.\d)?$/);
    }
  });
});
