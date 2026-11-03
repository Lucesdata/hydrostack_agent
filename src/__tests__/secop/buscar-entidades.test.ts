import { describe, expect, it } from "vitest";
import { normalizarBusqueda, palabrasDeBusqueda } from "@/src/lib/secop/buscar-entidades";

describe("búsqueda de entidades", () => {
  it("normaliza tildes, mayúsculas y signos", () => {
    expect(normalizarBusqueda("  ACUEDUCTO, Alcantarillado—Bogotá ")).toBe(
      "acueducto alcantarillado bogota"
    );
  });
  it("separa en palabras y acota a seis", () => {
    expect(palabrasDeBusqueda("Empresas Municipales de Cali")).toEqual([
      "empresas",
      "municipales",
      "de",
      "cali",
    ]);
    expect(palabrasDeBusqueda("a b c d e f g h")).toHaveLength(6);
  });
  it("una búsqueda vacía o de signos no produce palabras", () => {
    expect(palabrasDeBusqueda(" -- ")).toEqual([]);
  });
});
