import { describe, expect, it } from "vitest";
import {
  parametrosDesdeUrl,
  hrefExplorador,
  patronDeTecnologia,
  POR_PAGINA_EXPLORADOR,
} from "@/src/lib/comercial/explorador-params";

describe("parametrosDesdeUrl", () => {
  it("por defecto: convocatorias, sin filtros, página 1", () => {
    expect(parametrosDesdeUrl({})).toEqual({
      etapa: "convocatoria",
      tecnologia: null,
      tipo: null,
      departamento: null,
      pagina: 1,
    });
  });

  it("acepta valores válidos", () => {
    expect(
      parametrosDesdeUrl({
        etapa: "ejecucion",
        tecnologia: "BOM.SUM",
        tipo: "ptar",
        departamento: "76",
        pagina: "3",
      })
    ).toEqual({
      etapa: "ejecucion",
      tecnologia: "BOM.SUM",
      tipo: "ptar",
      departamento: "76",
      pagina: 3,
    });
  });

  it("acepta las familias de sistema como tipo", () => {
    expect(parametrosDesdeUrl({ tipo: "potable" }).tipo).toBe("potable");
    expect(parametrosDesdeUrl({ tipo: "redes" }).tipo).toBe("redes");
  });

  it("descarta lo inválido en vez de fallar o pasarlo a la consulta", () => {
    const p = parametrosDesdeUrl({
      etapa: "histórico",
      tecnologia: "XXX'; drop table proceso; --",
      tipo: "marte",
      departamento: "7",
      pagina: "-4",
    });
    expect(p).toEqual({
      etapa: "convocatoria",
      tecnologia: null,
      tipo: null,
      departamento: null,
      pagina: 1,
    });
  });

  it("toma el primer valor si el parámetro viene repetido y acota la página", () => {
    expect(parametrosDesdeUrl({ tecnologia: ["INS", "BOM"] }).tecnologia).toBe("INS");
    expect(parametrosDesdeUrl({ pagina: "999999" }).pagina).toBe(1000);
    expect(parametrosDesdeUrl({ pagina: "2.5" }).pagina).toBe(1);
  });
});

describe("hrefExplorador", () => {
  it("omite lo que es el valor por defecto y codifica el resto", () => {
    const base = parametrosDesdeUrl({});
    expect(hrefExplorador(base, 1)).toBe("/comercial/explorar");
    expect(hrefExplorador({ ...base, etapa: "ejecucion", tecnologia: "BOM.SUM" }, 2)).toBe(
      "/comercial/explorar?etapa=ejecucion&tecnologia=BOM.SUM&pagina=2"
    );
  });
});

describe("patronDeTecnologia", () => {
  it("una categoría padre incluye a sus hijas; una hija, solo lo suyo", () => {
    const padre = patronDeTecnologia("BOM") ?? "";
    expect(padre).toContain("bomba sumergible");
    expect(padre).toContain("estacion de bombeo");
    const hija = patronDeTecnologia("BOM.SUM") ?? "";
    expect(hija).toContain("bomba sumergible");
    expect(hija).not.toContain("estacion de bombeo");
  });

  it("escapa los metacaracteres de regex y no admite códigos desconocidos", () => {
    expect(patronDeTecnologia("NO_EXISTE")).toBeNull();
    const p = patronDeTecnologia("OYM") ?? "";
    expect(p).toContain("o&m"); // & no es metacaracter
    expect(() => new RegExp(p)).not.toThrow();
  });

  it("el patrón respeta límites de palabra (no «bomberos») y el plural simple", () => {
    const re = new RegExp(patronDeTecnologia("BOM.SUM") ?? "");
    expect(re.test("suministro de bombas sumergibles")).toBe(true);
    expect(re.test("cuerpo de bomberos")).toBe(false);
  });
});

describe("constantes", () => {
  it("20 por página", () => expect(POR_PAGINA_EXPLORADOR).toBe(20));
});
