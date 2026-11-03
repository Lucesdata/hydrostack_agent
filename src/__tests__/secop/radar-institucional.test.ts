import { describe, expect, it } from "vitest";
import { periodoAnterior } from "@/src/lib/secop/radar-institucional";
import { idDesdeSlug, slugDeProceso } from "@/src/lib/secop/slug";

describe("periodoAnterior", () => {
  it("devuelve el mes cerrado anterior en hora de Colombia", () => {
    expect(periodoAnterior(new Date("2026-11-03T15:00:00Z"))).toMatchObject({ anio: 2026, mes: 10 });
    // 1 de enero 02:00 UTC sigue siendo 31 de diciembre en Colombia: el mes cerrado es noviembre.
    expect(periodoAnterior(new Date("2027-01-01T02:00:00Z"))).toMatchObject({ anio: 2026, mes: 11 });
    expect(periodoAnterior(new Date("2026-03-03T12:00:00Z"))).toMatchObject({ anio: 2026, mes: 2 });
  });
});

describe("enlace a la ficha de un proceso", () => {
  it("el slug que arma el radar lo resuelve la ruta real", () => {
    const slug = slugDeProceso("Construcción de alcantarillado en Oporapa", "CO1.REQ.11133727");
    expect(idDesdeSlug(slug)).toBe("CO1.REQ.11133727");
  });
});
