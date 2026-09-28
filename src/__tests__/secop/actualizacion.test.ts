import { describe, expect, it } from "vitest";
import { formatFechaCorta } from "@/src/lib/secop/actualizacion";

describe("formatFechaCorta", () => {
  it("día, mes corto y año, sin «de» ni «sept.»", () => {
    expect(formatFechaCorta(new Date("2026-09-26T15:00:00Z"))).toBe("26 sep 2026");
    expect(formatFechaCorta(new Date("2026-01-05T12:00:00Z"))).toBe("5 ene 2026");
  });

  it("en hora de Colombia: las 2 a. m. UTC todavía son el día anterior", () => {
    expect(formatFechaCorta(new Date("2026-09-27T02:00:00Z"))).toBe("26 sep 2026");
  });

  it("sin fecha, o con una inválida, no devuelve nada que pintar", () => {
    expect(formatFechaCorta(null)).toBeNull();
    expect(formatFechaCorta(new Date("no es fecha"))).toBeNull();
  });
});
