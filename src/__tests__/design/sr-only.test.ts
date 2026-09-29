import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

/**
 * `.sr-only` se usaba en la ficha y en la subida del pliego sin estar definida,
 * así que el texto pensado solo para lectores de pantalla salía en pantalla.
 * Este test ata el uso a la definición.
 */
const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

describe(".sr-only", () => {
  it("está definida en globals.css y oculta a la vista sin ocultar al lector", () => {
    const regla = css.match(/\.sr-only\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(regla, "no hay regla .sr-only en globals.css").not.toBe("");
    expect(regla).toContain("clip: rect(0, 0, 0, 0)");
    expect(regla).toContain("position: absolute");
    expect(regla).not.toMatch(/display:\s*none|visibility:\s*hidden/);
  });

  it("sigue usándose (si nadie la usa, sobra)", () => {
    const usos = execSync('grep -rl "sr-only" app src --include=*.tsx --include=*.jsx', {
      encoding: "utf8",
    });
    // La ficha dejó de usarla el 2026-09-28, al quitar las filas grises de
    // «Análisis de oferta»; la siguen usando la subida del pliego y el comparador.
    expect(usos.trim().split("\n").filter(Boolean).length).toBeGreaterThan(0);
    expect(usos).toContain("src/components/secop/PliegoUploadBlock.tsx");
  });
});
