import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PortadaCliente from "@/src/components/landing/PortadaCliente";

describe("PortadaCliente", () => {
  it("renderiza el mapa del servidor dentro del hero", () => {
    const html = renderToStaticMarkup(
      <PortadaCliente mapa={<div data-testid="mapa-departamental">Mapa departamental</div>} />
    );

    const heroStart = html.indexOf('class="bp-hero-grid"');
    const mapSlot = html.indexOf('class="bp-hero-mapa"');
    const mapMarker = html.indexOf('data-testid="mapa-departamental"');
    const intentRoutesStart = html.indexOf('id="asistentes-proyecto"');

    expect(heroStart).toBeGreaterThanOrEqual(0);
    expect(mapSlot).toBeGreaterThan(heroStart);
    expect(mapMarker).toBeGreaterThan(mapSlot);
    expect(mapMarker).toBeLessThan(intentRoutesStart);
    expect(html.match(/data-testid="mapa-departamental"/g)).toHaveLength(1);
  });
});
