import { describe, expect, it } from "vitest";
import { mesDelInforme } from "@/src/lib/secop/informe";

describe("mesDelInforme", () => {
  it("es el último mes completo", () => {
    expect(mesDelInforme(new Date("2026-09-26T18:00:00Z"))).toEqual({
      desde: "2026-08-01",
      hasta: "2026-09-01",
      etiqueta: "agosto de 2026",
    });
  });

  it("en enero, el informe es el de diciembre del año anterior", () => {
    expect(mesDelInforme(new Date("2027-01-15T12:00:00Z"))).toEqual({
      desde: "2026-12-01",
      hasta: "2027-01-01",
      etiqueta: "diciembre de 2026",
    });
  });

  it("cuenta la hora de Colombia: el 1 de octubre a las 03:00 UTC aún es 30 de septiembre", () => {
    // 03:00 UTC = 22:00 del 30 de septiembre en Bogotá: el mes completo es agosto.
    expect(mesDelInforme(new Date("2026-10-01T03:00:00Z")).etiqueta).toBe("agosto de 2026");
    // 06:00 UTC = 01:00 del 1 de octubre en Bogotá: ya es septiembre.
    expect(mesDelInforme(new Date("2026-10-01T06:00:00Z")).etiqueta).toBe("septiembre de 2026");
  });
});
