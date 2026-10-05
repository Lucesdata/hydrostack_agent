import { describe, expect, it } from "vitest";
import { parseQuery } from "@/src/lib/secop/parse-query";
import { patronDeActividad, tiposDeSistema } from "@/src/lib/secop/busqueda-guiada";

const parse = (params: Record<string, string>) => parseQuery(new URLSearchParams(params));

describe("consulta del buscador guiado", () => {
  it("conserva sistema y actividad como filtros combinables", () => {
    expect(parse({ modo: "tema", sistema: "ptar", actividad: "consultoria" })).toMatchObject({
      modo: "tema",
      sistema: "ptar",
      actividad: "consultoria",
      soloAgua: false,
    });
  });

  it("permite todas las actividades sin seleccionar un sistema", () => {
    expect(parse({ actividad: "muestreo" })).toMatchObject({
      modo: "tema",
      actividad: "muestreo",
      soloAgua: false,
    });
  });

  it("recupera un número con espacios exteriores sin limitarlo a abiertos", () => {
    expect(parse({ modo: "numero", numero: "  co1.req.42  ", apertura: "Abierto" })).toMatchObject({
      modo: "numero",
      numero: "co1.req.42",
      apertura: undefined,
      soloAgua: false,
    });
  });

  it("infiere el modo número cuando solo recibe la referencia", () => {
    expect(parse({ numero: "OBR-081-2023" })).toMatchObject({
      modo: "numero",
      numero: "OBR-081-2023",
    });
  });

  it("todos/todas se representan sin filtros de sistema ni actividad", () => {
    const query = parse({ modo: "tema", sistema: "", actividad: "" });
    expect(query).toMatchObject({ modo: "tema", sistema: undefined, actividad: undefined });
  });

  it.each([
    { modo: "" },
    { modo: "desconocido" },
    { modo: "tema", sistema: "inventado" },
    { modo: "tema", sistema: "otros" },
    { modo: "tema", actividad: "inventada" },
    { modo: "numero" },
    { modo: "numero", numero: "  " },
    { modo: "numero", numero: "x".repeat(121) },
    { modo: "numero", numero: "R42", sistema: "ptar" },
    { modo: "numero", numero: "R42", actividad: "obras" },
    { modo: "numero", numero: "R42", q: "agua" },
    { modo: "tema", numero: "R42" },
    { modo: "tema", q: "x".repeat(121) },
    { modo: "tema", page: "NaN" },
    { modo: "tema", page: "0" },
    { modo: "tema", page: "1.5" },
    { modo: "tema", pageSize: "-1" },
    { modo: "tema", valorMin: "NaN" },
    { modo: "tema", desde: "2026-02-30" },
    { modo: "tema", desde: "2026-13-01" },
    { modo: "tema", apertura: "abiertto" },
    { modo: "tema", orden: "inventado" },
  ])("rechaza criterios guiados inválidos: %j", (params) => {
    expect(() => parse(params as Record<string, string>)).toThrow();
  });

  it("agrupa los sistemas potable y residual sin crear tipos nuevos", () => {
    expect(tiposDeSistema("potable")).toEqual(["acueducto", "ptap"]);
    expect(tiposDeSistema("residual")).toEqual(["alcantarillado", "ptar"]);
    expect(tiposDeSistema("ptar")).toEqual(["ptar"]);
  });

  it("las raíces de operación no coinciden con cooperación", () => {
    const patron = new RegExp(patronDeActividad("operacion"));
    expect(patron.test("operacion de la planta")).toBe(true);
    expect(patron.test("cooperacion institucional")).toBe(false);
  });

  it("acepta el límite de longitud para número", () => {
    expect(parse({ modo: "numero", numero: "x".repeat(120) })).toMatchObject({
      modo: "numero",
      numero: "x".repeat(120),
    });
  });

  it("mantiene las consultas antiguas sin activar un modo nuevo", () => {
    expect(parse({ q: "agua", apertura: "Abierto" })).toMatchObject({
      q: "agua",
      apertura: "Abierto",
      soloAgua: true,
    });
    expect(parse({ q: "agua" })).not.toHaveProperty("modo");
  });
});
