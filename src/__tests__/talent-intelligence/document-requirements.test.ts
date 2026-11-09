import { describe, expect, it } from "vitest";
import { extraerPersonalPorPaginas } from "../../lib/talent-intelligence/document-requirements";

describe("Talent Intelligence: extracción por páginas", () => {
  it("preserva número de página y evidencia en texto", () => {
    const [resultado] = extraerPersonalPorPaginas("pliego-01", [
      { numero: 3, texto: "Descripción general." },
      {
        numero: 8,
        texto: "Se requiere ingeniero sanitario con experiencia general 5 años y dedicación 50%.",
      },
    ]);
    expect(resultado.documentoId).toBe("pliego-01");
    expect(resultado.pagina).toBe(8);
    expect(resultado.documentoOriginalVerificado).toBe(false);
    expect(resultado.requisito.experienciaGeneralAnios).toBe(5);
    expect(resultado.requisito.dedicacionPorcentaje).toBe(50);
    expect(resultado.citaEnTexto.inicio).toBeGreaterThanOrEqual(0);
  });

  it("no convierte texto genérico en un requisito", () => {
    expect(
      extraerPersonalPorPaginas("pliego-02", [
        { numero: 1, texto: "Construcción de planta de tratamiento de aguas residuales." },
      ])
    ).toEqual([]);
  });

  it("rechaza numeración ambigua de páginas", () => {
    expect(() =>
      extraerPersonalPorPaginas("pliego-03", [
        { numero: 1, texto: "" },
        { numero: 1, texto: "" },
      ])
    ).toThrow("duplicado");
  });

  it("rechaza documentos sin identidad", () => {
    expect(() => extraerPersonalPorPaginas(" ", [])).toThrow("identificador");
  });
});
