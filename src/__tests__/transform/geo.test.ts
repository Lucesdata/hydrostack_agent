import { describe, it, expect } from "vitest";
import { normalizeGeoText } from "@/src/lib/transform/geo";

describe("normalizeGeoText", () => {
  it("lowercases, strips accents and punctuation", () => {
    expect(normalizeGeoText("Distrito Capital de Bogotá")).toBe("distrito capital de bogota");
    expect(normalizeGeoText("Bogotá D.C.")).toBe("bogota d c");
  });

  it("collapses whitespace", () => {
    expect(normalizeGeoText("  Valle   del   Cauca ")).toBe("valle del cauca");
  });

  it("maps sentinels and empties to null", () => {
    expect(normalizeGeoText("No Definido")).toBeNull();
    expect(normalizeGeoText("")).toBeNull();
    expect(normalizeGeoText(null)).toBeNull();
  });
});
