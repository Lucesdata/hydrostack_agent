import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Lo que el teclado necesita para llegar al hero y ver dónde está. Se mide
 * en la fuente porque son reglas de CSS y de estructura: el recorrido real con
 * Tab se comprobó en Chromium al hacer el cambio (2026-09-26).
 */
const leer = (ruta: string) => readFileSync(join(process.cwd(), ruta), "utf8");
const bloque = (css: string, selector: string) => {
  const i = css.indexOf(`${selector} {`);
  expect(i, `${selector} no está en el CSS`).toBeGreaterThanOrEqual(0);
  return css.slice(i, css.indexOf("}", i));
};

describe("foco y orden de tabulación", () => {
  it("el menú móvil cerrado no recibe el foco; abierto, sí", () => {
    const css = leer("app/globals.css");
    expect(bloque(css, ".clr-mobile-menu")).toMatch(/visibility:\s*hidden/);
    expect(bloque(css, ".clr-mobile-menu.open")).toMatch(/visibility:\s*visible/);
  });

  it("lo primero de cada página es saltar al contenido, y el salto mueve el foco", () => {
    const layout = leer("app/layout.js");
    const cuerpo = layout.slice(layout.indexOf("<body>"));
    expect(cuerpo.indexOf('href="#contenido"')).toBeLessThan(cuerpo.indexOf("<Navbar"));
    expect(layout).toMatch(/<main\s+id="contenido"\s+tabIndex=\{-1\}/);
  });

  it("el foco de un departamento del mapa es un anillo de dos tonos", () => {
    const css = leer("src/components/landing/hero-territorial/hero-territorial.module.css");
    const foco = bloque(css, ".map :global(.clr-mapa__link:focus-visible .clr-mapa__dpto)");
    expect(foco).toMatch(/stroke:\s*var\(--aq-bg\)/);
    expect(foco).toMatch(/drop-shadow/);
  });
});
