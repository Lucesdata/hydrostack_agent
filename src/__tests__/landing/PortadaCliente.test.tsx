import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PortadaCliente from "@/src/components/landing/PortadaCliente";

const antioquia = { clave: "05", label: "Antioquia", slug: "antioquia", n: 5155 };

describe("PortadaCliente", () => {
  it("llega al primer departamento con procesos, sin cifras de demostración", () => {
    const html = renderToStaticMarkup(
      <PortadaCliente departamentos={[antioquia]} totalAbiertos={6000} />
    );
    expect(html).toContain("<h2>Antioquia</h2>");
    expect(html).toContain('aria-pressed="true"');
    // La lista plegada lleva el conteo; el total nacional ya no se pinta.
    expect(html).toContain("5.155");
    expect(html).not.toContain("6.000");
  });

  it("en el HTML inicial ni la tarjeta ni la franja enlazan un proceso", () => {
    const html = renderToStaticMarkup(
      <PortadaCliente departamentos={[antioquia]} totalAbiertos={6000} />
    );
    expect(html).toContain("Cargando proceso…");
    expect(html).toContain("Los accesos se habilitan cuando hay un proceso disponible.");
    expect(html).not.toMatch(/href="\/licitaciones\/[^"]*(#ficha-|#pliego)/);
  });

  it("distingue agregados no disponibles de un conteo real en cero", () => {
    const sinDatos = renderToStaticMarkup(<PortadaCliente />);
    const cero = renderToStaticMarkup(<PortadaCliente totalAbiertos={0} />);
    expect(sinDatos).toContain("No hay datos territoriales disponibles en este momento.");
    expect(cero).toContain("No hay procesos abiertos disponibles.");
    expect(sinDatos).not.toContain('href="/licitaciones/departamento/');
  });

  it("renderiza el mapa del servidor una sola vez dentro del hero", () => {
    const html = renderToStaticMarkup(
      <PortadaCliente
        mapa={<div data-testid="mapa-departamental">Mapa departamental</div>}
        departamentos={[antioquia]}
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

  it("usa el copy de la referencia aprobada (2026-10-02)", () => {
    const html = renderToStaticMarkup(<PortadaCliente />);
    expect(html).toContain("Explora el mapa.");
    expect(html).toContain("Entiende cada proceso.");
    expect(html).toContain("Del territorio a los detalles que necesitas.");
    expect(html).not.toContain("El mercado ahora");
    expect(html).not.toContain("o mira antes si estás listo");
  });

  it("sin ticker ni fondo animado: la portada se aligeró (2026-09-27)", () => {
    const html = renderToStaticMarkup(<PortadaCliente />);
    expect(html).not.toContain("Fichas recientes");
    expect(html).not.toContain("ptr-");
    expect(html).not.toContain("bp-fondo");
    expect(html).not.toContain("@keyframes");
    expect(html).toContain(".bp-page a");
  });

  it("una sola fuente del destacado: el resumen se pide desde la portada, no desde cada sección", async () => {
    const { readFileSync } = await import("node:fs");
    const portada = readFileSync("src/components/landing/PortadaCliente.jsx", "utf8");
    expect(portada).not.toMatch(/addEventListener\(\s*["']scroll/);
    expect(portada).not.toContain("procesos/recientes");
    expect(portada.match(/useResumenDepartamento\(/g)).toHaveLength(1);
    for (const ruta of [
      "src/components/landing/hero-territorial/HeroTerritorial.jsx",
      "src/components/landing/ficha-viva/FichaViva.jsx",
    ]) {
      const fuente = readFileSync(ruta, "utf8");
      expect(fuente, ruta).not.toContain("useResumenDepartamento");
      expect(fuente, ruta).not.toContain("fetch(");
    }
  });
});
