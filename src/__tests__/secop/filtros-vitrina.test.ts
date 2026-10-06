import { describe, it, expect } from "vitest";
import {
  SIN_FILTROS,
  desdeExplorar,
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
      actividad: null,
      numero: null,
      departamento: "antioquia",
      presupuestoMin: 500,
      orden: "valor",
      etapa: null,
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
      actividad: null,
      numero: null,
      departamento: "boyaca",
      presupuestoMin: 100 as const,
      orden: "recientes" as const,
      etapa: null,
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

describe("los criterios del buscador guiado en la vitrina (2026-10-05)", () => {
  it("el tipo admite los sistemas agrupados y la actividad; lo inventado se ignora", () => {
    const { filtros } = filtrosDesdeParams(
      new URLSearchParams("tipo=potable&actividad=consultoria")
    );
    expect(filtros).toMatchObject({ tipo: "potable", actividad: "consultoria" });
    expect(
      filtrosDesdeParams(new URLSearchParams("tipo=inventado&actividad=hack")).filtros
    ).toMatchObject({ tipo: null, actividad: null });
  });

  it("el número se recorta a 120 caracteres y cuenta como filtro", () => {
    const { filtros } = filtrosDesdeParams({ numero: `  CO1.REQ.42  ` });
    expect(filtros.numero).toBe("CO1.REQ.42");
    expect(hayFiltros(filtros)).toBe(true);
    expect(filtrosDesdeParams({ numero: "x".repeat(200) }).filtros.numero).toHaveLength(120);
  });

  it("ida y vuelta con sistema, actividad y número", () => {
    const f = {
      ...SIN_FILTROS,
      tipo: "residual" as const,
      actividad: "muestreo" as const,
      numero: "OBR-081-2023",
    };
    const q = queryDeFiltros(f);
    expect(q).toBe("?numero=OBR-081-2023&tipo=residual&actividad=muestreo");
    expect(filtrosDesdeParams(new URLSearchParams(q.slice(1))).filtros).toEqual(f);
  });
});

describe("los enlaces viejos de /licitaciones/explorar", () => {
  it("traduce sistema, actividad, texto, departamento, valor y orden", () => {
    expect(
      desdeExplorar(
        new URLSearchParams(
          "modo=tema&sistema=ptar&actividad=consultoria&q=planta&departamento=Valle del Cauca&valorMin=750000000&orden=fecha&apertura=Abierto&page=3&pageSize=25"
        )
      )
    ).toEqual({
      ...SIN_FILTROS,
      q: "planta",
      tipo: "ptar",
      actividad: "consultoria",
      departamento: "valle-del-cauca",
      presupuestoMin: 500,
      orden: "recientes",
    });
  });

  it("el número pasa tal cual; lo desconocido se descarta", () => {
    expect(desdeExplorar({ modo: "numero", numero: "CO1.REQ.42" })).toEqual({
      ...SIN_FILTROS,
      numero: "CO1.REQ.42",
    });
    expect(desdeExplorar({ sistema: "inventado", valorMin: "5", orden: "x" })).toEqual(SIN_FILTROS);
  });
});

describe("el filtro de etapa (2026-10-05)", () => {
  it("apagado por defecto; solo acepta las tres etapas con contrato", () => {
    expect(filtrosDesdeParams({}).filtros.etapa ?? null).toBeNull();
    expect(filtrosDesdeParams({ etapa: "en_ejecucion" }).filtros.etapa).toBe("en_ejecucion");
    expect(filtrosDesdeParams({ etapa: "plazo_cumplido" }).filtros.etapa).toBe("plazo_cumplido");
    expect(filtrosDesdeParams({ etapa: "recibe_ofertas" }).filtros.etapa).toBeNull();
    expect(filtrosDesdeParams({ etapa: "terminado" }).filtros.etapa).toBeNull();
  });

  it("cuenta como filtro (página noindex) y viaja en la URL", () => {
    const { filtros } = filtrosDesdeParams({ etapa: "en_ejecucion" });
    expect(hayFiltros(filtros)).toBe(true);
    expect(queryDeFiltros(filtros)).toBe("?etapa=en_ejecucion");
    expect(filtrosDesdeParams(new URLSearchParams("etapa=en_ejecucion")).filtros).toEqual(filtros);
  });
});
