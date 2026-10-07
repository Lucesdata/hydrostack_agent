import { describe, expect, it } from "vitest";
import { TIPOS_PROYECTO } from "@/src/lib/classify/tipo-proyecto";
import {
  criterioDe,
  FAMILIAS_DESTACADAS,
  fechaDeCierre,
  hrefDeFamilia,
  tiposDeFamilia,
} from "@/src/lib/landing/destacados-portada";
import { filtrosDesdeParams } from "@/src/lib/secop/filtros-vitrina";
import { tiposDeSistema } from "@/src/lib/secop/busqueda-guiada";

describe("familias de los destacados", () => {
  it("salen de los colores: potable = acueducto + PTAP, residual = PTAR, redes = alcantarillado", () => {
    expect(tiposDeFamilia("potable").sort()).toEqual(["acueducto", "ptap"]);
    expect(tiposDeFamilia("residual")).toEqual(["ptar"]);
    expect(tiposDeFamilia("redes")).toEqual(["alcantarillado"]);
    // Entre las tres cubren todos los tipos salvo `otros`, que no tiene pestaña.
    const cubiertos = FAMILIAS_DESTACADAS.flatMap(tiposDeFamilia).sort();
    expect(cubiertos).toEqual(TIPOS_PROYECTO.filter((t) => t !== "otros").sort());
  });

  it("«Ver más» lleva a la vitrina con EXACTAMENTE los tipos de la pestaña, por presupuesto", () => {
    for (const f of FAMILIAS_DESTACADAS) {
      const url = new URL(hrefDeFamilia(f), "https://x.co");
      expect(url.pathname).toBe("/licitaciones");
      const { filtros } = filtrosDesdeParams(url.searchParams);
      expect(filtros.orden, f).toBe("valor");
      expect(filtros.tipo, f).not.toBeNull();
      expect([...tiposDeSistema(filtros.tipo!)].sort(), f).toEqual(tiposDeFamilia(f).sort());
    }
  });
});

describe("criterioDe", () => {
  it("dice la regla y la fecha de cierre", () => {
    expect(criterioDe({ cierre: "2026-10-20", holgado: true })).toBe(
      "El de mayor presupuesto entre los que reciben ofertas 5 días o más. Cierre: 20 oct 2026."
    );
    expect(criterioDe({ cierre: "2026-10-08", holgado: false })).toBe(
      "El de mayor presupuesto entre los que reciben ofertas. Cierra pronto: 8 oct 2026."
    );
  });

  it("sin fecha legible no inventa una", () => {
    expect(criterioDe({ cierre: null, holgado: true })).toBe(
      "El de mayor presupuesto entre los que reciben ofertas 5 días o más."
    );
  });
});

describe("fechaDeCierre", () => {
  it("conserva el día de calendario de un DATE, sin correrlo a la víspera", () => {
    expect(fechaDeCierre("2026-01-01")).toBe("1 ene 2026");
    expect(fechaDeCierre("2026-12-31")).toBe("31 dic 2026");
    expect(fechaDeCierre("no es fecha")).toBeNull();
    expect(fechaDeCierre(null)).toBeNull();
  });
});
