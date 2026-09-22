import { describe, it, expect } from "vitest";
import { ESCALONES, escalonDe } from "@/src/lib/mapa/escala";

/**
 * Los cortes del color del mapa.
 *
 * Son rangos fijos y no cuantiles, decidido el 2026-09-22 midiendo la
 * distribución real: Tolima y Quindío tienen 708 procesos abiertos los dos, y
 * un corte por cuantiles los habría pintado de distinto color por estar a los
 * dos lados de la frontera del grupo. Un mapa donde el mismo número es dos
 * colores no se puede leer.
 */

describe("escala del mapa", () => {
  it("declara cinco escalones contiguos, de menor a mayor", () => {
    expect(ESCALONES).toHaveLength(5);
    ESCALONES.forEach((e, i) => expect(e.indice).toBe(i));
    for (let i = 1; i < ESCALONES.length; i++) {
      const previo = ESCALONES[i - 1];
      expect(previo.max).not.toBeNull();
      expect(ESCALONES[i].min).toBe((previo.max as number) + 1);
    }
    expect(ESCALONES[ESCALONES.length - 1].max).toBeNull();
  });

  it("coloca cada conteo en su escalón, con los bordes exactos", () => {
    const casos: Array<[number, number]> = [
      [0, 0],
      [1, 1],
      [99, 1],
      [100, 2],
      [499, 2],
      [500, 3],
      [1499, 3],
      [1500, 4],
      [5155, 4], // Antioquia, el máximo real
    ];
    for (const [n, indice] of casos) expect(escalonDe(n).indice).toBe(indice);
  });

  it("pinta igual a dos departamentos con el mismo número", () => {
    // Tolima y Quindío, 708 los dos. Es el caso que descartó los cuantiles.
    expect(escalonDe(708).indice).toBe(escalonDe(708).indice);
    expect(escalonDe(708)).toBe(escalonDe(708));
  });

  it("trata cualquier conteo imposible como 'sin procesos'", () => {
    expect(escalonDe(-1).indice).toBe(0);
    expect(escalonDe(Number.NaN).indice).toBe(0);
  });

  it("da a cada escalón una etiqueta legible para la leyenda", () => {
    expect(ESCALONES.map((e) => e.etiqueta)).toEqual([
      "Sin procesos",
      "1–99",
      "100–499",
      "500–1.499",
      "1.500+",
    ]);
  });
});
