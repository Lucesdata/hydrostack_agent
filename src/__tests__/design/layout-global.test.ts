import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AA, contraste } from "@/src/lib/design/contraste";
import { COLORES_PIE } from "@/src/components/landing/S6Footer";

/**
 * Dos cosas del marco global que se rompieron sin que ningún test lo notara
 * (2026-10-22).
 *
 * 1. El navbar es `position: sticky` y su contenedor es el `body`. Con
 *    `height: 100%` el body medía una pantalla y el navbar dejaba de ser fijo a
 *    los ~830 px de scroll; en la portada, que ya mide más de dos pantallas,
 *    desaparecía antes de llegar a la tercera sección.
 * 2. El pie usaba un verde casi negro con una línea casi blanca: sobre la
 *    portada (azul noche) se veía como otra web pegada debajo.
 */
const globals = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
const bloque = (selector: string) => {
  const m = globals.match(new RegExp(`(?:^|\\n)${selector}\\s*\\{([^}]*)\\}`));
  if (!m) throw new Error(`no encuentro el bloque ${selector}`);
  return m[1];
};

describe("el body no fija su altura (navbar sticky)", () => {
  const body = bloque("body");
  const sinComentarios = body.replace(/\/\*[\s\S]*?\*\//g, "");

  it("usa min-height, no height: el contenido puede ser más alto que la pantalla", () => {
    expect(sinComentarios).toMatch(/min-height:\s*100%/);
    expect(sinComentarios).not.toMatch(/(?<!min-)(?<!max-)height:\s*100%/);
  });

  it("no se vuelve contenedor de scroll con overflow:hidden (rompe el sticky)", () => {
    expect(sinComentarios).not.toMatch(/overflow(-x|-y)?:\s*hidden/);
  });
});

describe("el pie combina con la portada", () => {
  it("usa el azul noche de la portada, no el verde casi negro de antes", () => {
    expect(COLORES_PIE.fondo.toLowerCase()).toBe("#061423");
    // Sin comentarios: el archivo cita los colores viejos para explicar el cambio.
    const fuente = readFileSync(
      join(process.cwd(), "src/components/landing/S6Footer.jsx"),
      "utf8"
    ).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
    for (const viejo of ["#070E0C", "#DADAD2", "#8A938F"]) {
      expect(fuente.toLowerCase()).not.toContain(viejo.toLowerCase());
    }
  });

  it("el texto y los títulos de grupo se leen sobre el fondo del pie", () => {
    expect(contraste(COLORES_PIE.texto, COLORES_PIE.fondo)).toBeGreaterThanOrEqual(AA.texto);
    expect(contraste(COLORES_PIE.grupo, COLORES_PIE.fondo)).toBeGreaterThanOrEqual(AA.texto);
  });

  it("el fondo del pie es el de la portada (.tema-oscuro --bg)", () => {
    const oscuro = globals.slice(
      globals.indexOf(".tema-oscuro {"),
      globals.indexOf(".tema-claro {")
    );
    const bg = oscuro.match(/--bg:\s*(#[0-9a-fA-F]{6})/)![1];
    expect(COLORES_PIE.fondo.toLowerCase()).toBe(bg.toLowerCase());
  });
});
