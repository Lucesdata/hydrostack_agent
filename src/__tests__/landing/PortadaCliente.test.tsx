import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PortadaCliente from "@/src/components/landing/PortadaCliente";
import { procesoPortada } from "./fixtures-portada";

const procesos = [1, 2, 3].map((i) => procesoPortada({ id: `CO1.REQ.${i}` }));

describe("PortadaCliente", () => {
  it("la franja de la ficha enlaza las secciones del primer proceso del hero", () => {
    const html = renderToStaticMarkup(<PortadaCliente procesos={procesos} />);
    expect(html).toContain(`href="${procesos[0].href}#ficha-dinero"`);
    expect(html).not.toContain(`href="${procesos[1].href}#ficha-dinero"`);
  });

  it("sin procesos, la franja no enlaza nada", () => {
    for (const p of [null, []]) {
      const html = renderToStaticMarkup(<PortadaCliente procesos={p} />);
      expect(html).toContain("Los accesos se habilitan cuando hay un proceso disponible.");
      expect(html).not.toMatch(/href="\/licitaciones\/[^"]*(#ficha-|#pliego)/);
    }
  });

  it("renderiza el mapa del servidor una sola vez dentro del hero", () => {
    const html = renderToStaticMarkup(
      <PortadaCliente procesos={procesos} mapa={<div data-testid="mapa-departamental">Mapa</div>} />
    );
    expect(html.match(/data-testid="mapa-departamental"/g)).toHaveLength(1);
  });

  it("usa el copy de la referencia aprobada", () => {
    const html = renderToStaticMarkup(<PortadaCliente />);
    expect(html).toContain("Explora el mapa.");
    expect(html).toContain("Entiende cada proceso.");
    expect(html).toContain("Procesos para explorar");
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

  it("mapa y tarjetas salen de la misma selección del servidor, en una consulta", () => {
    const page = readFileSync("app/page.js", "utf8");
    expect(page.match(/muestraPortada\(/g)).toHaveLength(1);
    expect(page).toContain("procesos={procesos}");
    expect(page).toContain("seleccion={procesos ?? []}");
    expect(page).not.toContain("agregadosPortada");
  });
});
