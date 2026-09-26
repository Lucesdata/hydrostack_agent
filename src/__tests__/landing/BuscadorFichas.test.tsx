import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import BuscadorFichas, {
  resultadoDeBusqueda,
  urlExplorador,
} from "@/src/components/landing/hero-territorial/BuscadorFichas";

const base = {
  id: "CO1.REQ.123456",
  nombre: "OPTIMIZACIÓN DE LA PTAR MUNICIPAL",
  descripcion: "",
  entidad: "MUNICIPIO DE CHINU",
  ciudad: "CHINÚ",
  departamento: "CÓRDOBA",
  precioBase: 4_280_000_000,
};

describe("resultadoDeBusqueda", () => {
  it("enlaza la ficha con el mismo slug que el resto del sitio", () => {
    const r = resultadoDeBusqueda(base);
    expect(r.href).toBe("/licitaciones/optimizacion-de-la-ptar-municipal--CO1.REQ.123456");
    expect(r.objeto).toBe("Optimización de la PTAR municipal");
    expect(r.detalle).toBe("Municipio de Chinu · Chinú, Córdoba");
    expect(r.monto).toBe("$4.280 M");
  });

  it("sin id de ficha no inventa un enlace, y sin presupuesto no inventa monto", () => {
    expect(resultadoDeBusqueda({ ...base, id: "abc-123" }).href).toBeNull();
    expect(resultadoDeBusqueda({ ...base, precioBase: 0 }).monto).toBeNull();
  });
});

describe("BuscadorFichas", () => {
  it("sin JS es un formulario GET al explorador con ?q=", () => {
    const html = renderToStaticMarkup(<BuscadorFichas />);
    expect(html).toContain('role="search"');
    expect(html).toContain('action="/licitaciones/explorar"');
    expect(html).toContain('name="q"');
  });

  it("promete buscar solo por lo que la API busca", () => {
    const html = renderToStaticMarkup(<BuscadorFichas />);
    expect(html).toContain("entidad u objeto");
    expect(html).not.toMatch(/municipio/i);
  });

  it("codifica la búsqueda para el explorador", () => {
    expect(urlExplorador(" acueducto rural ")).toBe("/licitaciones/explorar?q=acueducto%20rural");
  });
});
