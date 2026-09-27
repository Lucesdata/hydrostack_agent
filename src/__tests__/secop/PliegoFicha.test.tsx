import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// La acción de servidor arrastra la base; aquí solo importa el marcado.
vi.mock("@/src/lib/secop/pliego-actions", () => ({ subirPliegoDesdeFichaAction: vi.fn() }));

import PliegoFicha from "@/src/components/secop/ficha/PliegoFicha";
import type { PliegoFicha as Pliego } from "@/src/lib/secop/pliego-ficha";

const PLIEGO: Pliego = {
  nombreArchivo: "documento-base.pdf",
  actualizado: "2026-09-27T10:00:00.000Z",
  consistente: false,
  confianza: "media",
  presupuestoOficialCop: null,
  fechaCierre: null,
  requisitos: [
    { clave: "experiencia_especifica", etiqueta: "Experiencia específica", texto: "Dos contratos" },
    { clave: "capacidad_financiera", etiqueta: "Capacidad financiera", texto: null },
    { clave: "capacidad_organizacional", etiqueta: "Capacidad organizacional", texto: null },
  ],
  causales: ["Se rechaza la oferta que supere el presupuesto oficial."],
  cronograma: [],
  capitulos: [],
  lagunas: [],
  origen: { requisitos: "reglas", causales: "llm", capitulos: "llm" },
};

const SLUG = "construccion-de-ptar--CO1.REQ.42";

describe("PliegoFicha (§4 de la ficha)", () => {
  it("sin pliego: dice qué falta, enlaza el expediente y ofrece subirlo aquí", () => {
    const html = renderToStaticMarkup(
      <PliegoFicha pliego={null} slug={SLUG} urlSecop="https://community.secop.gov.co/x" />
    );
    expect(html).toContain("Todavía no hay pliego procesado");
    expect(html).toContain('href="https://community.secop.gov.co/x"');
    expect(html).toContain(`name="slug" value="${SLUG}"`);
    expect(html).toContain('name="file"');
    expect(html).toContain('name="formulario1"');
    expect(html).toContain("Procesar pliego");
    expect(html).not.toContain("<details");
  });

  it("con pliego: lo no declarado se dice, no se inventa, y cada bloque dice su origen", () => {
    const html = renderToStaticMarkup(<PliegoFicha pliego={PLIEGO} slug={SLUG} urlSecop={null} />);
    expect(html).toContain("Dos contratos");
    expect(html.match(/El pliego no lo declara\./g)).toHaveLength(3); // dos requisitos y el presupuesto
    expect(html).toContain("leído con reglas deterministas");
    expect(html).toContain("leído por el modelo; compruébalo en el pliego");
    expect(html).toContain("el presupuesto no cuadra ítem a ítem");
    expect(html).toContain("Se rechaza la oferta que supere el presupuesto oficial.");
  });

  it("con pliego, el formulario se pliega para reemplazarlo", () => {
    const html = renderToStaticMarkup(<PliegoFicha pliego={PLIEGO} slug={SLUG} urlSecop={null} />);
    expect(html).toContain("<details");
    expect(html).toContain("Procesar y reemplazar");
  });
});
