import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import InformeVista from "@/src/components/informe/InformeVista";

const mes = { desde: "2026-08-01", hasta: "2026-09-01", etiqueta: "agosto de 2026" };
const informe = {
  mes,
  publicados: 1200,
  montoPublicado: 4.2e11,
  nConMonto: 900,
  porTipo: { acueducto: 400, alcantarillado: 300, ptap: 50, ptar: 150, otros: 200 },
  departamentos: [{ nombre: "ANTIOQUIA", n: 300, monto: 9e10 }],
  entidades: [{ nombre: "EMPRESAS PUBLICAS DE MEDELLIN E.S.P.", n: 80, monto: 0 }],
};

describe("InformeVista", () => {
  const html = renderToStaticMarkup(
    <InformeVista
      informe={informe}
      abiertosHoy={35222}
      mes={mes}
      generado="26 de septiembre de 2026"
    />
  );

  it("va dentro de clr-page: el body del sitio es oscuro", () => {
    expect(html).toMatch(/^<div class="clr-page">/);
  });

  it("nombra el mes y dice de dónde salen los datos y cuándo se generó", () => {
    expect(html).toContain("Agosto de 2026");
    expect(html).toContain("generado el 26 de septiembre de 2026");
  });

  it("las cifras del mes, con el presupuesto sobre cuántos lo publican", () => {
    expect(html).toContain("1.200");
    expect(html).toContain("900 de 1.200 lo publican");
    expect(html).toContain("35.222");
  });

  it("tipos con nombre y parte del mes; rankings con nombres legibles", () => {
    expect(html).toContain("Acueducto");
    expect(html).toContain("33,3 %");
    expect(html).toContain("Antioquia");
    expect(html).toContain("Empresas Publicas de Medellin E.S.P.");
    // Una entidad sin presupuesto publicado no se pinta como $0.
    expect(html).toMatch(/Medellin E\.S\.P\.<\/th><td class="num">80<\/td><td class="num">—/);
  });

  it("se descarga imprimiendo y no pide correo", () => {
    expect(html).toContain("Descargar PDF");
    expect(html).not.toMatch(/type="email"|correo electrónico/i);
  });

  it("sin base lo dice, sin cifras inventadas", () => {
    const vacio = renderToStaticMarkup(
      <InformeVista informe={null} abiertosHoy={null} mes={mes} generado="hoy" />
    );
    expect(vacio).toContain("no está disponible");
    expect(vacio).not.toContain('class="inf-cifras"');
  });
});
