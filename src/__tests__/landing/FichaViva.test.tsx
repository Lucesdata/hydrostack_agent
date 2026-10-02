import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import FichaViva from "@/src/components/landing/ficha-viva/FichaViva";
import PortadaCliente from "@/src/components/landing/PortadaCliente";

/**
 * La franja bajo el hero (2026-10-02): cuatro accesos a la ficha del proceso
 * que muestra la tarjeta del hero. Estos tests vigilan que no enlace un
 * proceso que no está y que no prometa lo que la ficha no hace.
 */
const destacado = {
  id: "CO1.REQ.1",
  href: "/licitaciones/optimizacion-de-la-ptar--CO1.REQ.1",
  objeto: "Optimización de la PTAR municipal",
  entidad: null,
};
const sin = renderToStaticMarkup(<FichaViva />);
const con = renderToStaticMarkup(<FichaViva destacado={destacado} />);

describe("FichaViva", () => {
  it("titular, panel y chip de la referencia, sin «ejemplo ilustrativo»", () => {
    for (const html of [sin, con]) {
      expect(html).toContain("Del territorio a los detalles que necesitas.");
      expect(html).toContain("Ficha del proceso");
      expect(html).toContain("QUÉ ENCONTRARÁS");
      expect(html).toContain("tema-claro");
      expect(html).not.toContain("EJEMPLO ILUSTRATIVO");
      for (const t of ["Qué se contrata", "Presupuesto", "Plazos", "Qué falta verificar"]) {
        expect(html).toContain(`<h4>${t}</h4>`);
      }
    }
  });

  it("con destacado, los cuatro accesos van a secciones de esa misma ficha", () => {
    const hrefs = [...con.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual([
      `${destacado.href}#ficha-resumen`,
      `${destacado.href}#ficha-dinero`,
      `${destacado.href}#ficha-plazos`,
      `${destacado.href}#pliego`,
      "/licitaciones/como-participar#como-razona",
    ]);
    expect(con).toContain(">Consultar detalle <");
    expect(con).toContain(">Ver fuente <");
    expect(con).toContain(">Consultar fechas <");
    expect(con).toContain(">Revisar pliego <");
    expect(con).toContain('aria-label="Consultar fechas de Optimización de la PTAR municipal"');
    expect(con).not.toContain("Los accesos se habilitan");
  });

  it("sin destacado, texto en vez de enlaces: ni href al proceso ni «#»", () => {
    const hrefs = [...sin.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual(["/licitaciones/como-participar#como-razona"]);
    for (const t of [
      "Objeto del proceso",
      "Valor y fuentes disponibles",
      "Fechas publicadas",
      "Requisitos según el pliego",
    ]) {
      expect(sin).toContain(t);
    }
    expect(sin).toContain("Los accesos se habilitan cuando hay un proceso disponible.");
    expect(sin).not.toContain("Consultar detalle");
  });

  it("dice de qué depende y enlaza cómo razona la ficha", () => {
    expect(sin).toContain(
      "La disponibilidad de presupuesto, fechas y requisitos depende de las fuentes de cada proceso."
    );
    expect(sin).toContain("Cómo razona la ficha");
  });

  it("no promete alertas por correo, que hoy no se entregan (PENDIENTES §0)", () => {
    expect(con).not.toMatch(/alerta|te avisamos|aviso diario/i);
  });

  it("las cuatro preguntas, el esquema y el árbol ya no van en la portada", () => {
    expect(con).not.toContain("¿Puedo participar?");
    expect(con).not.toContain("Depende del pliego");
    expect(con).not.toContain("<figure");
    expect(con).not.toContain("Seguir sus cambios");
  });

  it("va en la portada justo después del hero, y la cierra", () => {
    const portada = renderToStaticMarkup(<PortadaCliente />);
    const hero = portada.indexOf('id="aq-hero-title"');
    const ficha = portada.indexOf('id="ficha-viva"');
    expect(hero).toBeGreaterThan(-1);
    expect(ficha).toBeGreaterThan(hero);
    expect(portada).not.toContain('id="asistentes-proyecto"');
  });
});
