import { describe, it, expect } from "vitest";
import {
  SIN_FILTROS,
  filtrosDesdeParams,
  hayFiltros,
  patronIlike,
  queryDeFiltros,
} from "@/src/lib/secop/filtros-vitrina";
import { rutaVitrina } from "@/src/lib/secop/vitrina";

describe("los filtros salen de la URL", () => {
  it("sin nada, son los de por defecto y la página 1", () => {
    expect(filtrosDesdeParams({})).toEqual({ filtros: SIN_FILTROS, pagina: 1 });
  });

  it("lee los cinco filtros y la página", () => {
    const { filtros, pagina } = filtrosDesdeParams(
      new URLSearchParams(
        "q=  PTAR  &tipo=ptar&departamento=antioquia&presupuesto=500&orden=valor&pagina=3"
      )
    );
    expect(filtros).toEqual({
      q: "PTAR",
      tipo: "ptar",
      departamento: "antioquia",
      presupuestoMin: 500,
      orden: "valor",
    });
    expect(pagina).toBe(3);
  });

  it("ignora lo que no reconoce en vez de fallar", () => {
    const { filtros, pagina } = filtrosDesdeParams({
      tipo: "riego",
      departamento: "Antioquia; drop",
      presupuesto: "5",
      orden: "azar",
      pagina: "0",
    });
    expect(filtros).toEqual(SIN_FILTROS);
    expect(pagina).toBe(1);
  });

  it("un formulario enviado con campos vacíos no filtra", () => {
    const { filtros } = filtrosDesdeParams(
      new URLSearchParams("q=&tipo=&departamento=&presupuesto=&orden=relevancia")
    );
    expect(hayFiltros(filtros)).toBe(false);
  });

  it("recorta la búsqueda a 120 caracteres", () => {
    expect(filtrosDesdeParams({ q: "a".repeat(300) }).filtros.q).toHaveLength(120);
  });

  it("toma el primer valor si un parámetro viene repetido", () => {
    expect(filtrosDesdeParams({ tipo: ["ptap", "ptar"] }).filtros.tipo).toBe("ptap");
  });
});

describe("la URL de unos filtros", () => {
  it("solo escribe lo que difiere del defecto, en orden fijo", () => {
    expect(queryDeFiltros(SIN_FILTROS)).toBe("");
    expect(queryDeFiltros({ ...SIN_FILTROS, orden: "valor", tipo: "ptar" }, 2)).toBe(
      "?tipo=ptar&orden=valor&pagina=2"
    );
  });

  it("ida y vuelta: leer lo escrito da los mismos filtros", () => {
    const f = {
      q: "Covarachía",
      tipo: "acueducto" as const,
      departamento: "boyaca",
      presupuestoMin: 100 as const,
      orden: "recientes" as const,
    };
    expect(filtrosDesdeParams(new URLSearchParams(queryDeFiltros(f, 4).slice(1)))).toEqual({
      filtros: f,
      pagina: 4,
    });
  });
});

describe("las rutas con filtros", () => {
  it("sin filtros, la página sigue en el camino (rutas ISR)", () => {
    expect(rutaVitrina("abiertos", 3, SIN_FILTROS)).toBe("/licitaciones/pagina/3");
  });

  it("con filtros, la página va en la query de la base", () => {
    const f = { ...SIN_FILTROS, tipo: "ptar" as const };
    expect(rutaVitrina("abiertos", 1, f)).toBe("/licitaciones?tipo=ptar");
    expect(rutaVitrina("abiertos", 3, f)).toBe("/licitaciones?tipo=ptar&pagina=3");
  });

  it("los adjudicados no llevan filtros", () => {
    expect(rutaVitrina("adjudicados", 2, { ...SIN_FILTROS, tipo: "ptar" })).toBe(
      "/licitaciones/adjudicados/pagina/2"
    );
  });
});

describe("el patrón de búsqueda", () => {
  it("escapa los comodines del usuario", () => {
    expect(patronIlike("100%_a\\b")).toBe("%100\\%\\_a\\\\b%");
  });
});
