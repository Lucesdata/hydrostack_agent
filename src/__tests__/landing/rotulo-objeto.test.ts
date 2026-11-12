import { describe, expect, it } from "vitest";
import { esCodigo, rotuloDeObjeto } from "@/src/components/landing/texto";

/**
 * Algunas entidades publican como «objeto» una referencia suelta
 * («AHCMAIN08-026», visto en producción el 2026-11-12). El hero no la presenta
 * como si fuera el nombre de la obra.
 */
describe("objeto que es solo un código", () => {
  it("detecta referencias sueltas y deja pasar descripciones", () => {
    for (const c of ["AHCMAIN08-026", "Ahcmain08-026", "LP-019-2026", "CD0012026"]) {
      expect(esCodigo(c), c).toBe(true);
    }
    for (const d of [
      "Construcción de la PTAR de Prueba",
      "OPTIMIZACIÓN DEL ACUEDUCTO",
      "Acueducto",
      "Mantenimiento 2026",
      "",
      null,
    ]) {
      expect(esCodigo(d as string), String(d)).toBe(false);
    }
  });

  it("un código se rotula «Proceso CÓDIGO»; una descripción, como frase", () => {
    expect(rotuloDeObjeto("Ahcmain08-026")).toBe("Proceso AHCMAIN08-026");
    expect(rotuloDeObjeto("CONSTRUCCIÓN DE LA PTAR")).toBe("Construcción de la PTAR");
    expect(rotuloDeObjeto("Obra de prueba")).toBe("Obra de prueba");
    expect(rotuloDeObjeto(null as unknown as string)).toBeNull();
  });
});
