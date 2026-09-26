/**
 * `montoConDato` — en SECOP un 0 no es un precio, es un hueco.
 *
 * Medido el 2026-09-19: `proceso.valor_estimado = 0` en 9.436 filas, 9.163 de
 * ellas todavía abiertas. Pintar "$ 0" afirma un presupuesto que la entidad
 * nunca publicó; la regla es tratar el 0 como ausencia y mostrar "—".
 *
 * La primitiva vive aparte de `components/secop/format.ts` porque no es
 * formato: es normalización del dato, y la necesitan tanto la UI como los
 * mapeadores de `lib/` y la plantilla del correo.
 */

import { describe, it, expect } from "vitest";
import { montoConDato } from "@/src/lib/secop/monto";

describe("montoConDato", () => {
  it("el 0 es ausencia de dato, no un precio", () => {
    expect(montoConDato(0)).toBeNull();
  });

  it("el numeric de Postgres llega como texto: '0.00' también es ausencia", () => {
    expect(montoConDato("0.00")).toBeNull();
  });

  it("un monto publicado pasa como número, venga de donde venga", () => {
    expect(montoConDato(1_500_000_000)).toBe(1_500_000_000);
    expect(montoConDato("1500000000.00")).toBe(1_500_000_000);
  });

  it("null y undefined siguen siendo ausencia", () => {
    expect(montoConDato(null)).toBeNull();
    expect(montoConDato(undefined)).toBeNull();
  });

  it("texto ilegible → null, nunca NaN", () => {
    expect(montoConDato("abc")).toBeNull();
    expect(montoConDato(Number.NaN)).toBeNull();
  });

  it("un negativo tampoco es un presupuesto", () => {
    // No se ha visto en la base, pero la regla es "hay cuantía publicada":
    // -1 no la hay, y dejarlo pasar pintaría "-$ 1".
    expect(montoConDato(-1)).toBeNull();
  });
});
