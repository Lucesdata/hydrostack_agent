import { describe, it, expect } from "vitest";
import { isValidPerfil } from "@/src/lib/oferente/validate";

const perfilValido = {
  id: "oferente-1",
  sectoresUnspsc: ["83101"],
  cobertura: { departamentos: ["76"], municipios: [] },
  cuantiaObjetivo: { minCop: 0, maxCop: 0 },
};

describe("isValidPerfil", () => {
  it("acepta un perfil con el shape mínimo esperado", () => {
    expect(isValidPerfil(perfilValido)).toBe(true);
  });

  it("rechaza null", () => {
    expect(isValidPerfil(null)).toBe(false);
  });

  it("rechaza un objeto sin id", () => {
    const { id, ...sinId } = perfilValido;
    expect(isValidPerfil(sinId)).toBe(false);
  });

  it("rechaza sectoresUnspsc que no sea array", () => {
    expect(isValidPerfil({ ...perfilValido, sectoresUnspsc: "83101" })).toBe(false);
  });

  it("rechaza un objeto sin cobertura", () => {
    const { cobertura, ...sinCobertura } = perfilValido;
    expect(isValidPerfil(sinCobertura)).toBe(false);
  });

  it("rechaza un objeto sin cuantiaObjetivo", () => {
    const { cuantiaObjetivo, ...sinCuantia } = perfilValido;
    expect(isValidPerfil(sinCuantia)).toBe(false);
  });
});
