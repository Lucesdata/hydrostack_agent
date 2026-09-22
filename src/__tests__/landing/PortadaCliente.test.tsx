import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PortadaCliente from "@/src/components/landing/PortadaCliente";

function contentOfDivWithClass(html: string, className: string) {
  const opening = html.match(new RegExp(`<div\\b[^>]*class="${className}"[^>]*>`));
  if (!opening || opening.index === undefined) return "";

  const contentStart = opening.index + opening[0].length;
  const tags = /<div\b[^>]*>|<\/div>/g;
  tags.lastIndex = contentStart;
  let depth = 1;
  let match;

  while ((match = tags.exec(html))) {
    if (match[0].startsWith("</div>")) depth -= 1;
    else depth += 1;
    if (depth === 0) return html.slice(contentStart, match.index);
  }

  return "";
}

describe("PortadaCliente", () => {
  it("renderiza el mapa del servidor dentro del hero", () => {
    const html = renderToStaticMarkup(
      <PortadaCliente mapa={<div data-testid="mapa-departamental">Mapa departamental</div>} />
    );

    const hero = contentOfDivWithClass(html, "bp-hero-grid");

    expect(hero).toContain('class="bp-hero-mapa"');
    expect(hero).toContain('data-testid="mapa-departamental"');
    expect(html.match(/data-testid="mapa-departamental"/g)).toHaveLength(1);
  });
});
