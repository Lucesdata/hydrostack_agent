import { describe, expect, it } from "vitest";
import { SEMANAS, esCodigoDepartamento, serieSemanal } from "@/src/lib/secop/resumen-departamento";

describe("serieSemanal", () => {
  it("ordena de la semana más antigua a la actual", () => {
    const serie = serieSemanal([
      { k: 0, n: 7 },
      { k: 11, n: 3 },
    ]);
    expect(serie).toHaveLength(SEMANAS);
    expect(serie[SEMANAS - 1]).toBe(7);
    expect(serie[0]).toBe(3);
  });

  it("una semana sin filas vale cero, no falta", () => {
    expect(serieSemanal([{ k: 4, n: 2 }]).filter((n) => n === 0)).toHaveLength(SEMANAS - 1);
  });

  it("descarta semanas fuera de la ventana o imposibles", () => {
    const serie = serieSemanal([
      { k: -1, n: 5 },
      { k: 12, n: 5 },
      { k: 1.5, n: 5 },
    ]);
    expect(serie.every((n) => n === 0)).toBe(true);
  });
});

describe("esCodigoDepartamento", () => {
  it("acepta dos dígitos y nada más", () => {
    expect(esCodigoDepartamento("05")).toBe(true);
    expect(esCodigoDepartamento("5")).toBe(false);
    expect(esCodigoDepartamento("050")).toBe(false);
    expect(esCodigoDepartamento("05' or 1=1")).toBe(false);
    expect(esCodigoDepartamento(undefined)).toBe(false);
  });
});
