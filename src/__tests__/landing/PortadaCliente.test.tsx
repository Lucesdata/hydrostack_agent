import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PortadaCliente from "@/src/components/landing/PortadaCliente";

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
    expect(sinDatos).toContain("—");
    expect(cero).toContain(">0<");
    expect(sinDatos).not.toContain('href="/licitaciones/departamento/');
  });

  it("identifica los tipos como nacionales, aunque la ficha muestre un departamento", () => {
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

  it("renderiza el mapa del servidor una sola vez dentro del Hero Territorial", () => {
    const html = renderToStaticMarkup(
      <PortadaCliente
        mapa={<div data-testid="mapa-departamental">Mapa departamental</div>}
        departamentos={[{ clave: "05", label: "Antioquia", slug: "antioquia", n: 5155 }]}
        totalAbiertos={6000}
      />
    );
    expect(html.match(/data-testid="mapa-departamental"/g)).toHaveLength(1);
    expect(html).toContain("Buscar departamento");
  });

  it("sin agregados, el hero avisa que el mapa no tiene datos", () => {
    const html = renderToStaticMarkup(<PortadaCliente mapa={<div>Mapa</div>} />);
    expect(html).toContain("El mapa no tiene datos disponibles en este momento.");
    const conDatos = renderToStaticMarkup(
      <PortadaCliente mapa={<div>Mapa</div>} totalAbiertos={0} />
    );
    expect(conDatos).not.toContain("El mapa no tiene datos disponibles");
  });

  it("usa el copy del hero y ya no muestra el CTA secundario del diagnóstico", () => {
    const html = renderToStaticMarkup(<PortadaCliente />);
    expect(html).toContain("Explora el mercado de agua y saneamiento de");
    expect(html).toContain("Colombia.");
    expect(html).toContain("Ver fichas de procesos");
    expect(html).toContain("El mercado ahora");
    expect(html).not.toContain("o mira antes si estás listo");
  });

  it("el fondo blueprint es CSS: sin estilos en línea que dependan del scroll", () => {
    const html = renderToStaticMarkup(<PortadaCliente />);
    expect(html).toContain('class="bp-fondo-rejilla"');
    expect(html).toContain("animation-timeline: scroll(root)");
    // El hook anterior escribía top y transform en línea en cada evento de scroll.
    expect(html).not.toMatch(/style="[^"]*top:\s*[\d.]+vh/);
    expect(html).not.toMatch(/style="[^"]*translate3d/);
  });

  it("la portada no escucha el scroll para pintar el fondo", async () => {
    const { readFileSync } = await import("node:fs");
    const fuente = readFileSync("src/components/landing/PortadaCliente.jsx", "utf8");
    expect(fuente).not.toMatch(/addEventListener\(\s*["']scroll/);
  });
});
