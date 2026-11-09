import { describe, expect, it, vi } from "vitest";
import { pdfToText } from "../../lib/pliego/rules/pdfToText";
import { extraerRequisitosPersonalPdf } from "../../lib/talent-intelligence/pdf-requirements";

vi.mock("../../lib/pliego/rules/pdfToText", () => ({
  pdfToText: vi.fn(),
}));

describe("Talent Intelligence: reutilización del extractor PDF existente", () => {
  it("extrae candidatos sin certificar automáticamente el PDF", async () => {
    vi.mocked(pdfToText).mockResolvedValue(
      "Portada\fSe requiere ingeniero sanitario, experiencia general 5 años.\f"
    );
    const resultados = await extraerRequisitosPersonalPdf("doc-pliego-01", Buffer.from("%PDF"));
    expect(pdfToText).toHaveBeenCalled();
    expect(resultados).toHaveLength(1);
    expect(resultados[0].documentoId).toBe("doc-pliego-01");
    expect(resultados[0].pagina).toBe(2);
    expect(resultados[0].documentoOriginalVerificado).toBe(false);
  });

  it("propaga fallos de extracción sin inventar requisitos", async () => {
    vi.mocked(pdfToText).mockRejectedValue(new Error("PDF ilegible"));
    await expect(
      extraerRequisitosPersonalPdf("doc-pliego-02", Buffer.from("%PDF"))
    ).rejects.toThrow("PDF ilegible");
  });
});
