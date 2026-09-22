import { describe, it, expect } from "vitest";
import {
  PESTANAS_VITRINA,
  POR_PAGINA_VITRINA,
  paginaValida,
  rutaVitrina,
} from "@/src/lib/secop/vitrina";

describe("las pestañas", () => {
  it("son dos: «Cierran pronto» se cayó con la decisión A", () => {
    expect([...PESTANAS_VITRINA]).toEqual(["abiertos", "adjudicados"]);
  });

  it("la rejilla es de 9, que es la decisión D5 del spec", () => {
    expect(POR_PAGINA_VITRINA).toBe(9);
  });
});

describe("la página viene del camino, no de un query string", () => {
  it("acepta enteros mayores que 1", () => {
    expect(paginaValida("2")).toBe(2);
    expect(paginaValida("137")).toBe(137);
  });

  it("rechaza la página 1: su ruta canónica es la base, sin sufijo", () => {
    expect(paginaValida("1")).toBeNull();
  });

  it("rechaza lo que no es un entero positivo", () => {
    expect(paginaValida("0")).toBeNull();
    expect(paginaValida("-3")).toBeNull();
    expect(paginaValida("2.5")).toBeNull();
    expect(paginaValida("abc")).toBeNull();
    expect(paginaValida("")).toBeNull();
    expect(paginaValida("02")).toBeNull();
  });

  it("rechaza números que desbordarían el OFFSET de Postgres", () => {
    // Sin tope, esto pasaba la regex, el OFFSET reventaba el bigint y el
    // usuario veía error.tsx («No pudimos cargar las fichas») donde tocaba 404.
    expect(paginaValida("2000000000000000000")).toBeNull();
    expect(paginaValida("1000001")).toBeNull();
  });

  it("acepta el tope y lo que queda justo por debajo", () => {
    expect(paginaValida("1000000")).toBe(1000000);
    expect(paginaValida("999999")).toBe(999999);
  });
});

describe("las rutas", () => {
  it("la primera página de abiertos es /licitaciones a secas", () => {
    expect(rutaVitrina("abiertos", 1)).toBe("/licitaciones");
  });

  it("las demás cuelgan del camino", () => {
    expect(rutaVitrina("abiertos", 3)).toBe("/licitaciones/pagina/3");
    expect(rutaVitrina("adjudicados", 1)).toBe("/licitaciones/adjudicados");
    expect(rutaVitrina("adjudicados", 2)).toBe("/licitaciones/adjudicados/pagina/2");
  });
});
