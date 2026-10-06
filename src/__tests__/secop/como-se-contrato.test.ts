import { describe, expect, it } from "vitest";
import {
  comoSeContrato,
  esPersonaJuridica,
  type ContratoFicha,
} from "@/src/lib/secop/como-se-contrato";

const contrato = (c: Partial<ContratoFicha>): ContratoFicha => ({
  fechaFirma: "2026-09-09",
  fechaInicio: "2026-09-29",
  fechaFinInicial: "2026-12-31",
  fechaFinActual: "2026-12-31",
  valorInicial: "400000000",
  valorActual: "400000000",
  estado: "En ejecución",
  contratista: "CONSORCIO AGUAS DEL VALLE",
  tipoDocumento: "NIT",
  valorPagado: null,
  ...c,
});

describe("esPersonaJuridica", () => {
  it("solo el NIT es persona jurídica; ante la duda, no se expone", () => {
    expect(esPersonaJuridica("NIT")).toBe(true);
    expect(esPersonaJuridica(" nit ")).toBe(true);
    for (const t of [
      "CC",
      "CE",
      "PASAPORTE",
      "PERMISO POR PROTECCIÓN TEMPORAL",
      "OTRO",
      "",
      null,
    ]) {
      expect(esPersonaJuridica(t), String(t)).toBe(false);
    }
  });
});

describe("comoSeContrato", () => {
  it("contratista, valor, fechas y nada inventado", () => {
    const r = comoSeContrato("2026-07-11", "en_ejecucion", [contrato({})])!;
    expect(r.ocultos).toBe(0);
    expect(r.contratos).toEqual([
      {
        contratista: "CONSORCIO AGUAS DEL VALLE",
        valor: 400_000_000,
        adicion: null,
        inicio: "29 sep 2026",
        finPrevisto: "31 dic 2026",
        finActual: "31 dic 2026",
        prorrogaDias: null,
        pagado: null,
        estado: "En ejecución",
      },
    ]);
  });

  it("prórroga y adición son hechos del contrato", () => {
    const r = comoSeContrato("2026-03-01", "en_ejecucion", [
      contrato({
        fechaFinInicial: "2026-11-15",
        fechaFinActual: "2026-12-30",
        valorInicial: "400000000",
        valorActual: "520000000",
        valorPagado: "150000000",
      }),
    ])!;
    expect(r.contratos[0]).toMatchObject({
      prorrogaDias: 45,
      adicion: 120_000_000,
      valor: 520_000_000,
      pagado: 150_000_000,
      finPrevisto: "15 nov 2026",
      finActual: "30 dic 2026",
    });
  });

  it("solo 2026: un proceso anterior no se amplía (decisión del usuario)", () => {
    expect(comoSeContrato("2025-12-31", "en_ejecucion", [contrato({})])).toBeNull();
    expect(comoSeContrato(null, "en_ejecucion", [contrato({})])).toBeNull();
  });

  it("solo en las etapas con contrato firmado", () => {
    for (const etapa of [
      "recibe_ofertas",
      "en_evaluacion",
      "adjudicado",
      "por_verificar",
    ] as const) {
      expect(comoSeContrato("2026-07-11", etapa, [contrato({})]), etapa).toBeNull();
    }
    for (const etapa of ["contratado", "en_ejecucion", "plazo_cumplido"] as const) {
      expect(comoSeContrato("2026-07-11", etapa, [contrato({})]), etapa).not.toBeNull();
    }
  });

  it("personas naturales: no se nombran ni se detallan, solo se cuentan", () => {
    expect(
      comoSeContrato("2026-07-11", "en_ejecucion", [
        contrato({ contratista: "Angie Michelle Ascanio Jaime", tipoDocumento: "CC" }),
      ])
    ).toBeNull();
    const mixto = comoSeContrato("2026-07-11", "en_ejecucion", [
      contrato({ contratista: "PERSONA", tipoDocumento: "CC", fechaFirma: "2026-09-20" }),
      contrato({ contratista: "PERSONA SIN DATO", tipoDocumento: null }),
      contrato({ contratista: "INGENIERÍA S.A.S.", tipoDocumento: "NIT" }),
    ])!;
    expect(mixto.contratos.map((c) => c.contratista)).toEqual(["INGENIERÍA S.A.S."]);
    expect(mixto.ocultos).toBe(2);
    expect(JSON.stringify(mixto)).not.toContain("PERSONA");
  });

  it("contratos sin firmar o cancelados no cuentan; varios se listan del más reciente", () => {
    const r = comoSeContrato("2026-02-01", "en_ejecucion", [
      contrato({ contratista: "BORRADOR S.A.S.", estado: "Borrador" }),
      contrato({ contratista: "CANCELADO S.A.S.", estado: "Cancelado" }),
      contrato({ contratista: "LOTE 1 S.A.S.", fechaFirma: "2026-03-01" }),
      contrato({ contratista: "LOTE 2 S.A.S.", fechaFirma: "2026-04-01" }),
    ])!;
    expect(r.contratos.map((c) => c.contratista)).toEqual(["LOTE 2 S.A.S.", "LOTE 1 S.A.S."]);
    expect(r.ocultos).toBe(0);
  });

  it("presupuesto en cero o pagado en cero no se convierten en cifras", () => {
    const r = comoSeContrato("2026-07-11", "plazo_cumplido", [
      contrato({ valorInicial: "0", valorActual: null, valorPagado: "0" }),
    ])!;
    expect(r.contratos[0].valor).toBeNull();
    expect(r.contratos[0].pagado).toBeNull();
  });
});
