import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AA, componer, contraste } from "@/src/lib/design/contraste";

/**
 * La sección «¿Puedes participar?» de la portada (2026-10-22) pinta sobre
 * tarjetas de cristal y sobre un fondo generado que, con `screen`, puede subir
 * el tono detrás de ellas. Se mide contra el fondo de la portada y contra un
 * azul medio (#1b4a7a) que hace de peor caso del fondo iluminado.
 *
 * Se leen los archivos reales: tokens de `.tema-oscuro` en globals.css y colores
 * escritos a mano en el módulo. Si alguien cambia uno, este test lo nota.
 */
const leer = (ruta: string) => readFileSync(join(process.cwd(), ruta), "utf8");
const globals = leer("app/globals.css");
const modulo = leer("src/components/landing/tu-perfil/tu-perfil.module.css");

const oscuro = globals.slice(globals.indexOf(".tema-oscuro {"), globals.indexOf(".tema-claro {"));
const token = (nombre: string) => {
  const m = oscuro.match(new RegExp(`--${nombre}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`falta --${nombre} en .tema-oscuro`);
  return m[1];
};
const pinta = (color: string) =>
  expect(modulo.toLowerCase(), `${color} ya no aparece en el módulo`).toContain(
    color.toLowerCase()
  );

const BG = token("bg");
const PEOR_FONDO = "#1b4a7a";
/** Tarjeta de cristal (0,66 de opacidad) sobre un fondo. */
const tarjeta = (sobre: string) => componer([8, 26, 46], 0.66, sobre);
/** Fila del ejemplo: velo sobre el recuadro, sobre la tarjeta. */
const fila = (sobre: string) =>
  componer([16, 40, 63], 0.7, componer([4, 16, 30], 0.55, tarjeta(sobre)));

describe("tu-perfil: legibilidad", () => {
  it("los colores medidos siguen siendo los que pinta el módulo", () => {
    for (const c of ["#c9d8e5", "#9fb4c6", "#b6c8d8", "#5fd8ff", "#7fe0ff", "#2aa3ff"]) pinta(c);
    expect(modulo).toContain("rgba(8, 26, 46, 0.66)");
    expect(modulo).toContain("rgba(16, 40, 63, 0.7)");
    expect(modulo).toContain("rgba(4, 16, 30, 0.55)");
  });

  it("texto de las tarjetas sobre el cristal, también con el fondo iluminado", () => {
    for (const sobre of [BG, PEOR_FONDO]) {
      for (const color of ["#c9d8e5", "#9fb4c6", "#b6c8d8", token("text-primary")]) {
        expect(contraste(color, tarjeta(sobre)), `${color} sobre ${sobre}`).toBeGreaterThanOrEqual(
          AA.texto
        );
      }
    }
  });

  it("cumple, revisar y no cumple se leen sobre la fila del ejemplo", () => {
    for (const sobre of [BG, PEOR_FONDO]) {
      for (const estado of ["success", "warning", "danger"]) {
        expect(
          contraste(token(estado), fila(sobre)),
          `${estado} sobre ${sobre}`
        ).toBeGreaterThanOrEqual(AA.texto);
      }
    }
  });

  it("los tres estados son distinguibles entre sí por algo más que el color", () => {
    // Icono (✓ – ✕) y palabra viajan en el HTML; el color es refuerzo.
    const html = readFileSync(
      join(process.cwd(), "src/components/landing/tu-perfil/TuPerfil.jsx"),
      "utf8"
    );
    for (const estado of ["PASS", "WARN", "FAIL"]) expect(html).toContain(`${estado}:`);
  });

  it("el degradado del titular se lee en sus dos extremos sobre el fondo", () => {
    for (const color of ["#7fe0ff", "#2aa3ff"]) {
      expect(contraste(color, BG), color).toBeGreaterThanOrEqual(AA.texto);
    }
    expect(contraste("#5fd8ff", BG)).toBeGreaterThanOrEqual(AA.texto);
  });

  it("eyebrow y enlace secundario (cian) y botón principal (blanco sobre el azul)", () => {
    expect(contraste(token("accent"), BG)).toBeGreaterThanOrEqual(AA.texto);
    expect(contraste("#ffffff", token("accent-fill"))).toBeGreaterThanOrEqual(AA.texto);
  });
});
