import { describe, expect, it } from "vitest";
import {
  DEPARTAMENTOS_DANE,
  metricasDesdeFila,
  oportunidadDesdeFila,
  regionesDesdeFilas,
  resolverDepartamento,
} from "@/src/lib/marketplace/adaptador";
import { opcionesTerritorio, destinosPorCodigo } from "@/src/lib/marketplace/territorios";
import { SIN_FILTROS } from "@/src/lib/secop/filtros-vitrina";
import type { ProcesoDeVitrina } from "@/src/lib/secop/vitrina";

function fila(p: Partial<ProcesoDeVitrina> = {}): ProcesoDeVitrina {
  return {
    id: "u1",
    secopProcesoId: "CO1.REQ.100",
    objeto: "Optimización de la PTAP municipal",
    entidadNombre: "Alcaldía de Buga",
    departamento: "Valle del Cauca",
    municipio: "Buga",
    valorEstimado: "1500000000.00",
    estadoActual: "Publicado",
    estadoApertura: "Abierto",
    fechaRecepcion: "2099-12-31",
    fechaPublicacion: "2026-11-01",
    tipoProyecto: "ptap",
    adjudicatario: null,
    valorAdjudicacion: null,
    fechaAdjudicacion: null,
    ...p,
  };
}

describe("oportunidadDesdeFila", () => {
  it("conserva la cuantía como decimal en texto y enlaza la ficha canónica", () => {
    const o = oportunidadDesdeFila(fila());
    expect(o.precioBaseCop).toBe("1500000000.00");
    expect(o.fichaHref).toMatch(/^\/licitaciones\/.+CO1\.REQ\.100$/i);
    expect(o.tipo).toBe("ptap");
  });

  it("el 0 de SECOP es un hueco, no un precio", () => {
    expect(oportunidadDesdeFila(fila({ valorEstimado: "0" })).precioBaseCop).toBeNull();
    expect(oportunidadDesdeFila(fila({ valorEstimado: "0.00" })).precioBaseCop).toBeNull();
    expect(oportunidadDesdeFila(fila({ valorEstimado: null })).precioBaseCop).toBeNull();
  });

  it("la referencia viene del extra y puede ser nula; las repetidas no mezclan ids", () => {
    const a = oportunidadDesdeFila(fila({ secopProcesoId: "CO1.REQ.1" }), {
      referencia: "LP-001",
      url: null,
      departamentoCodigo: "76",
    });
    const b = oportunidadDesdeFila(fila({ secopProcesoId: "CO1.REQ.2" }), {
      referencia: "LP-001",
      url: null,
      departamentoCodigo: "05",
    });
    expect(a.referencia).toBe(b.referencia);
    expect(a.id).not.toBe(b.id);
    expect(a.fichaHref).not.toBe(b.fichaHref);
    expect(oportunidadDesdeFila(fila()).referencia).toBeNull();
    expect(a.departamentoCodigo).toBe("76");
  });

  it("solo acepta enlaces SECOP II https del host oficial con detalle de oportunidad", () => {
    const ok =
      "https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.123&isFromPublicArea=True";
    const extra = (url: string | null) => ({ referencia: null, url, departamentoCodigo: null });
    expect(oportunidadDesdeFila(fila(), extra(ok)).secopHref).toBe(ok);
    expect(oportunidadDesdeFila(fila(), extra("http://community.secop.gov.co/x"))).toMatchObject({
      secopHref: null,
    });
    expect(
      oportunidadDesdeFila(
        fila(),
        extra("https://evil.example/OpportunityDetail/?noticeUID=CO1.NTC.1")
      ).secopHref
    ).toBeNull();
    expect(
      oportunidadDesdeFila(fila(), extra("https://community.secop.gov.co/STS/Users/Login/Index"))
        .secopHref
    ).toBeNull();
    expect(oportunidadDesdeFila(fila(), extra(null)).secopHref).toBeNull();
  });

  it("no expone proveedor ni documentos en el DTO público", () => {
    const o = oportunidadDesdeFila(fila({ adjudicatario: "ACME SAS", valorAdjudicacion: "5" }));
    expect(JSON.stringify(o)).not.toContain("ACME");
    expect(Object.keys(o)).not.toContain("adjudicatario");
  });
});

describe("metricasDesdeFila", () => {
  it("suma con cobertura y distingue 0 de no informado", () => {
    expect(
      metricasDesdeFila({ abiertas: 10, entidades: 4, valor: "2500.50", conValor: 7 })
    ).toEqual({
      abiertas: 10,
      entidades: 4,
      valorEstimadoCop: "2500.50",
      procesosConValor: 7,
    });
    // Ningún proceso publica precio: la suma no es «$0», es «no informado».
    expect(
      metricasDesdeFila({ abiertas: 3, entidades: 2, valor: null, conValor: 0 }).valorEstimadoCop
    ).toBeNull();
    expect(
      metricasDesdeFila({ abiertas: 0, entidades: 0, valor: null, conValor: 0 }).abiertas
    ).toBe(0);
  });
});

describe("regiones y territorio", () => {
  it("el grupo sin departamento no es un territorio: se cuenta aparte", () => {
    const { regiones, sinUbicacion } = regionesDesdeFilas([
      { codigo: "76", nombre: "Valle del Cauca", total: 42 },
      { codigo: "05", nombre: "Antioquia", total: 100 },
      { codigo: null, nombre: null, total: 7 },
    ]);
    expect(regiones.map((r) => r.codigo)).toEqual(["05", "76"]); // de mayor a menor
    expect(regiones[1].slug).toBe("valle-del-cauca");
    expect(sinUbicacion).toBe(7);
  });

  it("resuelve slug conocido, región válida sin resultados y slug inválido", () => {
    const { regiones } = regionesDesdeFilas([
      { codigo: "76", nombre: "Valle del Cauca", total: 42 },
    ]);
    expect(resolverDepartamento("valle-del-cauca", regiones)).toEqual({
      seleccion: { codigo: "76", nombre: "Valle del Cauca", slug: "valle-del-cauca" },
      invalido: false,
    });
    // Nariño existe pero no tiene resultados: conserva selección y muestra cero.
    const narino = resolverDepartamento("narino", regiones);
    expect(narino.invalido).toBe(false);
    expect(narino.seleccion?.codigo).toBe("52");
    expect(resolverDepartamento("atlantida", regiones)).toEqual({
      seleccion: null,
      invalido: true,
    });
    expect(resolverDepartamento(null, regiones)).toEqual({ seleccion: null, invalido: false });
  });

  it("el selector ofrece los 33 y cada destino conserva los demás filtros", () => {
    const { regiones } = regionesDesdeFilas([
      { codigo: "76", nombre: "Valle del Cauca", total: 42 },
    ]);
    const op = opcionesTerritorio(regiones);
    expect(op).toHaveLength(DEPARTAMENTOS_DANE.length);
    expect(op.find((o) => o.codigo === "76")?.total).toBe(42);
    expect(op.find((o) => o.codigo === "52")?.total).toBe(0);
    const d = destinosPorCodigo(op, { ...SIN_FILTROS, q: "ptap", tipo: "potable" });
    expect(d["76"]).toBe("/marketplace?q=ptap&tipo=potable&departamento=valle-del-cauca");
  });
});
