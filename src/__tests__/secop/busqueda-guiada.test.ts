import { describe, expect, it } from "vitest";
import {
  esActividad,
  esSistema,
  patronDeActividad,
  tiposDeSistema,
} from "@/src/lib/secop/busqueda-guiada";

/** Los criterios del buscador guiado que la vitrina absorbió el 2026-10-05. */
describe("criterios del buscador guiado", () => {
  it("agrupa los sistemas potable y residual sin crear tipos nuevos", () => {
    expect(tiposDeSistema("potable")).toEqual(["acueducto", "ptap"]);
    expect(tiposDeSistema("residual")).toEqual(["alcantarillado", "ptar"]);
    expect(tiposDeSistema("ptar")).toEqual(["ptar"]);
  });

  it("reconoce sistemas y actividades, y nada más", () => {
    expect(["potable", "residual", "acueducto", "otros"].every(esSistema)).toBe(true);
    expect(esSistema("inventado")).toBe(false);
    expect(esActividad("muestreo")).toBe(true);
    expect(esActividad("inventada")).toBe(false);
  });

  it("las raíces de operación no coinciden con cooperación", () => {
    const patron = new RegExp(patronDeActividad("operacion"));
    expect(patron.test("operacion de la planta")).toBe(true);
    expect(patron.test("cooperacion institucional")).toBe(false);
  });

  it("una actividad desconocida no produce patrón", () => {
    expect(() => patronDeActividad("hack" as never)).toThrow();
  });
});
