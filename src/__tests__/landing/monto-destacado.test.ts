/**
 * La card "Mayor cuantía · sector agua" del landing.
 *
 * `formatCopMilM` es la única variante de moneda que no vive en
 * `components/secop/format.ts` (corta en "mil M", que solo el landing
 * necesita), así que también es la única que se quedaba fuera de la regla del
 * cero. Se exporta para poder medirla aquí sin montar el componente.
 */

import { describe, it, expect } from "vitest";
import { formatCopMilM } from "@/src/components/landing/LandingCards";

describe("formatCopMilM", () => {
  it("precioBase 0 → '—': SECOP no publicó la cuantía", () => {
    expect(formatCopMilM(0)).toBe("—");
  });

  it("sin dato → '—', igual que formatCopFull y formatCopCompact", () => {
    expect(formatCopMilM(null)).toBe("—");
  });

  it("por debajo de mil millones delega en la forma compacta", () => {
    expect(formatCopMilM(900_000_000)).toBe("$900 M");
  });

  it("a partir de mil millones corta en 'mil M' con un decimal", () => {
    expect(formatCopMilM(2_450_000_000)).toBe("$2,5 mil M");
  });
});
