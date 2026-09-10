import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SECCIONES_HOME } from "@/src/components/landing/seccionesHome";

const RAIZ = path.resolve(__dirname, "../../../app");

/** ¿`/mis-filtros` tiene una page en `app/mis-filtros/`? Soporta .js y .tsx. */
function existeRuta(href: string): boolean {
  const limpio = href.split("?")[0].split("#")[0].replace(/^\//, "");
  const dir = path.join(RAIZ, limpio);
  if (!fs.existsSync(dir)) return false;
  return ["page.tsx", "page.ts", "page.jsx", "page.js"].some((f) =>
    fs.existsSync(path.join(dir, f))
  );
}

describe("enlaces del home", () => {
  it.each(SECCIONES_HOME)("$id apunta a una página que existe ($href)", ({ href }) => {
    expect(existeRuta(href), `${href} no tiene page en app/`).toBe(true);
  });

  it("ninguna sección enlaza a /terms o /privacy, que no existen", () => {
    const rotos = SECCIONES_HOME.filter((s) => ["/terms", "/privacy"].includes(s.href));
    expect(rotos).toEqual([]);
  });

  it("no hay ids duplicados", () => {
    const ids = SECCIONES_HOME.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
