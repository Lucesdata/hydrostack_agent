import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CierreFicha from "@/src/components/secop/ficha/CierreFicha";

describe("CierreFicha", () => {
  it("no ofrece una alerta que hoy no se entrega (PENDIENTES §0, §44)", () => {
    const html = renderToStaticMarkup(<CierreFicha urlSecop={null} />);
    expect(html).not.toMatch(/alerta/i);
    expect(html).not.toContain('href="/cuenta"');
  });

  it("el paso principal es dar los datos con el diagnóstico sin cuenta", () => {
    const html = renderToStaticMarkup(<CierreFicha urlSecop={null} />);
    expect(html).toContain('href="/diagnostico"');
    expect(html).toContain("Completar mis datos");
  });

  it("enlaza el expediente del SECOP II solo si existe", () => {
    const con = renderToStaticMarkup(<CierreFicha urlSecop="https://community.secop.gov.co/x" />);
    const sin = renderToStaticMarkup(<CierreFicha urlSecop={null} />);
    expect(con).toContain('href="https://community.secop.gov.co/x"');
    expect(con).toContain('rel="noopener noreferrer"');
    expect(sin).not.toContain("SECOP II</a>");
  });
});
