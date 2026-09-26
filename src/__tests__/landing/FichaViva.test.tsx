import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import FichaViva from "@/src/components/landing/ficha-viva/FichaViva";
import PortadaCliente from "@/src/components/landing/PortadaCliente";

/**
 * La sección "La Ficha Viva" promete lo que una ficha responde. Estos tests
 * vigilan que la promesa no se adelante a lo que existe.
 */
const html = renderToStaticMarkup(<FichaViva />);

describe("FichaViva", () => {
  it("plantea las cuatro preguntas de la ficha", () => {
    for (const q of [
      "¿Puedo participar?",
      "¿Qué me falta?",
      "¿Dónde consta?",
      "¿Qué hago ahora?",
    ]) {
      expect(html).toContain(q);
    }
  });

  it("dice «todavía no puedo determinarlo» en vez de adivinar", () => {
    expect(html).toContain("Todavía no puedo determinarlo");
    expect(html).toContain("todavía no puedo determinarlo");
  });

  it("marca el seguimiento de cambios como en construcción", () => {
    expect(html).toContain("Seguir sus cambios");
    expect(html).toContain("En construcción");
  });

  it("no promete alertas por correo, que hoy no se entregan (PENDIENTES §0)", () => {
    expect(html).not.toMatch(/alerta te avisa|te avisamos|aviso diario/i);
    expect(html).not.toContain("Activar alerta");
  });

  it("rotula el esquema como ilustrativo y no pinta cifras", () => {
    expect(html).toContain("Esquema ilustrativo");
    const esquema = html.slice(html.indexOf("<figure"), html.indexOf("</figure>"));
    // Solo el texto visible, sin las chinchetas numeradas (aria-hidden) que
    // enlazan cada bloque con su pregunta.
    const texto = esquema
      .replace(/<span[^>]*aria-hidden="true"[^>]*>\d<\/span>/g, "")
      .replace(/<[^>]+>/g, " ");
    expect(texto).not.toMatch(/\d/);
  });

  it("lleva a las fichas y al diagnóstico", () => {
    expect(html).toContain('href="/licitaciones"');
    expect(html).toContain('href="/diagnostico"');
  });

  it("explica el color: tipo de obra con su nombre, y el estado aparte", () => {
    for (const f of ["Agua potable", "Aguas residuales", "Redes y alcantarillado"]) {
      expect(html).toContain(f);
    }
    expect(html).toContain("El estado va aparte");
  });

  it("va en la portada justo después del hero", () => {
    const portada = renderToStaticMarkup(<PortadaCliente />);
    const hero = portada.indexOf('id="aq-hero-title"');
    const ficha = portada.indexOf('id="ficha-viva"');
    const momento = portada.indexOf('id="asistentes-proyecto"');
    expect(hero).toBeGreaterThan(-1);
    expect(ficha).toBeGreaterThan(hero);
    expect(ficha).toBeLessThan(momento);
  });
});
