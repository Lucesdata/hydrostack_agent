import { describe, expect, it } from "vitest";
import { urlDetalleSecop } from "@/src/lib/secop/url-secop";
import { claseDeEntidad } from "@/src/lib/secop/clase-entidad";

describe("urlDetalleSecop", () => {
  it("acepta el detalle de una oportunidad", () => {
    const u =
      "https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.11018084";
    expect(urlDetalleSecop(u)).toBe(u);
  });
  it("rechaza la página de login y otras URL", () => {
    expect(urlDetalleSecop("https://community.secop.gov.co/STS/Users/Login/Index")).toBeNull();
    expect(
      urlDetalleSecop(
        "http://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.1"
      )
    ).toBeNull();
    expect(
      urlDetalleSecop(
        "https://otro.com/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.1"
      )
    ).toBeNull();
    expect(urlDetalleSecop("javascript:alert(1)")).toBeNull();
    expect(urlDetalleSecop(null)).toBeNull();
  });
});

describe("clase de EMCALI", () => {
  it("«Empresas Municipales de Cali» es una empresa de servicios públicos", () => {
    expect(claseDeEntidad("EMPRESAS MUNICIPALES DE CALI", "Territorial")).toBe("esp");
  });
});
