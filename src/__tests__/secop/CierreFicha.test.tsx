import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CierreFicha from "@/src/components/secop/ficha/CierreFicha";

describe("CierreFicha", () => {
  it("no ofrece una alerta que hoy no se entrega (PENDIENTES §0, §44)", () => {
    const html = renderToStaticMarkup(<CierreFicha urlSecop={null} estadoApertura="Abierto" />);
    expect(html).not.toMatch(/alerta/i);
    expect(html).not.toContain('href="/cuenta"');
  });

  it("separa los requisitos del proceso del diagnóstico general", () => {
    const html = renderToStaticMarkup(<CierreFicha urlSecop={null} estadoApertura="Abierto" />);
    expect(html).toContain('href="/diagnostico"');
    expect(html).toContain("preparación general");
    expect(html).toContain("no puede emitir un veredicto individual");
    expect(html).not.toContain("fi-btn--primario");
  });

  it("enlaza el expediente del SECOP II solo si existe", () => {
    const con = renderToStaticMarkup(
      <CierreFicha urlSecop="https://community.secop.gov.co/x" estadoApertura="Abierto" />
    );
    const sin = renderToStaticMarkup(<CierreFicha urlSecop={null} estadoApertura="Abierto" />);
    expect(con).toContain('href="https://community.secop.gov.co/x"');
    expect(con).toContain("Abrir expediente en SECOP II");
    expect(con).toMatch(/fi-btn--primario[^>]*href="https:\/\/community\.secop\.gov\.co\/x"/);
    expect(con).toContain('rel="noopener noreferrer"');
    expect(sin).not.toContain("Abrir expediente en SECOP II</a>");
  });

  it("un proceso cerrado dirige a explorar alternativas sin sugerir candidatura", () => {
    const html = renderToStaticMarkup(<CierreFicha urlSecop={null} estadoApertura="Cerrado" />);
    expect(html).toContain("proceso como cerrado");
    expect(html).toContain('href="/licitaciones"');
    expect(html).not.toContain('href="/diagnostico"');
  });

  it("con estado de apertura ausente pide confirmarlo en el expediente", () => {
    const html = renderToStaticMarkup(<CierreFicha urlSecop={null} estadoApertura={null} />);
    expect(html).toContain("No consta aquí si el proceso recibe ofertas");
  });

  it("con pliego procesado no dice que falten los requisitos: están arriba", () => {
    const html = renderToStaticMarkup(
      <CierreFicha urlSecop={null} estadoApertura="Abierto" conPliego />
    );
    expect(html).not.toContain("aún no los tiene extraídos");
    expect(html).toContain("Qué te exige el pliego");
    expect(html).toContain("no emite un veredicto individual");
  });

  it("sin pliego sigue diciendo que faltan", () => {
    const html = renderToStaticMarkup(<CierreFicha urlSecop={null} estadoApertura="Abierto" />);
    expect(html).toContain("aún no los tiene extraídos");
  });

  it("con pliego y sin estado de apertura, remite al pliego y pide el estado al expediente", () => {
    const html = renderToStaticMarkup(
      <CierreFicha urlSecop={null} estadoApertura={null} conPliego />
    );
    expect(html).toContain("Los requisitos del pliego están arriba");
    expect(html).toContain("No consta aquí si el proceso recibe ofertas");
  });
});
