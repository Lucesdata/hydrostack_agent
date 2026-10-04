import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HeroTerritorial from "@/src/components/landing/hero-territorial/HeroTerritorial";
import { procesoPortada } from "./fixtures-portada";

/**
 * El hero con cinco minifichas (spec 2026-10-04-hero-cinco-minifichas). Se
 * renderiza el HTML que llega al navegador: es lo que ve quien no tiene JS y
 * lo que hidrata React.
 */

const cinco = [1, 2, 3, 4, 5].map((i) =>
  procesoPortada({ id: `CO1.REQ.${i}`, numeroProceso: `00${i}-LP-2026` })
);

const html = renderToStaticMarkup(
  <HeroTerritorial procesos={cinco} mapa={<div data-testid="mapa">Mapa</div>} />
);

describe("HeroTerritorial", () => {
  it("copy de la referencia, un solo h1 y el encabezado de las tarjetas", () => {
    expect(html).toContain("<span>Explora el mapa.</span> <span>Entiende cada proceso.</span>");
    expect(html).toContain(
      "Encuentra procesos de agua y saneamiento y revisa sus condiciones en una ficha."
    );
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toMatch(/<h2 id="aq-procesos-titulo"[^>]*>Procesos para explorar<\/h2>/);
  });

  it("sin buscador ni ficha individual ni lista de departamentos", () => {
    expect(html).not.toContain("<input");
    expect(html).not.toContain("Busca por entidad u objeto");
    expect(html).not.toContain("PROCESO SECOP II");
    expect(html).not.toContain("Objeto · Presupuesto · Plazos · Requisitos");
    expect(html).not.toContain("como lista");
    expect(html).not.toContain("Opciones del mapa");
  });

  it("cinco minifichas en una lista, cada una con su número y un solo enlace a su ficha", () => {
    expect(html).toContain(
      '<ul class="aqMinifichas" data-n="5" aria-labelledby="aq-procesos-titulo">'
    );
    expect(html.match(/<li class="aqMini"/g)).toHaveLength(5);
    for (const p of cinco) {
      expect(html).toContain(`Proceso: <span translate="no">${p.numeroProceso}</span>`);
      expect(html.match(new RegExp(`href="${p.href}"`, "g"))).toHaveLength(1);
      expect(html).toContain(`aria-label="Ver ficha del proceso ${p.numeroProceso}: ${p.objeto}"`);
    }
  });

  it("orden de la minificha: categoría, lugar, objeto, número, entidad, presupuesto, estado, acceso", () => {
    const inicio = html.indexOf('<li class="aqMini"');
    const tarjeta = html.slice(inicio, html.indexOf("</li>", inicio));
    const orden = [
      "Agua potable",
      "Cali · Valle del Cauca",
      "Obra de prueba",
      "Proceso:",
      "Municipio de Prueba",
      "$2.450 millones",
      "Abierto",
      "Ver ficha",
    ].map((t) => tarjeta.indexOf(t));
    expect(orden.every((i) => i >= 0)).toBe(true);
    expect([...orden].sort((a, b) => a - b)).toEqual(orden);
  });

  it("datos ausentes: texto explícito, nunca $0 ni «Abierto» sin respaldo", () => {
    const parcial = renderToStaticMarkup(
      <HeroTerritorial
        procesos={[
          procesoPortada({
            id: "CO1.REQ.9",
            presupuesto: null,
            municipio: null,
            tipoProyecto: null,
            abierto: false,
            estado: "Adjudicado",
            entidad: null,
          }),
        ]}
      />
    );
    expect(parcial).toContain("Presupuesto no disponible");
    expect(parcial).not.toContain("$0");
    expect(parcial).toContain(">Valle del Cauca</span>");
    expect(parcial).toContain("Sin subsistema identificado");
    expect(parcial).toContain("Adjudicado");
    expect(parcial).not.toContain(">Abierto<");
    // La leyenda añade la categoría neutra solo cuando hace falta.
    expect(html).not.toContain("Sin subsistema identificado");
  });

  it("leyenda de categorías, valores en COP y el significado de la ubicación", () => {
    for (const t of ["Agua potable", "Aguas residuales", "Redes y alcantarillado"]) {
      expect(html).toContain(t);
    }
    expect(html).toContain("Valores en COP · Ubicación de la entidad contratante, no de la obra.");
    expect(html).not.toMatch(/\b1 – 10\b|procesos abiertos por departamento/i);
  });

  it("menos de cinco candidatos: solo los que hay, sin rellenos", () => {
    const dos = renderToStaticMarkup(<HeroTerritorial procesos={cinco.slice(0, 2)} />);
    expect(dos.match(/<li class="aqMini"/g)).toHaveLength(2);
    expect(dos).not.toContain("EJEMPLO");
  });

  it("vacío y error se distinguen, sin tarjetas", () => {
    const vacio = renderToStaticMarkup(<HeroTerritorial procesos={[]} />);
    const error = renderToStaticMarkup(<HeroTerritorial procesos={null} />);
    expect(vacio).toContain("No hay procesos disponibles para mostrar en este momento.");
    expect(error).toContain("No pudimos cargar los procesos. Inténtalo de nuevo.");
    for (const h of [vacio, error]) expect(h).not.toContain('class="aqMini"');
  });

  it("el mapa del servidor se monta una sola vez", () => {
    expect(html.match(/data-testid="mapa"/g)).toHaveLength(1);
  });

  it("sin sorteo ni peticiones en el cliente: la selección llega del servidor", () => {
    for (const ruta of [
      "src/components/landing/hero-territorial/HeroTerritorial.jsx",
      "src/components/landing/hero-territorial/Minifichas.jsx",
      "src/components/landing/PortadaCliente.jsx",
    ]) {
      const fuente = readFileSync(ruta, "utf8");
      expect(fuente, ruta).not.toContain("Math.random");
      expect(fuente, ruta).not.toContain("fetch(");
      expect(fuente, ruta).not.toMatch(/setInterval|scrollIntoView/);
    }
  });
});
