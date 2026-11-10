import { describe, expect, it } from "vitest";
import { extraerRequisitosPersonalDeTexto } from "../../lib/talent-intelligence/staff-requirements";

/**
 * Casos SINTÉTICOS, redactados a partir de categorías observadas en:
 * FINDETER, estudios previos PTAP Socorro (2016), apartado 4.3.1.2.
 * https://www.findeter.gov.co/system/files/convocatorias/PAF-ATF-O-011-2016/PAF-ATF-O-011-2016%40Ep_Obra_Socorro_Ptap_%28002%29.pdf
 *
 * NO son citas del documento, NO validan la fidelidad de pdftotext,
 * NO representan vacantes vigentes. Sin nombres ni información personal.
 */
describe("Talent Intelligence: cobertura de categorías PTAP Socorro", () => {
  it("detecta siete familias de cargos observables en una tabla de obra", () => {
    const texto = [
      "Se requiere Director del Proyecto para la obra.",
      "Se requiere Residente de Obra durante la ejecución.",
      "Se requiere Especialista Ambiental para seguimiento de obras.",
      "Se requiere Profesional Social para coordinación comunitaria.",
      "Se requiere Especialista electromecánico para montaje.",
      "Se requiere Supervisor de Seguridad Industrial y Salud Ocupacional.",
      "Se requiere Topógrafo para levantamientos de obra.",
    ].join("\n");

    const requisitos = extraerRequisitosPersonalDeTexto(texto);
    expect(requisitos).toHaveLength(7);
    expect(requisitos.map((r) => r.familias)).toEqual([
      ["MGMT_PROJECT"],
      ["MGMT_PROJECT"],
      ["ENG_ENV"],
      ["SOCIAL"],
      ["TECH_EM"],
      ["SST"],
      ["TOPO"],
    ]);
    expect(requisitos.every((r) => r.tipo === "obligatorio")).toBe(true);
    expect(requisitos.every((r) => r.evidencia.documentoVerificado === false)).toBe(true);
  });

  it("no asigna un año o porcentaje a un cargo que no lo declara", () => {
    const [requisito] = extraerRequisitosPersonalDeTexto(
      "Se requiere Topógrafo para actividades de campo."
    );
    expect(requisito.experienciaGeneralAnios).toBeNull();
    expect(requisito.dedicacionPorcentaje).toBeNull();
  });
});
