import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ResumenDepartamento from "@/src/components/landing/hero-territorial/ResumenDepartamento";

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

  it("sin departamento no pinta nada", () => {
    expect(renderToStaticMarkup(<ResumenDepartamento departamento={null} />)).toBe("");
  });
});
