import { describe, expect, it } from "vitest";
import {
  CORPUS_TALENT_V0,
  ESTADO_CORPUS_TALENT_V0,
} from "../../lib/talent-intelligence/validation-corpus";
import { extraerRequisitosPersonalDeTexto } from "../../lib/talent-intelligence/staff-requirements";

/**
 * Este banco de pruebas es una evaluación SINTÉTICA del clasificador sobre
 * categorías de cargos documentadas. No ejecuta pdftotext sobre los originales.
 */
describe("Talent Intelligence: corpus documental catalogado", () => {
  it("mantiene diez fuentes institucionales distintas sin afirmar verificación", () => {
    expect(CORPUS_TALENT_V0).toHaveLength(10);
    expect(new Set(CORPUS_TALENT_V0.map((x) => x.id)).size).toBe(10);
    expect(ESTADO_CORPUS_TALENT_V0).toBe("catalogado_sin_validacion_visual");
    for (const caso of CORPUS_TALENT_V0) {
      expect(new URL(caso.url).hostname).toBe("www.findeter.gov.co");
      expect(caso.referencia.length).toBeGreaterThan(10);
      expect(caso.perfilesObservados.length).toBeGreaterThan(0);
    }
  });

  it.each([
    ["Se requiere director de obra para planta de tratamiento.", "MGMT_PROJECT"],
    ["Se requiere director de interventoría de redes.", "CONS_SUP"],
    ["Se requiere especialista en geotecnia para las obras.", "GEO"],
    ["Se requiere especialista en hidrología para estudios.", "HYDROLOGY"],
    ["Se requiere cadenero para levantamientos topográficos.", "FIELD_SURVEY"],
    ["Se requiere maestro de obra para el proyecto.", "FIELD_BUILD"],
  ])("reconoce el cargo normalizado en un ejemplo sintético", (texto, familia) => {
    const candidatos = extraerRequisitosPersonalDeTexto(texto);
    expect(candidatos).toHaveLength(1);
    expect(candidatos[0].familias).toContain(familia);
    expect(candidatos[0].evidencia.documentoVerificado).toBe(false);
  });

  it("nunca completa dedicación o experiencia que no aparezca en el texto", () => {
    const [requisito] = extraerRequisitosPersonalDeTexto(
      "Se requiere especialista en geotecnia para revisar los diseños."
    );
    expect(requisito.experienciaGeneralAnios).toBeNull();
    expect(requisito.dedicacionPorcentaje).toBeNull();
  });
});
