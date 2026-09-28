import { describe, expect, it } from "vitest";
import { esCodigoDepartamento } from "@/src/lib/secop/resumen-departamento";

describe("esCodigoDepartamento", () => {
  it("acepta dos dígitos y nada más", () => {
    expect(esCodigoDepartamento("05")).toBe(true);
    expect(esCodigoDepartamento("5")).toBe(false);
    expect(esCodigoDepartamento("050")).toBe(false);
    expect(esCodigoDepartamento("05' or 1=1")).toBe(false);
    expect(esCodigoDepartamento(undefined)).toBe(false);
  });
});
