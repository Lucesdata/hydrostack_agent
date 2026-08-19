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

  it("rechaza undefined", () => {
    expect(isValidPerfil(undefined)).toBe(false);
  });

  it("rechaza una cadena", () => {
    expect(isValidPerfil("x")).toBe(false);
  });

  it("rechaza un número", () => {
    expect(isValidPerfil(42)).toBe(false);
  });

  it("rechaza un array", () => {
    expect(isValidPerfil([])).toBe(false);
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

  it("rechaza cobertura vacía (sin departamentos/municipios)", () => {
    expect(isValidPerfil({ ...perfilValido, cobertura: {} })).toBe(false);
  });

  it("rechaza cobertura con departamentos que no sea array", () => {
    expect(
      isValidPerfil({
        ...perfilValido,
        cobertura: { departamentos: "not-an-array", municipios: [] },
      })
    ).toBe(false);
  });

  it("rechaza cobertura con municipios que no sea array", () => {
    expect(
      isValidPerfil({
        ...perfilValido,
        cobertura: { departamentos: ["76"], municipios: "not-an-array" },
      })
    ).toBe(false);
  });

  it("rechaza un objeto sin cuantiaObjetivo", () => {
    const { cuantiaObjetivo, ...sinCuantia } = perfilValido;
    expect(isValidPerfil(sinCuantia)).toBe(false);
  });

  it("rechaza cuantiaObjetivo vacía (sin minCop/maxCop)", () => {
    expect(isValidPerfil({ ...perfilValido, cuantiaObjetivo: {} })).toBe(false);
  });

  it("rechaza cuantiaObjetivo con minCop que no sea número", () => {
    expect(
      isValidPerfil({
        ...perfilValido,
        cuantiaObjetivo: { minCop: "100", maxCop: 200 },
      })
    ).toBe(false);
  });

  it("rechaza cuantiaObjetivo con maxCop que no sea número", () => {
    expect(
      isValidPerfil({
        ...perfilValido,
        cuantiaObjetivo: { minCop: 100, maxCop: "200" },
      })
    ).toBe(false);
  });
});
