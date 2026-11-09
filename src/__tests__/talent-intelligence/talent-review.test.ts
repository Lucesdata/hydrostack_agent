import { describe, expect, it } from "vitest";
import { extraerPersonalPorPaginas } from "../../lib/talent-intelligence/document-requirements";
import { prepararRevisionPersonal } from "../../lib/talent-intelligence/talent-review";

describe("Talent Intelligence: salida interna para revisión humana", () => {
  it("conserva experiencia solo en texto lineal y sin certificar el documento", () => {
    const paginas = [
      {
        numero: 2,
        texto: "Se requiere ingeniero sanitario con experiencia general 5 años y dedicación 50%.",
      },
    ];
    const [entrada] = extraerPersonalPorPaginas("doc-01", paginas);
    const [vista] = prepararRevisionPersonal([entrada], paginas);
    expect(vista.experienciaGeneralAnios).toBe(5);
    expect(vista.dedicacionPorcentaje).toBe(50);
    expect(vista.visibilidad).toBe("revision_interna");
    expect(vista.esVacante).toBe(false);
    expect(vista.motivosRevision).toContain("documento_no_verificado");
  });

  it("oculta valores numéricos cuando Poppler puede haber mezclado columnas", () => {
    const paginas = [
      {
        numero: 4,
        texto: "Se requiere ingeniero sanitario    experiencia general 5 años    dedicación 50%.",
      },
    ];
    const entradas = extraerPersonalPorPaginas("doc-02", paginas);
    const [vista] = prepararRevisionPersonal(entradas, paginas);
    expect(vista.motivosRevision).toContain("tabla_probable");
    expect(vista.experienciaGeneralAnios).toBeNull();
    expect(vista.dedicacionPorcentaje).toBeNull();
  });

  it("no atribuye años a un cargo alternativo cuando coexisten profesiones", () => {
    const paginas = [
      {
        numero: 1,
        texto: "Se requiere ingeniero civil o ingeniero sanitario con experiencia general 5 años.",
      },
    ];
    const [vista] = prepararRevisionPersonal(
      extraerPersonalPorPaginas("doc-03", paginas),
      paginas
    );
    expect(vista.motivosRevision).toContain("cargos_multiples");
    expect(vista.experienciaGeneralAnios).toBeNull();
  });

  it("falla si no recibe la página original para comprobar la línea", () => {
    const paginas = [{ numero: 3, texto: "Se requiere topógrafo para levantamiento." }];
    const entradas = extraerPersonalPorPaginas("doc-04", paginas);
    expect(() => prepararRevisionPersonal(entradas, [])).toThrow("Falta página");
  });
});
