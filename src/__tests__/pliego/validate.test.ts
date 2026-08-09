import { describe, it, expect } from "vitest";
import { validatePliego } from "@/src/lib/pliego/validate";
import { parsePliegoExtraction, type PliegoExtraction } from "@/src/lib/pliego/schema";

function item(o: Partial<PliegoExtraction["capitulos"][number]["items"][number]> = {}) {
  return {
    codigo: "1.1.73.1.1",
    descripcion: "x",
    unidad: "GLB",
    cantidad: 1,
    valor_unitario: 1000,
    valor_total: 1000,
    cita_textual: "ítem x — 1000 GLB",
    ...o,
  };
}

function laguna(o: Partial<PliegoExtraction["lagunas_pendientes"][number]> = {}) {
  return {
    id: 1,
    descripcion: "numeración distinta para el mismo ítem entre secciones",
    severidad: "alta" as const,
    tipo: "inconsistencia interna del pliego",
    ...o,
  };
}

function extraction(o: Partial<PliegoExtraction> = {}): PliegoExtraction {
  return {
    proceso: "P-1",
    entidad: "E",
    objeto_contrato: "NO_ENCONTRADO",
    modalidad_contratacion: "NO_ENCONTRADO",
    fecha_publicacion: "NO_ENCONTRADO",
    fecha_cierre: "NO_ENCONTRADO",
    presupuesto_oficial_cop: 1000,
    moneda: "COP",
    capitulos: [{ nombre: "Cap A", items: [item()] }],
    reglas_presupuesto: [],
    requisitos_habilitantes: {
      experiencia_especifica: "NO_ENCONTRADO",
      capacidad_financiera: "NO_ENCONTRADO",
      capacidad_organizacional: "NO_ENCONTRADO",
    },
    cronograma: [],
    verificacion: {
      campos_no_encontrados: [],
      confianza_general: "alta",
      justificacion_confianza: "documento legible y completo",
    },
    lagunas_pendientes: [],
    ...o,
  };
}

// --- validatePliego ---------------------------------------------------------

describe("validatePliego", () => {
  it("acepta una extracción consistente", () => {
    const r = validatePliego(extraction());
    expect(r.ok).toBe(true);
    expect(r.inconsistencias).toEqual([]);
  });

  it("tolera el redondeo al peso (±1)", () => {
    const r = validatePliego(
      extraction({
        presupuesto_oficial_cop: 333,
        capitulos: [
          { nombre: "A", items: [item({ cantidad: 3, valor_unitario: 111, valor_total: 333 })] },
        ],
      })
    );
    expect(r.ok).toBe(true);
  });

  it("detecta descuadre aritmético en un ítem", () => {
    const r = validatePliego(
      extraction({
        capitulos: [
          { nombre: "A", items: [item({ cantidad: 2, valor_unitario: 1000, valor_total: 1500 })] },
        ],
      })
    );
    expect(r.ok).toBe(false);
    expect(r.inconsistencias).toHaveLength(1);
    expect(r.inconsistencias[0].tipo).toBe("aritmetica_item");
  });

  it("detecta cita_textual faltante en un ítem (grounding roto)", () => {
    const r = validatePliego(
      extraction({
        capitulos: [{ nombre: "A", items: [item({ cita_textual: "  " })] }],
      })
    );
    expect(r.ok).toBe(false);
    expect(r.inconsistencias.some((i) => i.tipo === "cita_faltante")).toBe(true);
  });

  it("detecta capítulos duplicados (nombre normalizado)", () => {
    const r = validatePliego(
      extraction({
        capitulos: [
          { nombre: "Cap A", items: [item()] },
          { nombre: " cap a ", items: [item()] },
        ],
      })
    );
    expect(r.inconsistencias.some((i) => i.tipo === "capitulo_duplicado")).toBe(true);
    expect(r.ok).toBe(false);
  });

  it("la suma vs presupuesto es nota informativa, no falla la extracción", () => {
    // valor_total pre-IVA suma 1000; presupuesto con IVA = 1190.
    const r = validatePliego(extraction({ presupuesto_oficial_cop: 1190 }));
    expect(r.ok).toBe(true); // aritmética por ítem OK → no falla
    expect(r.notas).toHaveLength(1);
    expect(r.notas[0]).toContain("1190");
  });

  it("usa el codigo del ítem en la ubicación cuando está presente", () => {
    const r = validatePliego(
      extraction({
        capitulos: [
          {
            nombre: "A",
            items: [
              item({ codigo: "1.1.73.1.1", cantidad: 2, valor_unitario: 1000, valor_total: 1500 }),
            ],
          },
        ],
      })
    );
    expect(r.inconsistencias[0].ubicacion).toContain("1.1.73.1.1");
  });

  it('cae en "ítem N" cuando el codigo es NO_ENCONTRADO', () => {
    const r = validatePliego(
      extraction({
        capitulos: [
          {
            nombre: "A",
            items: [
              item({
                codigo: "NO_ENCONTRADO",
                cantidad: 2,
                valor_unitario: 1000,
                valor_total: 1500,
              }),
            ],
          },
        ],
      })
    );
    expect(r.inconsistencias[0].ubicacion).toContain("ítem 1");
  });
});

// --- parsePliegoExtraction --------------------------------------------------

describe("parsePliegoExtraction", () => {
  it("parsea una estructura válida", () => {
    const parsed = parsePliegoExtraction(extraction());
    expect(parsed.proceso).toBe("P-1");
    expect(parsed.capitulos[0].items[0].valor_total).toBe(1000);
  });

  it("lanza si falta un campo numérico", () => {
    const bad = { ...extraction(), presupuesto_oficial_cop: "mil" };
    expect(() => parsePliegoExtraction(bad)).toThrow(/presupuesto_oficial_cop/);
  });

  it("lanza si capitulos no es array", () => {
    expect(() => parsePliegoExtraction({ ...extraction(), capitulos: {} })).toThrow(/capitulos/);
  });

  it("lanza si un ítem no tiene codigo", () => {
    const bad = extraction({
      capitulos: [{ nombre: "A", items: [{ ...item(), codigo: undefined }] }],
    });
    expect(() => parsePliegoExtraction(bad)).toThrow(/codigo/);
  });

  it("parsea lagunas_pendientes con datos válidos", () => {
    const parsed = parsePliegoExtraction(
      extraction({ lagunas_pendientes: [laguna(), laguna({ id: 2, severidad: "media" })] })
    );
    expect(parsed.lagunas_pendientes).toHaveLength(2);
    expect(parsed.lagunas_pendientes[1].severidad).toBe("media");
  });

  it("lanza si lagunas_pendientes no es array", () => {
    expect(() => parsePliegoExtraction({ ...extraction(), lagunas_pendientes: {} })).toThrow(
      /lagunas_pendientes/
    );
  });

  it("lanza si una laguna tiene severidad inválida", () => {
    const bad = extraction({ lagunas_pendientes: [laguna({ severidad: "critica" as never })] });
    expect(() => parsePliegoExtraction(bad)).toThrow(/severidad/);
  });
});
