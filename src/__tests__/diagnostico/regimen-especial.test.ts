import { describe, it, expect } from "vitest";
import {
  pareceEsp,
  esRegimenEspecial,
  avisoRegimenPrivado,
} from "@/src/lib/diagnostico/regimen-especial";

/**
 * Nombres reales de `entidad`, tal cual están en la base (2026-08-28). El
 * cajón de "régimen especial" mezcla regímenes, así que lo que hay que blindar
 * no es solo a quién reconoce: es a quién NO.
 */
const SON_ESP = [
  "EMPRESA DE ACUEDUCTO Y ALCANTARILLADO DE BOGOTÁ - E.S.P.",
  "EMPRESA DE OBRAS SANITARIAS DE CALDAS S.A E.S.P.",
  "EMPRESAS PUBLICAS DE MEDELLIN E.S.P.",
  "AGUAS DE MANIZALES",
  "SOCIEDAD DE ACUEDUCTOS Y ALCANTARILLADOS DEL VALLE DEL CAUCA S.A. - E.S.P.",
  "EMPRESAS MUNICIPALES DE CALI", // sin sigla
  "AAPSA ESP**", // sigla pegada a basura
  "EMPRESA DE AGUA POTABLE Y SANEAMIENTO BASICO DE ORITO", // sin sigla ni "acueducto"
  "EMPRESA DE SERVICIOS PUBLICOS DE CAJICA",
  "Aseo de la Merced S.A.S E.S P+", // sigla con espacio
  "EMPRESAS PÚBLICAS DE CUNDINAMARCA S.A. E.S.P.",
];

const NO_SON_ESP = [
  // Salud: E.S.E. se diferencia de E.S.P. por una letra. Confundirlas le diría
  // a alguien que un hospital se rige por la Ley 142.
  "SUBRED INTEGRADA DE SERVICIOS DE SALUD NORTE E.S.E. (OFICIAL)",
  "E.S.E. HOSPITAL RAFAEL PABA MANJARREZ DE SAN SEBASTIAN MAGDALENA",
  "EMPRESA SOCIAL DEL ESTADO HOSPITAL LA ESTRELLA",
  "CENTRO DE SALUD PROVIDENCIA ESE",
  // Universidades: autonomía universitaria, no Ley 142.
  "UNIVERSIDAD NACIONAL DE COLOMBIA",
  "UNIVERSIDAD DE ANTIOQUIA",
  "FUNDACION UNIVERSITARIA DE SAN GIL",
  // Otros regímenes especiales que no son servicios públicos domiciliarios.
  "EMPRESA COLOMBIANA DE PETROLEOS",
  "BANCO DE LA REPUBLICA",
  "BANCO AGRARIO DE COLOMBIA S.A.",
  "REFINERÍA DE CARTAGENA S.A.S.",
  "ENTerritorio S.A",
  // El regulador del sector no presta el servicio, aunque su nombre lo diga.
  "COMISIÓN DE REGULACIÓN DE AGUA POTABLE Y SANEAMIENTO BÁSICO.",
];

describe("pareceEsp — reconoce empresas de servicios públicos por el nombre", () => {
  it.each(SON_ESP)("sí: %s", (nombre) => {
    expect(pareceEsp(nombre)).toBe(true);
  });

  it.each(NO_SON_ESP)("no: %s", (nombre) => {
    expect(pareceEsp(nombre)).toBe(false);
  });

  it("ante la ausencia de dato, no afirma", () => {
    expect(pareceEsp(null)).toBe(false);
    expect(pareceEsp(undefined)).toBe(false);
    expect(pareceEsp("")).toBe(false);
    expect(pareceEsp("ALCALDÍA DE TULUÁ")).toBe(false);
  });
});

describe("esRegimenEspecial", () => {
  it("reconoce las dos variantes reales de la modalidad", () => {
    expect(esRegimenEspecial("Contratación régimen especial")).toBe(true);
    expect(esRegimenEspecial("Contratación régimen especial (con ofertas)")).toBe(true);
  });

  it("no confunde otras modalidades", () => {
    for (const m of ["Mínima cuantía", "Licitación pública", "Contratación directa", null]) {
      expect(esRegimenEspecial(m)).toBe(false);
    }
  });
});

describe("avisoRegimenPrivado — solo cuando las dos condiciones se cumplen", () => {
  it("avisa en un proceso de régimen especial de una E.S.P.", () => {
    expect(
      avisoRegimenPrivado("Contratación régimen especial", "EMPRESAS PUBLICAS DE MEDELLIN E.S.P.")
    ).toBe("Ley 142 · régimen privado");
  });

  it("calla si la entidad no es E.S.P., aunque sea régimen especial", () => {
    // No sabemos qué régimen la gobierna; afirmar Ley 142 sería inventarlo.
    expect(
      avisoRegimenPrivado("Contratación régimen especial", "UNIVERSIDAD NACIONAL DE COLOMBIA")
    ).toBeNull();
    expect(
      avisoRegimenPrivado("Contratación régimen especial", "E.S.E. HOSPITAL FRAY LUIS DE LEON")
    ).toBeNull();
  });

  it("calla si la E.S.P. contrata por una modalidad de la Ley 80", () => {
    // Una E.S.P. también puede publicar por mínima cuantía; ahí la escalera sí
    // aplica y el aviso de escalón hace su trabajo.
    expect(avisoRegimenPrivado("Mínima cuantía", "AGUAS DE MANIZALES")).toBeNull();
  });
});
