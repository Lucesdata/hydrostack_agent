import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import ComoRazonaFicha from "@/src/components/landing/ficha-viva/ComoRazonaFicha";
import { FAMILIAS } from "@/src/lib/classify/tipo-color";

/**
 * «Cómo razona la ficha»: el esquema, el árbol, el aviso de lo que aún no hace
 * y la leyenda de color. Salieron de la portada el 2026-09-28 y viven en
 * /licitaciones/como-participar. Son los casos que antes vigilaban la Ficha Viva.
 */
const html = renderToStaticMarkup(<ComoRazonaFicha />);

describe("ComoRazonaFicha", () => {
  it("dice «todavía no puedo determinarlo» en vez de adivinar", () => {
    expect(html).toContain("Todavía no puedo determinarlo");
    expect(html).toContain("todavía no puedo determinarlo");
  });

  it("marca el seguimiento de cambios como en construcción", () => {
    expect(html).toContain("Seguir sus cambios");
    expect(html).toContain("En construcción");
  });

  it("rotula el esquema como ilustrativo y no pinta cifras", () => {
    expect(html).toContain("Esquema ilustrativo");
    const esquema = html.slice(html.indexOf("<figure"), html.indexOf("</figure>"));
    // Solo el texto visible, sin las chinchetas numeradas (aria-hidden).
    const texto = esquema
      .replace(/<span[^>]*aria-hidden="true"[^>]*>\d<\/span>/g, "")
      .replace(/<[^>]+>/g, " ");
    expect(texto).not.toMatch(/\d/);
  });

  it("explica el color con el tono para fondo claro: la página es clara", () => {
    for (const f of FAMILIAS) {
      expect(html).toContain(f.label);
      expect(html).toContain(`--tipo:${f.claro}`);
    }
    expect(html).toContain("El estado va aparte");
  });

  it("lo monta «Cómo participar», con el ancla que enlaza la portada", () => {
    const pagina = readFileSync("src/components/secop/ComoParticipar.tsx", "utf8");
    expect(pagina).toContain("<ComoRazonaFicha />");
    expect(pagina).toContain('id="como-razona"');
  });
});
