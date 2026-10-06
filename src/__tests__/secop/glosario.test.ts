import { describe, expect, it } from "vitest";
import {
  GLOSARIO,
  TERMINOS,
  terminosDeFicha,
  type ContextoGlosario,
} from "@/src/lib/secop/glosario";

const base: ContextoGlosario = {
  modalidad: "Licitación pública",
  tieneUnspsc: false,
  tieneNit: false,
  conPliego: false,
  adjudicado: false,
  conAdicion: false,
  conProrroga: false,
};
const nombres = (c: ContextoGlosario) => terminosDeFicha(c).map((d) => d.termino);

describe("glosario", () => {
  it("explica el RUP y las capacidades cuando la guía pública las nombra", () => {
    const n = nombres({ ...base, conRequisitosGenerales: true });
    expect(n).toContain("RUP");
    expect(n).toContain("Capacidad financiera");
    expect(n).toContain("Capacidad organizacional");
  });
  it("cada término tiene una definición de una línea, sin punto suspensivo ni promesa", () => {
    for (const t of TERMINOS) {
      const d = GLOSARIO[t];
      expect(d.termino.trim(), t).not.toBe("");
      expect(d.definicion, t).not.toMatch(/\n/);
      expect(d.definicion.length, t).toBeLessThanOrEqual(220);
      expect(d.definicion, t).toMatch(/\.$/);
    }
  });

  it("solo las palabras que la ficha usa: sin régimen especial, UNSPSC ni contrato, no salen", () => {
    const n = nombres(base);
    expect(n).toContain("Pliego de condiciones");
    expect(n).toContain("Presupuesto oficial");
    expect(n).not.toContain("Régimen especial");
    expect(n).not.toContain("Código UNSPSC");
    expect(n).not.toContain("Adición");
    expect(n).not.toContain("Experiencia específica");
  });

  it("aparecen cuando la ficha los muestra", () => {
    const n = nombres({
      ...base,
      modalidad: "Contratación régimen especial",
      tieneUnspsc: true,
      tieneNit: true,
      conPliego: true,
      adjudicado: true,
      conAdicion: true,
      conProrroga: true,
    });
    for (const t of [
      "Régimen especial",
      "Código UNSPSC",
      "NIT",
      "Experiencia específica",
      "Capacidad financiera",
      "Adjudicación",
      "Adición",
      "Prórroga",
    ]) {
      expect(n, t).toContain(t);
    }
    expect(new Set(n).size).toBe(n.length);
  });
});
