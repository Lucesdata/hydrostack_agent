import { describe, expect, it } from "vitest";
import { datasetJsonLd } from "@/src/lib/landing/dataset-jsonld";
import { TIPOS_PROYECTO, TIPO_PROYECTO } from "@/src/lib/classify/tipo-proyecto";

describe("Dataset de la portada", () => {
  const d = datasetJsonLd("https://aqualicita.com/");

  it("tiene lo que Google Dataset Search exige: nombre y descripción de 50 a 5.000 caracteres", () => {
    expect(d["@type"]).toBe("Dataset");
    expect(d.name.length).toBeGreaterThan(0);
    expect(d.description.length).toBeGreaterThanOrEqual(50);
    expect(d.description.length).toBeLessThanOrEqual(5000);
  });

  it("nombra los tipos de obra desde TIPOS_PROYECTO, no escritos a mano", () => {
    for (const t of TIPOS_PROYECTO) expect(d.description).toContain(TIPO_PROYECTO[t].label);
  });

  it("enlaza la vitrina y los conjuntos de origen en datos.gov.co", () => {
    expect(d.url).toBe("https://aqualicita.com/licitaciones");
    expect(d.isBasedOn.map((o) => o.url)).toEqual([
      "https://www.datos.gov.co/d/p6dx-8zbt",
      "https://www.datos.gov.co/d/jbjy-vk9h",
    ]);
  });

  it("no declara licencia ni descarga que no existen, ni cifras que envejecen", () => {
    expect(d).not.toHaveProperty("license");
    expect(d).not.toHaveProperty("distribution");
    expect(JSON.stringify(d)).not.toMatch(/\d{1,3}\.\d{3}/);
  });
});
