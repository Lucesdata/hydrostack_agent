import { describe, expect, it } from "vitest";
import { clasificarFamiliasPersonal } from "../../lib/talent-intelligence/role-taxonomy";
import { extraerRequisitosPersonalDeTexto } from "../../lib/talent-intelligence/staff-requirements";

describe("Talent Intelligence V0: clasificación conservadora", () => {
  it("reconoce familias técnicas", () => {
    expect(
      clasificarFamiliasPersonal("Ingeniero sanitario y técnico de instrumentación"),
    ).toEqual(["ENG_SAN", "TECH_INST"]);
  });

  it("extrae experiencia y dedicación con fragmento literal", () => {
    const texto =
      "Se requiere ingeniero sanitario, experiencia general 5 años, experiencia específica 3 años y dedicación del 50%.";
    const [rol] = extraerRequisitosPersonalDeTexto(texto);
    expect(rol.familias).toEqual(["ENG_SAN"]);
    expect(rol.experienciaGeneralAnios).toBe(5);
    expect(rol.experienciaEspecificaAnios).toBe(3);
    expect(rol.dedicacionPorcentaje).toBe(50);
    expect(rol.tipo).toBe("obligatorio");
    expect(rol.evidencia).toEqual({
      fragmento: texto,
      literalEnEntrada: true,
      documentoVerificado: false,
    });
  });

  it("retiene alternativas sin exigir artificialmente ambas profesiones", () => {
    const [rol] = extraerRequisitosPersonalDeTexto(
      "Se requiere ingeniero civil o ingeniero sanitario para el equipo mínimo.",
    );
    expect(rol.familias).toEqual(["ENG_SAN", "ENG_CIV"]);
    expect(rol.cargoOriginal).toContain(" o ");
  });

  it("no genera requisito si el pliego niega expresamente el cargo", () => {
    expect(
      extraerRequisitosPersonalDeTexto("No se requiere ingeniero sanitario en este contrato."),
    ).toEqual([]);
  });

  it("distingue requisito puntuable de obligatorio", () => {
    const [rol] = extraerRequisitosPersonalDeTexto(
      "Se valorará experiencia del ingeniero ambiental en proyectos de agua.",
    );
    expect(rol.tipo).toBe("puntuable");
  });

  it("no presenta una mención simple como requisito obligatorio", () => {
    const [rol] = extraerRequisitosPersonalDeTexto(
      "Ingeniero mecánico mencionado en el informe de consultoría.",
    );
    expect(rol.tipo).toBe("por_verificar");
  });

  it("descarta líneas que pueden contener datos personales", () => {
    expect(
      extraerRequisitosPersonalDeTexto(
        "Ingeniero sanitario correo electronico nombre@ejemplo.com, experiencia general 5 años",
      ),
    ).toEqual([]);
  });

  it("no crea cargos con texto sin evidencia o solo título del proyecto", () => {
    expect(
      extraerRequisitosPersonalDeTexto("Construcción de planta de tratamiento de aguas residuales"),
    ).toEqual([]);
    expect(extraerRequisitosPersonalDeTexto("")).toEqual([]);
  });

  it("preserva la ubicación de línea del documento", () => {
    const [rol] = extraerRequisitosPersonalDeTexto(
      "Introducción\nSe requiere operador de PTAR con dedicación 100%.",
    );
    expect(rol.linea).toBe(2);
  });
});
