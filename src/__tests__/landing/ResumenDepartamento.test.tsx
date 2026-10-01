import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ResumenDepartamento, {
  ListaDestacados,
} from "@/src/components/landing/hero-territorial/ResumenDepartamento";
import { mapApiItem } from "@/src/components/landing/proceso-resumen";

const destacado = {
  id: "CO1.REQ.1",
  objeto: "OPTIMIZACIÓN DE LA PTAR MUNICIPAL",
  entidad: "MUNICIPIO DE CHINU",
  tipoProyecto: "ptar",
  departamento: "CÓRDOBA",
  municipio: "CHINÚ",
  valorEstimado: 4_280_000_000,
  ficha: "/licitaciones/optimizacion-de-la-ptar--CO1.REQ.1",
};

describe("ResumenDepartamento", () => {
  it("antes de cargar dice que carga, sin filas ficticias", () => {
    const html = renderToStaticMarkup(
      <ResumenDepartamento departamento={{ clave: "05", label: "Antioquia" }} />
    );
    expect(html).toContain("Mayor presupuesto abierto");
    expect(html).toContain("Procesos abiertos de mayor presupuesto en Antioquia");
    expect(html).toContain("Cargando…");
    expect(html).not.toContain("aqDestacados");
  });

  it("ya no pinta la serie de publicados por semana (2026-09-28)", () => {
    const html = renderToStaticMarkup(
      <ResumenDepartamento departamento={{ clave: "05", label: "Antioquia" }} />
    );
    expect(html).not.toContain("Publicados por semana");
    expect(html).not.toContain("aqSpark");
  });

  it("sin departamento (vista país) no pinta nada: no hay consulta nacional", () => {
    expect(renderToStaticMarkup(<ResumenDepartamento departamento={null} />)).toBe("");
  });
});

/** Como llega de /api/departamento/[dpto]/resumen, pasado por mapApiItem. */
const pintar = (filas: (typeof destacado)[]) =>
  renderToStaticMarkup(<ListaDestacados destacados={filas.map(mapApiItem)} />);

describe("ListaDestacados", () => {
  it("cada destacado lleva el semáforo absoluto y ya no el importe (v2)", () => {
    const html = pintar([destacado]);
    expect(html).toContain("Optimización de la PTAR municipal");
    expect(html).toContain("Municipio de Chinu · Chinú");
    // El importe lo enuncia la compuerta Cuantía, no una columna aparte.
    expect(html).not.toContain("aqDestValor");
    expect(html).toContain("Cuantía");
    expect(html).toMatch(/\$4\.280 M|\$\s?4\.280/);
    expect(html).toContain("Córdoba");
    expect(html).not.toMatch(/sf-punto--(pass|warn|fail)/);
  });

  it("la API no trae plazo: la compuerta sale «sin datos», no se deduce", () => {
    const html = pintar([destacado]);
    // Sector, Cuantía y Zona con dato; Plazo sin él.
    expect(html.match(/sf-punto--dato/g)).toHaveLength(3);
    expect(html.match(/sf-punto--unknown/g)).toHaveLength(1);
    expect(html).toMatch(/Plazo<\/span><span class="sf-palabra">sin datos/);
  });

  it("en el hero, dos filas y sin Habilitación, que aquí siempre dice «sin datos» (1366×768)", () => {
    const tres = [1, 2, 3].map((i) => ({
      ...destacado,
      id: `CO1.REQ.${i}`,
      objeto: `OBRA NÚMERO ${i}`,
      ficha: `/licitaciones/obra--CO1.REQ.${i}`,
    }));
    const html = pintar(tres);
    expect(html.match(/<li>/g)).toHaveLength(2);
    expect(html).not.toContain("CO1.REQ.3");
    expect(html).not.toContain("Habilitación");
    expect(html.match(/class="sf-item"/g)).toHaveLength(8);
  });

  it("invita a crear perfil", () => {
    const html = pintar([destacado]);
    expect(html).toContain('class="aqGancho"');
    expect(html).toContain('<a href="/registro">Crea tu perfil</a>');
  });
});
