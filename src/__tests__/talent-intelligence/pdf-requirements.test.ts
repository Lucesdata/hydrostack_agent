import { describe, expect, it } from "vitest";
import { dividirTextoPdfEnPaginas } from "../../lib/talent-intelligence/pdf-requirements";

describe("Talent Intelligence: paginado de Poppler", () => {
  it("conserva página real y blancos intermedios", () => {
    const paginas = dividirTextoPdfEnPaginas(
      "Portada\f\fSe requiere operador de PTAR con dedicación 50%.\f"
    );
    expect(paginas).toEqual([
      { numero: 1, texto: "Portada" },
      { numero: 2, texto: "" },
      { numero: 3, texto: "Se requiere operador de PTAR con dedicación 50%." },
    ]);
  });

  it("permite una página con separador final", () => {
    expect(dividirTextoPdfEnPaginas("Se requiere ingeniero sanitario.\f")).toEqual([
      { numero: 1, texto: "Se requiere ingeniero sanitario." },
    ]);
  });

  it("rechaza texto sin separadores y no inventa página", () => {
    expect(() => dividirTextoPdfEnPaginas("Se requiere ingeniero civil.")).toThrow(
      "sin delimitadores"
    );
  });

  it("rechaza una salida vacía y cantidades excesivas", () => {
    expect(() => dividirTextoPdfEnPaginas("\f")).toThrow("fuera de rango");
    expect(() => dividirTextoPdfEnPaginas("a\f".repeat(1001))).toThrow("fuera de rango");
  });
});
