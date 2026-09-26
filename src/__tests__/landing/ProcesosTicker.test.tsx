import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ProcesosTicker, { frase, mapApiItem } from "@/src/components/landing/ProcesosTicker";

const base = {
  id: "CO1.REQ.1",
  objeto: "OPTIMIZACIÓN DE LA PTAR MUNICIPAL",
  entidad: "MUNICIPIO DE CHINU",
  tipoProyecto: "ptar",
  departamento: "CÓRDOBA",
  municipio: "CHINÚ",
  valorEstimado: 4_280_000_000,
  estado: "Publicado",
  ficha: "/licitaciones/optimizacion-de-la-ptar--CO1.REQ.1",
};

describe("ticker de fichas recientes", () => {
  it("el objeto en mayúsculas pasa a frase y conserva las siglas del sector", () => {
    expect(frase("OPTIMIZACIÓN DE LA PTAR MUNICIPAL")).toBe("Optimización de la PTAR municipal");
    expect(frase("Ampliación de la PTAR El Salitre")).toBe("Ampliación de la PTAR El Salitre");
  });

  it("cada elemento enlaza su ficha, y la lista solo si no hay ficha", () => {
    expect(mapApiItem(base).href).toBe(base.ficha);
    expect(mapApiItem({ ...base, ficha: null }).href).toBe("/licitaciones");
  });

  it("lleva tipo con color y monto; sin tipo no inventa uno", () => {
    const item = mapApiItem(base);
    expect(item.tipo.label).toBe("PTAR");
    expect(item.tipo.color.familia).toBe("residual");
    expect(item.valor).toBe("$4.280 M");
    expect(mapApiItem({ ...base, tipoProyecto: null }).tipo).toBeNull();
  });

  it("antes de cargar dice que carga fichas, sin datos ficticios", () => {
    const html = renderToStaticMarkup(<ProcesosTicker />);
    expect(html).toContain("Cargando fichas");
    expect(html).not.toContain('class="ptr-item"');
  });
});
