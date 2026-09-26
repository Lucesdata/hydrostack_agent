import { describe, expect, it } from "vitest";
import geo from "@/data/geo/departamentos.geo.json";
import { ALTO_MAPA, ANCHO_MAPA } from "@/src/lib/mapa/modelo";
import {
  ALTO_ROTULO,
  ANCHO_ROTULO,
  ANCLAS,
  MARGEN_ROTULOS,
  MAX_ROTULOS,
  colocarRotulos,
} from "@/src/lib/mapa/rotulos";

// Los 32 del continente con cifras distintas: el peor caso para el colocador,
// porque todos compiten por un rótulo.
const todos = Object.keys(ANCLAS).map((dpto, i) => ({
  dpto,
  nombre: `D${dpto}`,
  n: 5000 - i * 100,
}));

describe("colocarRotulos", () => {
  it("hay ancla para cada departamento del continente", () => {
    const continentales = geo.features.map((f) => f.properties.dpto).filter((c) => c !== "88");
    expect(Object.keys(ANCLAS).sort()).toEqual(continentales.sort());
  });

  it("elige por cifra y no pasa del máximo", () => {
    const rotulos = colocarRotulos(todos);
    expect(rotulos.length).toBeGreaterThan(0);
    expect(rotulos.length).toBeLessThanOrEqual(MAX_ROTULOS);
    expect(rotulos[0].dpto).toBe(todos[0].dpto);
  });

  it("no rotula departamentos sin procesos", () => {
    const rotulos = colocarRotulos(todos.map((t) => ({ ...t, n: 0 })));
    expect(rotulos).toEqual([]);
  });

  it("las cajas no se solapan y caben en el lienzo ensanchado", () => {
    const rotulos = colocarRotulos(todos);
    for (const r of rotulos) {
      expect(r.x - ANCHO_ROTULO / 2).toBeGreaterThanOrEqual(-MARGEN_ROTULOS);
      expect(r.x + ANCHO_ROTULO / 2).toBeLessThanOrEqual(ANCHO_MAPA + MARGEN_ROTULOS);
      expect(r.y - ALTO_ROTULO / 2).toBeGreaterThanOrEqual(0);
      expect(r.y + ALTO_ROTULO / 2).toBeLessThanOrEqual(ALTO_MAPA);
    }
    for (let i = 0; i < rotulos.length; i++) {
      for (let j = i + 1; j < rotulos.length; j++) {
        const a = rotulos[i];
        const b = rotulos[j];
        const separadas = Math.abs(a.x - b.x) >= ANCHO_ROTULO || Math.abs(a.y - b.y) >= ALTO_ROTULO;
        expect(separadas, `${a.dpto} y ${b.dpto} se solapan`).toBe(true);
      }
    }
  });

  it("es determinístico", () => {
    expect(colocarRotulos(todos)).toEqual(colocarRotulos(todos));
  });
});
