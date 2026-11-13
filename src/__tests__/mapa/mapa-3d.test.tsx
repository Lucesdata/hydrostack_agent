import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PaginaMapa from "@/app/mapa-3d/page";

describe("/mapa-3d", () => {
  it("entrega los 33 territorios y la vista 2D antes de cargar WebGL", () => {
    const html = renderToStaticMarkup(<PaginaMapa />);
    expect(html).toContain("Mapa de proyectos adjudicados");
    expect(html.match(/<option value="\d{2}"/g)).toHaveLength(33);
    expect(html.match(/<path /g)).toHaveLength(33);
    expect(html).toContain('value="11"');
    expect(html).toContain('value="88"');
    expect(html).not.toContain("<canvas");
  });
});
