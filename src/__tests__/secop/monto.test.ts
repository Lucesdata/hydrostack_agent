import { describe, it, expect } from "vitest";
import { montoConDato, tieneMonto } from "@/src/lib/secop/monto";

describe("montoConDato (el 0 del SECOP es 'sin dato')", () => {
  it("un monto positivo pasa tal cual", () => {
    expect(montoConDato(500_000_000)).toBe(500_000_000);
  });

  it("null y undefined son sin dato", () => {
    expect(montoConDato(null)).toBeNull();
    expect(montoConDato(undefined)).toBeNull();
  });

  it("0 es sin dato: el SECOP lo escribe en vez de NULL", () => {
    expect(montoConDato(0)).toBeNull();
  });

  it("un negativo es sin dato", () => {
    expect(montoConDato(-1)).toBeNull();
  });

  it("acepta el string que llega de la columna numeric de Postgres", () => {
    expect(montoConDato("500000000")).toBe(500_000_000);
    expect(montoConDato("500000000.00")).toBe(500_000_000);
    expect(montoConDato("0")).toBeNull();
    expect(montoConDato("0.00")).toBeNull();
  });

  it("un string vacío o no numérico es sin dato, nunca NaN", () => {
    expect(montoConDato("")).toBeNull();
    expect(montoConDato("   ")).toBeNull();
    expect(montoConDato("No definido")).toBeNull();
    expect(montoConDato(Number.NaN)).toBeNull();
    expect(montoConDato(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("tieneMonto", () => {
  it("es el predicado del mismo criterio", () => {
    expect(tieneMonto(1)).toBe(true);
    expect(tieneMonto("0.00")).toBe(false);
    expect(tieneMonto(null)).toBe(false);
  });
});
