import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import S3Motor from "@/src/components/landing/S3Motor";

describe("Cómo funciona", () => {
  const html = renderToStaticMarkup(<S3Motor procesosVigilados={90622} />);

  it("son tres pasos, los tres sin cuenta", () => {
    expect(html.match(/\[ 0\d \]/g)).toEqual(["[ 01 ]", "[ 02 ]", "[ 03 ]"]);
    expect(html.match(/sin cuenta/g)?.length).toBeGreaterThanOrEqual(3);
    expect(html).not.toContain("cuenta gratuita");
  });

  it("lleva a las fichas, a la Ficha Viva y al diagnóstico", () => {
    expect(html).toContain('href="/licitaciones"');
    expect(html).toContain('href="#ficha-viva"');
    expect(html).toContain('href="/diagnostico"');
  });

  it("usa la cifra real y no promete lo que no existe", () => {
    expect(html).toContain("90.622 procesos");
    // Las alertas no se entregan en producción (PENDIENTES §0), y el
    // diagnóstico no cambia el veredicto de la ficha (no alimenta habilitacionGate).
    expect(html.toLowerCase()).not.toContain("alerta");
    expect(html.toLowerCase()).not.toContain("veredicto");
  });
});
