import { describe, expect, it } from "vitest";
import { adjudicadoDesdeFila, type FilaAdjudicado } from "@/src/lib/secop/adjudicados-mes";

const fila = (extra: Partial<FilaAdjudicado> = {}): FilaAdjudicado => ({
  secopProcesoId: "CO1.REQ.1",
  referencia: "LP-001-2026",
  objeto: "Construcción del acueducto regional",
  tipoProyecto: "acueducto",
  entidad: "MUNICIPIO",
  departamento: "Cauca",
  municipio: "Popayán",
  modalidad: "Licitación pública",
  valorEstimado: "2000",
  valorAdjudicacion: "1500",
  adjudicatario: "Obras SAS",
  tipoDocumentoProveedor: "NIT",
  razonSocialProveedor: "OBRAS SAS",
  fechaAdjudicacion: "2026-10-20",
  url: "https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.1",
  ...extra,
});

describe("adjudicadoDesdeFila", () => {
  it("descarta lo que no es obra del sector o no tiene valor", () => {
    expect(adjudicadoDesdeFila(fila({ tipoProyecto: "otros" }))).toBeNull();
    expect(adjudicadoDesdeFila(fila({ tipoProyecto: null }))).toBeNull();
    expect(adjudicadoDesdeFila(fila({ valorAdjudicacion: "0" }))).toBeNull();
  });

  it("solo nombra con documento NIT", () => {
    expect(adjudicadoDesdeFila(fila())!.adjudicatario).toBe("OBRAS SAS");
    for (const t of ["CC", "CE", "OTRO", null]) {
      expect(adjudicadoDesdeFila(fila({ tipoDocumentoProveedor: t }))!.adjudicatario).toBeNull();
    }
  });

  it("el 0 del presupuesto no es dato y la URL debe ser https", () => {
    const a = adjudicadoDesdeFila(fila({ valorEstimado: "0", url: "javascript:alert(1)" }))!;
    expect(a.presupuesto).toBeNull();
    expect(a.frentePresupuesto).toBeNull();
    expect(a.urlSecop).toBeNull();
    expect(adjudicadoDesdeFila(fila())!.frentePresupuesto).toBe(75);
  });
});
