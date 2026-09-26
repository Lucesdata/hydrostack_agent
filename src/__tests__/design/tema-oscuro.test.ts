import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AA, contraste, leerTokensHex } from "@/src/lib/design/contraste";

/**
 * El tema oscuro de la portada (`.tema-oscuro` en globals.css, 2026-09-26).
 * Redefine los tokens para todo lo que cuelga de la portada, así que cada
 * combinación de texto sobre fondo que el tema claro ya medía
 * (contraste.test.ts) se mide aquí otra vez con los valores oscuros.
 */
const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
const bloque = (selector: string) => {
  const i = css.indexOf(`${selector} {`);
  expect(i, `${selector} no está en globals.css`).toBeGreaterThanOrEqual(0);
  // Hasta la llave de cierre del bloque (en su propia línea): un comentario
  // dentro del bloque puede contener "}".
  return css.slice(i, css.indexOf("\n}", i));
};
const t = leerTokensHex(bloque(".tema-oscuro"));
const fondos = { "--bg": t.bg, "--surface": t.surface, "--surface-alt": t["surface-alt"] };

describe("tema oscuro de la portada", () => {
  it("redefine los alias además de los tokens base", () => {
    // En :root, --text-primary ya se resolvió contra el claro: sin redefinirlo
    // aquí, el texto heredado seguiría siendo oscuro sobre fondo oscuro.
    for (const k of ["text-primary", "text-muted", "border", "accent-deep", "card"]) {
      expect(t[k], `--${k}`).toBeTruthy();
    }
  });

  for (const [nombre, fondo] of Object.entries(fondos)) {
    it(`texto, secundario, enlaces y estados se leen sobre ${nombre}`, () => {
      for (const k of [
        "text-primary",
        "text-muted",
        "ink-300",
        "accent",
        "success",
        "warning",
        "danger",
      ]) {
        expect(contraste(t[k], fondo), `--${k} sobre ${nombre}`).toBeGreaterThanOrEqual(AA.texto);
      }
    });
  }

  it("el blanco de los botones se lee sobre --accent-fill y su hover", () => {
    expect(contraste("#ffffff", t["accent-fill"])).toBeGreaterThanOrEqual(AA.texto);
    expect(contraste("#ffffff", t["accent-fill-hover"])).toBeGreaterThanOrEqual(AA.texto);
  });

  it("en claro, --accent-fill también sostiene el blanco (y .tema-claro repite el claro)", () => {
    const claro = leerTokensHex(bloque(".tema-claro"));
    const raiz = leerTokensHex(bloque(":root"));
    expect(contraste("#ffffff", raiz["accent-fill"])).toBeGreaterThanOrEqual(AA.texto);
    // Los alias de :root son var(--…): se comparan contra su token base.
    const base: Record<string, string> = { "text-primary": "ink-900", "text-muted": "ink-600" };
    for (const k of ["bg", "surface", "text-primary", "text-muted", "accent", "accent-fill"]) {
      expect(claro[k], `.tema-claro --${k}`).toBe(raiz[base[k] ?? k]);
    }
  });
});
