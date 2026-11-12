import { describe, expect, it } from "vitest";
import { ALTO_MAPA, ANCHO_MAPA } from "@/src/lib/mapa/modelo";
import { BBOX_CONTINENTAL, crearProyeccion } from "@/src/lib/mapa/proyeccion";
import { geometria3d, poligonoAEscena, poligonosDe } from "@/src/lib/marketplace/geometria3d";
import { DEPARTAMENTOS_DANE } from "@/src/lib/marketplace/adaptador";

const g = geometria3d();

describe("geometría 3D (SPEC §6.1–6.2)", () => {
  it("tiene las 33 unidades, con códigos DIVIPOLA como cadena y el cero inicial", () => {
    expect(g.territorios).toHaveLength(33);
    const codigos = g.territorios.map((t) => t.codigo);
    expect(new Set(codigos).size).toBe(33);
    for (const c of codigos) expect(c).toMatch(/^\d{2}$/);
    expect(codigos).toContain("05"); // Antioquia no pierde el 0
    expect(codigos).toContain("11"); // Bogotá D. C.
    expect(codigos).toContain("88"); // San Andrés, Providencia y Santa Catalina
  });

  it("coincide con el catálogo de departamentos del adaptador", () => {
    expect(DEPARTAMENTOS_DANE.map((d) => d.codigo).sort()).toEqual(
      g.territorios.map((t) => t.codigo).sort()
    );
  });

  it("todo polígono tiene anillo exterior de tres o más puntos y coordenadas finitas", () => {
    for (const t of g.territorios) {
      expect(t.poligonos.length).toBeGreaterThan(0);
      for (const p of t.poligonos) {
        expect(p[0].length).toBeGreaterThanOrEqual(3);
        for (const anillo of p) for (const [x, z] of anillo) expect(Number.isFinite(x + z)).toBe(true);
      }
    }
  });

  it("el continente cae dentro del lienzo 2D centrado en el origen", () => {
    for (const t of g.territorios.filter((t) => t.codigo !== "88")) {
      for (const p of t.poligonos) {
        for (const [x, z] of p[0]) {
          expect(Math.abs(x)).toBeLessThanOrEqual(ANCHO_MAPA / 2 + 0.5);
          expect(Math.abs(z)).toBeLessThanOrEqual(ALTO_MAPA / 2 + 0.5);
        }
      }
    }
  });

  it("norte arriba: Guajira queda al norte (z menor) de Amazonas", () => {
    const z = (c: string) => {
      const t = g.territorios.find((x) => x.codigo === c)!;
      const pts = t.poligonos.flatMap((p) => p[0]);
      return pts.reduce((a, [, zz]) => a + zz, 0) / pts.length;
    };
    expect(z("44")).toBeLessThan(z("91"));
  });

  it("las islas se dibujan arriba a la izquierda, dentro del lienzo, con dos polígonos", () => {
    const islas = g.territorios.find((t) => t.codigo === "88")!;
    expect(islas.poligonos.length).toBeGreaterThanOrEqual(2);
    for (const p of islas.poligonos) {
      for (const [x, z] of p[0]) {
        expect(x).toBeGreaterThan(-ANCHO_MAPA / 2);
        expect(x).toBeLessThan(0);
        expect(z).toBeGreaterThan(-ALTO_MAPA / 2);
        expect(z).toBeLessThan(0);
      }
    }
    expect(islas.ancla).not.toBeNull();
  });

  it("todo ancla (menos el de las islas) cae dentro del lienzo", () => {
    for (const t of g.territorios) {
      if (!t.ancla) continue;
      expect(Math.abs(t.ancla[0])).toBeLessThan(ANCHO_MAPA / 2);
      expect(Math.abs(t.ancla[1])).toBeLessThan(ALTO_MAPA / 2);
    }
  });

  it("la proyección es la del mapa 2D: un punto conocido cae donde el 2D lo pone", () => {
    const p2d = crearProyeccion(BBOX_CONTINENTAL, ANCHO_MAPA, ALTO_MAPA)(-74.08, 4.6);
    const poligono = poligonoAEscena(
      [[[-74.08, 4.6], [-74.0, 4.6], [-74.0, 4.7], [-74.08, 4.6]]],
      crearProyeccion(BBOX_CONTINENTAL, ANCHO_MAPA, ALTO_MAPA)
    );
    expect(poligono[0][0][0]).toBeCloseTo(p2d[0] - ANCHO_MAPA / 2, 6);
    expect(poligono[0][0][1]).toBeCloseTo(p2d[1] - ALTO_MAPA / 2, 6);
  });

  it("conserva los huecos de un polígono (anillos interiores) y cierra los anillos", () => {
    const proyectar = (lon: number, lat: number): [number, number] => [lon, lat];
    const p = poligonoAEscena(
      [
        [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
        [[2, 2], [4, 2], [4, 4], [2, 2]],
      ],
      proyectar
    );
    expect(p).toHaveLength(2);
    expect(p[0]).toHaveLength(4); // sin el punto repetido de cierre
    expect(p[1]).toHaveLength(3);
  });

  it("lee Polygon y MultiPolygon", () => {
    const poly = { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] };
    const multi = { type: "MultiPolygon", coordinates: [poly.coordinates, poly.coordinates] };
    expect(poligonosDe(poly)).toHaveLength(1);
    expect(poligonosDe(multi)).toHaveLength(2);
  });
});
