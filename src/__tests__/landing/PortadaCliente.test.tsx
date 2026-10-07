import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PortadaCliente from "@/src/components/landing/PortadaCliente";
import { procesoPortada } from "./fixtures-portada";

const procesos = [1, 2, 3].map((i) => procesoPortada({ id: `CO1.REQ.${i}` }));
const destacados = (["potable", "residual", "redes"] as const).map((familia, i) => ({
  familia,
  proceso: procesos[i],
  cierre: "2099-12-31",
  holgado: true,
}));

describe("PortadaCliente", () => {
  it("la franja de la ficha enlaza las secciones del primer destacado del hero", () => {
    const html = renderToStaticMarkup(<PortadaCliente destacados={destacados} />);
    expect(html).toContain(`href="${procesos[0].href}#ficha-dinero"`);
    expect(html).not.toContain(`href="${procesos[1].href}#ficha-dinero"`);
  });

  it("sin procesos, la franja no enlaza nada", () => {
    const vacios = destacados.map((d) => ({ ...d, proceso: null, cierre: null, holgado: false }));
    for (const d of [null, vacios]) {
      const html = renderToStaticMarkup(<PortadaCliente destacados={d} />);
      expect(html).toContain("Los accesos se habilitan cuando hay un proceso disponible.");
      expect(html).not.toMatch(/href="\/licitaciones\/[^"]*(#ficha-|#pliego)/);
    }
  });

  it("renderiza el mapa del servidor una sola vez dentro del hero", () => {
    const html = renderToStaticMarkup(
      <PortadaCliente
        destacados={destacados}
        mapa={<div data-testid="mapa-departamental">Mapa</div>}
      />
    );
    expect(html.match(/data-testid="mapa-departamental"/g)).toHaveLength(1);
  });

  it("usa el copy de la referencia aprobada", () => {
    const html = renderToStaticMarkup(<PortadaCliente />);
    expect(html).toContain("Explora el mapa.");
    expect(html).toContain("Entiende cada proceso.");
    // «Procesos para explorar» ya no es un título visible (2026-10-04).
    expect(html).not.toContain("Procesos para explorar</h2>");
    expect(html).toContain("Del territorio a los detalles que necesitas.");
  });

  it("sin ticker ni fondo animado: la portada se aligeró (2026-09-27)", () => {
    const html = renderToStaticMarkup(<PortadaCliente />);
    expect(html).not.toContain("Fichas recientes");
    expect(html).not.toContain("ptr-");
    expect(html).not.toContain("bp-fondo");
    expect(html).not.toContain("@keyframes");
    expect(html).toContain(".bp-page a");
  });

  it("mapa y fichas salen de la misma selección del servidor, en una consulta", () => {
    const page = readFileSync("app/page.js", "utf8");
    expect(page.match(/destacadosPortada\(/g)).toHaveLength(1);
    expect(page).toContain("destacados={destacados}");
    expect(page).toContain("const procesos = procesosDe(destacados);");
    expect(page).toContain("seleccion={procesos}");
    expect(page).not.toContain("agregadosPortada");
  });
});
