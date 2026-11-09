import { describe, expect, it } from "vitest";
import { encontrarCitaEnTexto } from "../../lib/talent-intelligence/evidence-text";

describe("Talent Intelligence: verificación literal en texto", () => {
  it("encuentra una cita aunque el documento tenga saltos de línea", () => {
    const texto = "Se requiere ingeniero sanitario\ncon cinco años de experiencia.";
    const cita = "ingeniero sanitario con cinco años de experiencia.";
    const encontrado = encontrarCitaEnTexto(texto, cita);
    expect(encontrado?.fragmento).toBe("ingeniero sanitario\ncon cinco años de experiencia.");
    expect(encontrado?.documentoOriginalVerificado).toBe(false);
    expect(texto.slice(encontrado?.inicio, encontrado?.fin)).toBe(encontrado?.fragmento);
  });

  it("no da por acreditadas frases inexistentes", () => {
    expect(encontrarCitaEnTexto("Se requiere ingeniero civil.", "ingeniero sanitario cinco años")).toBeNull();
  });

  it("no acepta coincidencias demasiado cortas", () => {
    expect(encontrarCitaEnTexto("Ingeniero civil requerido.", "civil")).toBeNull();
  });

  it("trata signos de puntuación como caracteres literales", () => {
    expect(encontrarCitaEnTexto("Requiere PLC (SCADA) certificado.", "PLC (SCADA) certificado.")).not.toBeNull();
  });
});
