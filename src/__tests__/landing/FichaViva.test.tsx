import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import FichaViva from "@/src/components/landing/ficha-viva/FichaViva";
import PortadaCliente from "@/src/components/landing/PortadaCliente";

/**
 * La sección "La Ficha Viva" promete lo que una ficha responde. Estos tests
 * vigilan que la promesa no se adelante a lo que existe. Desde el 2026-09-28 es
 * titular, cuatro preguntas y un botón; lo demás vive en «Cómo participar»
 * (ComoRazonaFicha.test.tsx).
 */
const html = renderToStaticMarkup(<FichaViva />);

describe("FichaViva", () => {
  it("plantea las cuatro preguntas de la ficha, cada una con su estado real", () => {
    for (const q of [
      "¿Puedo participar?",
      "¿Qué me falta?",
      "¿Dónde consta?",
      "¿Qué hago ahora?",
    ]) {
      expect(html).toContain(q);
    }
    expect(html).toContain("Depende del pliego");
    expect(html.match(/>Disponible</g)).toHaveLength(3);
  });

  it("no promete alertas por correo, que hoy no se entregan (PENDIENTES §0)", () => {
    expect(html).not.toMatch(/alerta te avisa|te avisamos|aviso diario/i);
    expect(html).not.toContain("Activar alerta");
  });

  it("un botón a las fichas y un enlace a cómo razona la ficha", () => {
    expect(html).toContain('href="/licitaciones"');
    expect(html).toContain('href="/licitaciones/como-participar#como-razona"');
    // El diagnóstico sigue en el pie y en cada ficha, no aquí.
    expect(html).not.toContain('href="/diagnostico"');
  });

  it("el esquema, el árbol y la leyenda ya no van en la portada (2026-09-28)", () => {
    expect(html).not.toContain("<figure");
    expect(html).not.toContain("Cómo razona la ficha</h3>");
    expect(html).not.toContain("El estado va aparte");
    expect(html).not.toContain("Seguir sus cambios");
  });

  it("va en la portada justo después del hero, y la cierra", () => {
    const portada = renderToStaticMarkup(<PortadaCliente />);
    const hero = portada.indexOf('id="aq-hero-title"');
    const ficha = portada.indexOf('id="ficha-viva"');
    expect(hero).toBeGreaterThan(-1);
    expect(ficha).toBeGreaterThan(hero);
    // La portada es mapa + Ficha Viva: nada de las secciones que salieron.
    expect(portada).not.toContain('id="asistentes-proyecto"');
  });
});
