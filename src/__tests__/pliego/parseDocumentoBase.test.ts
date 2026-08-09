import { describe, it, expect } from "vitest";
import { parseDocumentoBaseTexto } from "@/src/lib/pliego/rules/parseDocumentoBase";
import { ParseoNoConfiable } from "@/src/lib/pliego/rules/errors";

const BOILERPLATE_PAGINA = [
  " Código   CCE-EICP-GI-09         Versión   4",
  "                                                                                                   26",
  "                                DOCUMENTO BASE O PLIEGOS TIPO",
  "    LICITACIÓN DE OBRA PÚBLICA DE INFRAESTRUCTURA DE AGUA POTABLE Y SANEAMIENTO BÁSICO",
  "  Código         CCE-EICP-GI-09                               Página   27 de 74",
  "  Versión No.    4",
].join("\n");

function documentoBase(
  opts: {
    reglas?: string;
    experiencia?: string;
    financiera?: string;
    organizacional?: string;
  } = {}
): string {
  return [
    // ruido de tabla de contenido — no debe interferir con el heading real más abajo
    "   1.15.      CAUSALES DE RECHAZO ............................................................................................... 11",
    "",
    "   1.15.         CAUSALES DE RECHAZO",
    "",
    "Son causales de rechazo las siguientes:",
    "",
    opts.reglas ??
      [
        "    A. Causal uno del pliego.",
        `${BOILERPLATE_PAGINA}`,
        "    B. Causal dos del pliego.",
        "    C. Causal tres del pliego.",
      ].join("\n"),
    "",
    "   1.16. CAUSALES PARA LA DECLARACIÓN DE DESIERTA",
    "",
    "   3.5.    EXPERIENCIA",
    "",
    opts.experiencia ?? "Los proponentes deben acreditar experiencia según el RUP.",
    "",
    "   3.6.    CAPACIDAD FINANCIERA",
    "",
    opts.financiera ?? "Indicador de liquidez requerido.",
    "",
    "   3.8.    CAPACIDAD ORGANIZACIONAL",
    "",
    opts.organizacional ?? "Indicador de rentabilidad requerido.",
    "",
    "   3.9. ACREDITACIÓN DE LA CAPACIDAD FINANCIERA Y ORGANIZACIONAL",
  ].join("\n");
}

describe("parseDocumentoBaseTexto", () => {
  it("extrae las causales de rechazo como lista, ignorando boilerplate de página intercalado", () => {
    const r = parseDocumentoBaseTexto(documentoBase());
    expect(r.reglas_presupuesto).toEqual([
      "Causal uno del pliego.",
      "Causal dos del pliego.",
      "Causal tres del pliego.",
    ]);
  });

  it("no confunde una entrada de tabla de contenido (con puntos de relleno) con el heading real", () => {
    // el heading real vive después de la línea de TOC — si el parser tomara el TOC como
    // inicio, el bloque extraído incluiría la segunda ocurrencia del heading como texto.
    const r = parseDocumentoBaseTexto(documentoBase());
    expect(r.reglas_presupuesto.join(" ")).not.toContain("CAUSALES DE RECHAZO");
  });

  it("extrae los tres campos de requisitos_habilitantes", () => {
    const r = parseDocumentoBaseTexto(documentoBase());
    expect(r.requisitos_habilitantes.experiencia_especifica).toContain("RUP");
    expect(r.requisitos_habilitantes.capacidad_financiera).toContain("liquidez");
    expect(r.requisitos_habilitantes.capacidad_organizacional).toContain("rentabilidad");
  });

  it("lanza ParseoNoConfiable si falta el heading de CAUSALES DE RECHAZO", () => {
    const texto = documentoBase().replace(/CAUSALES DE RECHAZO/g, "OTRO TÍTULO");
    expect(() => parseDocumentoBaseTexto(texto)).toThrow(ParseoNoConfiable);
  });

  it("lanza ParseoNoConfiable si la sección de causales no tiene ítems con formato A./B./C.", () => {
    const texto = documentoBase({ reglas: "Texto libre sin formato de lista." });
    expect(() => parseDocumentoBaseTexto(texto)).toThrow(ParseoNoConfiable);
  });

  it("lanza ParseoNoConfiable si falta el heading de EXPERIENCIA", () => {
    const texto = documentoBase().replace("3.5.    EXPERIENCIA", "3.5.    OTRA COSA");
    expect(() => parseDocumentoBaseTexto(texto)).toThrow(ParseoNoConfiable);
  });
});
