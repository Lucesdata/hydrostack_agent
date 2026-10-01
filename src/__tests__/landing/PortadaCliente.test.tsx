import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PortadaCliente from "@/src/components/landing/PortadaCliente";

describe("PortadaCliente", () => {
  it("pinta el conteo del departamento recibido y arranca en Colombia, sin cifras de demostración", () => {
    const html = renderToStaticMarkup(
      <PortadaCliente
        departamentos={[{ clave: "05", label: "Antioquia", slug: "antioquia", n: 5155 }]}
        totalAbiertos={6000}
      />
    );
    // La lista plegada lleva el conteo del departamento; la faceta, el mapa.
    expect(html).toContain("5.155");
    // Se llega a la vista país (hero v2, 2026-09-28): el total nacional es la
    // cifra del resultado y ningún departamento sale elegido.
    expect(html).toContain("6.000");
    expect(html).not.toContain("Procesos abiertos · Colombia");
    expect(html).not.toContain('aria-pressed="true"');
  });

  it("distingue agregados no disponibles de un conteo real en cero", () => {
    const sinDatos = renderToStaticMarkup(<PortadaCliente />);
    const cero = renderToStaticMarkup(<PortadaCliente totalAbiertos={0} />);
    expect(sinDatos).toContain("—");
    expect(cero).toContain(">0<");
    expect(sinDatos).not.toContain('href="/licitaciones/departamento/');
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
    expect(html).toContain("Ver el departamento como lista");
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
    expect(html).toContain("Descubre en qué procesos de agua puedes");
    expect(html).toContain("participar.");
    expect(html).not.toContain("Ver fichas de procesos");
    // La banda "El mercado ahora" salió de la portada (2026-09-26).
    expect(html).not.toContain("El mercado ahora");
    expect(html).not.toContain("o mira antes si estás listo");
  });

  it("sin ticker ni fondo animado: la portada se aligeró (2026-09-27)", () => {
    const html = renderToStaticMarkup(<PortadaCliente />);
    expect(html).not.toContain("Fichas recientes");
    expect(html).not.toContain("ptr-");
    expect(html).not.toContain("bp-fondo");
    expect(html).not.toContain("@keyframes");
    // La regla de los enlaces, que vivía en el CSS del fondo, se queda.
    expect(html).toContain(".bp-page a");
  });

  it("la portada no escucha el scroll ni pide las fichas recientes", async () => {
    const { readFileSync } = await import("node:fs");
    const fuente = readFileSync("src/components/landing/PortadaCliente.jsx", "utf8");
    expect(fuente).not.toMatch(/addEventListener\(\s*["']scroll/);
    expect(fuente).not.toContain("procesos/recientes");
  });
});
