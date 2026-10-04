import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  criteriosDeAlerta,
  filtroDesdeVitrina,
  hayCriteriosDeAlerta,
  nombreDeAlerta,
} from "@/src/lib/secop/alerta-vitrina";
import { SIN_FILTROS } from "@/src/lib/secop/filtros-vitrina";
import { validarFiltro } from "@/src/lib/al/filtros/tipos";
import AlertaVitrina from "@/src/components/secop/vitrina/AlertaVitrina";

const BOYACA = { codigo: "15", label: "Boyacá" };
const COMPLETO = {
  ...SIN_FILTROS,
  q: "colector",
  tipo: "ptar" as const,
  departamento: "boyaca",
  presupuestoMin: 500 as const,
};

describe("cuándo se ofrece la alerta", () => {
  it("sin filtros, o solo con un orden, no hay nada que vigilar", () => {
    expect(hayCriteriosDeAlerta(SIN_FILTROS)).toBe(false);
    expect(hayCriteriosDeAlerta({ ...SIN_FILTROS, orden: "valor" })).toBe(false);
  });

  it("con cualquier criterio, sí", () => {
    expect(hayCriteriosDeAlerta({ ...SIN_FILTROS, tipo: "ptar" })).toBe(true);
    expect(hayCriteriosDeAlerta({ ...SIN_FILTROS, q: "x" })).toBe(true);
  });
});

describe("de la vitrina a un filtro guardado", () => {
  it("traduce cada criterio a su columna", () => {
    expect(filtroDesdeVitrina(COMPLETO, BOYACA)).toEqual({
      nombre: "PTAR · Boyacá · desde $500 M · «colector»",
      palabrasClave: ["colector"],
      tiposProyecto: ["ptar"],
      divipola: ["15"],
      valorMin: 500_000_000,
    });
  });

  it("un departamento que no se resolvió no se guarda", () => {
    expect(
      filtroDesdeVitrina({ ...SIN_FILTROS, departamento: "atlantida" }, null).divipola
    ).toEqual([]);
  });

  it("el cuerpo pasa la validación de /api/al/filtros tal cual", () => {
    const v = validarFiltro(filtroDesdeVitrina(COMPLETO, BOYACA));
    expect(v.error).toBeNull();
    expect(v.valor).toMatchObject({
      palabrasClave: ["COLECTOR"],
      tiposProyecto: ["ptar"],
      divipola: ["15"],
    });
    expect(Number(v.valor.valorMin)).toBe(500_000_000);
  });

  it("el nombre no pasa del largo que admite el filtro", () => {
    const largo = nombreDeAlerta({ ...SIN_FILTROS, q: "x".repeat(300) }, null);
    expect(largo.length).toBeLessThanOrEqual(120);
    expect(validarFiltro({ nombre: largo }).error).toBeNull();
  });

  it("resume en frases lo que va a vigilar", () => {
    expect(criteriosDeAlerta(COMPLETO, BOYACA)).toEqual([
      "Tipo de obra: PTAR",
      "Entidad en Boyacá",
      "Presupuesto desde $500 M",
      "Que el proceso mencione «colector»",
    ]);
  });
});

describe("AlertaVitrina — HTML del servidor", () => {
  const html = (conBusqueda: boolean) =>
    renderToStaticMarkup(
      <AlertaVitrina
        cuerpo={filtroDesdeVitrina(COMPLETO, BOYACA)}
        criterios={criteriosDeAlerta(COMPLETO, BOYACA)}
        conBusqueda={conBusqueda}
      />
    );

  it("va plegada, con lo que va a vigilar y el nombre editable", () => {
    const h = html(true);
    expect(h).toMatch(/^<details class="va"><summary class="va-resumen">🔔 Avisarme/);
    expect(h).toContain("<li>Entidad en Boyacá</li>");
    expect(h).toContain('value="PTAR · Boyacá · desde $500 M · «colector»"');
  });

  it("avisa de la diferencia solo si hay texto buscado", () => {
    expect(html(true)).toContain("no en la entidad ni el municipio");
    expect(html(false)).not.toContain("no en la entidad ni el municipio");
  });
});
