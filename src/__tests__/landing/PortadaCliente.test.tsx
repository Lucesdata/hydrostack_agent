import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PortadaCliente from "@/src/components/landing/PortadaCliente";

function contentOfDivWithClass(html: string, className: string) {
  const opening = html.match(new RegExp(`<div\\b[^>]*class="${className}"[^>]*>`));
  if (!opening || opening.index === undefined) return "";

  const contentStart = opening.index + opening[0].length;
  const tags = /<div\b[^>]*>|<\/div>/g;
  tags.lastIndex = contentStart;
  let depth = 1;
  let match;

  while ((match = tags.exec(html))) {
    if (match[0].startsWith("</div>")) depth -= 1;
    else depth += 1;
    if (depth === 0) return html.slice(contentStart, match.index);
  }

  return "";
}

describe("PortadaCliente", () => {
  it("ofrece la faceta y el conteo del departamento recibido, sin cifras de demostración", () => {
    const html = renderToStaticMarkup(
      <PortadaCliente
        departamentos={[{ clave: "05", label: "Antioquia", slug: "antioquia", n: 5155 }]}
        totalAbiertos={6000}
      />
    );
    expect(html).toContain('href="/licitaciones/departamento/antioquia"');
    expect(html).toContain("5.155");
    expect(html).toContain("6.000");
    expect(html).toContain('aria-pressed="true"');
  });

  it("distingue agregados no disponibles de un conteo real en cero", () => {
    const sinDatos = renderToStaticMarkup(<PortadaCliente />);
    const cero = renderToStaticMarkup(<PortadaCliente totalAbiertos={0} />);
    expect(sinDatos).toContain("Datos territoriales no disponibles");
    expect(cero).not.toContain("Datos territoriales no disponibles");
    expect(cero).toContain("No hay procesos abiertos por departamento");
    expect(sinDatos).not.toContain('href="/licitaciones/departamento/');
  });

  it("identifica los tipos como nacionales, aunque el panel muestre un departamento", () => {
    const html = renderToStaticMarkup(
      <PortadaCliente
        departamentos={[{ clave: "05", label: "Antioquia", slug: "antioquia", n: 50 }]}
        tipos={[{ clave: "ptar", label: "PTAR", slug: "ptar", n: 150 }]}
        totalAbiertos={300}
      />
    );
    expect(html).toContain("Tipos de proyecto · Colombia");
    expect(html).toContain('href="/licitaciones/tipo/ptar"');
    expect(html).toContain("150");
  });

  it("renderiza el mapa del servidor dentro del hero, y el listado debajo", () => {
    const html = renderToStaticMarkup(
      <PortadaCliente
        mapa={<div data-testid="mapa-departamental">Mapa departamental</div>}
        departamentos={[{ clave: "05", label: "Antioquia", slug: "antioquia", n: 5155 }]}
        totalAbiertos={6000}
      />
    );

    const hero = contentOfDivWithClass(html, "bp-hero-grid");
    const territorio = contentOfDivWithClass(html, "terr-grid");

    expect(hero).toContain('class="bp-hero-mapa"');
    expect(hero).toContain('data-testid="mapa-departamental"');
    expect(territorio).not.toContain('data-testid="mapa-departamental"');
    expect(territorio).toContain("Buscar departamento");
    expect(html.match(/data-testid="mapa-departamental"/g)).toHaveLength(1);
  });

  it("sin agregados, el hero avisa que el mapa no tiene datos", () => {
    const html = renderToStaticMarkup(<PortadaCliente mapa={<div>Mapa</div>} />);
    expect(html).toContain("El mapa no tiene datos disponibles en este momento.");
    const conDatos = renderToStaticMarkup(
      <PortadaCliente mapa={<div>Mapa</div>} totalAbiertos={0} />
    );
    expect(conDatos).not.toContain("El mapa no tiene datos disponibles");
  });

  it("conserva el hero de la etapa 1: titular, diagnóstico y los tres KPIs", () => {
    const html = renderToStaticMarkup(<PortadaCliente />);
    expect(html).toContain("Entiende cada proceso.");
    expect(html).toContain("o mira antes si estás listo");
    expect(html).toContain("Procesos del sector vigilados");
    expect(html).toContain("Nuevos abiertos · 7 días");
    expect(html).toContain("En juego · este mes · COP");
  });
});
