import { describe, it, expect } from "vitest";
import { isPerfilCompleto, type PerfilMinimo } from "@/src/lib/oferente/perfil-minimo";
import type { OferenteProfile } from "@/src/lib/oferente/types";

const minimo: PerfilMinimo = {
  id: "u1",
  sectoresUnspsc: ["83101"],
  cobertura: { departamentos: ["76"], municipios: [] },
};

const completo: OferenteProfile = {
  id: "u1",
  tipoPersona: "juridica",
  sectoresUnspsc: ["83101"],
  capacidadFinanciera: {
    capitalTrabajoCop: 0,
    indiceLiquidez: 0,
    indiceEndeudamiento: 0,
    razonCoberturaIntereses: 0,
    fuente: "manual",
    vigenciaHasta: null,
  },
  kCapacidadResidualCop: null,
  cobertura: { departamentos: ["76"], municipios: [] },
  cuantiaObjetivo: { minCop: 0, maxCop: 0 },
};

describe("isPerfilCompleto", () => {
  it("es false para un perfil mínimo (sin cuantiaObjetivo)", () => {
    expect(isPerfilCompleto(minimo)).toBe(false);
  });

  it("es true para un OferenteProfile completo", () => {
    expect(isPerfilCompleto(completo)).toBe(true);
  });
});
