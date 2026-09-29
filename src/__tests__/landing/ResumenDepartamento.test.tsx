import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ResumenDepartamento from "@/src/components/landing/hero-territorial/ResumenDepartamento";

const destacado = {
  id: "CO1.REQ.1",
  objeto: "OPTIMIZACIÓN DE LA PTAR MUNICIPAL",
  entidad: "MUNICIPIO DE CHINU",
  tipoProyecto: "ptar",
  departamento: "CÓRDOBA",
  municipio: "CHINÚ",
  valorEstimado: 4_280_000_000,
  estadoApertura: "Abierto",
  fechaRecepcion: null,
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

  it("sin departamento habla del país; sin destacados dice «—»", () => {
    const html = renderToStaticMarkup(<ResumenDepartamento departamento={null} />);
    expect(html).toContain("Procesos abiertos de mayor presupuesto en Colombia");
    expect(html).toContain('<p class="aqResumenNota">—</p>');
    expect(html).not.toContain("Cargando…");
  });

  it("vista país sin procesos abiertos lo dice", () => {
    const html = renderToStaticMarkup(
      <ResumenDepartamento departamento={null} destacadosPais={[]} />
    );
    expect(html).toContain("Sin procesos abiertos");
    expect(html).not.toContain("aqGancho");
  });

  it("cada destacado lleva el semáforo absoluto y ya no el importe (v2)", () => {
    const html = renderToStaticMarkup(
      <ResumenDepartamento departamento={null} destacadosPais={[destacado]} />
    );
    expect(html).toContain("Optimización de la PTAR municipal");
    expect(html).toContain("Municipio de Chinu · Chinú");
    // El importe lo enuncia la compuerta Cuantía, no una columna aparte.
    expect(html).not.toContain("aqDestValor");
    expect(html).toContain("Cuantía");
    expect(html.match(/\$4\.280 M|\$\s?4\.280/g)?.length ?? 0).toBeGreaterThanOrEqual(1);
    expect(html.match(/sf-punto--dato/g)).toHaveLength(4);
    expect(html).not.toMatch(/sf-punto--(pass|warn|fail)/);
    expect(html).toContain("Córdoba");
  });

  it("en el hero, dos filas y sin Habilitación, que aquí siempre dice «sin datos» (1366×768)", () => {
    const tres = [1, 2, 3].map((i) => ({
      ...destacado,
      id: `CO1.REQ.${i}`,
      objeto: `OBRA NÚMERO ${i}`,
      ficha: `/licitaciones/obra--CO1.REQ.${i}`,
    }));
    const html = renderToStaticMarkup(
      <ResumenDepartamento departamento={null} destacadosPais={tres} />
    );
    expect(html.match(/<li>/g)).toHaveLength(2);
    expect(html).not.toContain("CO1.REQ.3");
    expect(html).not.toContain("Habilitación");
    expect(html.match(/class="sf-item"/g)).toHaveLength(8);
  });

  it("con destacados invita a crear perfil", () => {
    const html = renderToStaticMarkup(
      <ResumenDepartamento departamento={null} destacadosPais={[destacado]} />
    );
    expect(html).toContain('class="aqGancho"');
    expect(html).toContain('<a href="/registro">Crea tu perfil</a>');
  });
});
