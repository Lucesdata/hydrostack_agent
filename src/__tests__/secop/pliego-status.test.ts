import { describe, it, expect } from "vitest";
import { mapPliegoRow, type PliegoProcesoRow } from "@/src/lib/secop/pliego-status";
import { NO_ENCONTRADO } from "@/src/lib/pliego/schema";

function row(over: Partial<PliegoProcesoRow> = {}): PliegoProcesoRow {
  return {
    procesoId: "CO1.REQ.1",
    gateMatematicoPasado: true,
    createdAt: new Date("2026-08-19T10:00:00Z"),
    extraction: {
      proceso: "P-1",
      entidad: "E",
      objeto_contrato: NO_ENCONTRADO,
      modalidad_contratacion: NO_ENCONTRADO,
      fecha_publicacion: NO_ENCONTRADO,
      fecha_cierre: "2026-09-15",
      presupuesto_oficial_cop: 250_000_000,
      moneda: "COP",
      capitulos: [],
      reglas_presupuesto: [],
      requisitos_habilitantes: {
        experiencia_especifica: NO_ENCONTRADO,
        capacidad_financiera: NO_ENCONTRADO,
        capacidad_organizacional: NO_ENCONTRADO,
      },
      cronograma: [],
      verificacion: {
        campos_no_encontrados: [],
        confianza_general: "alta",
        justificacion_confianza: "ok",
      },
      lagunas_pendientes: [],
    },
    ...over,
  };
}

describe("mapPliegoRow (fila DB → PliegoStatus)", () => {
  it("extrae presupuesto y fecha de cierre desde el jsonb de extraction", () => {
    const status = mapPliegoRow(row());
    expect(status.presupuestoOficialCop).toBe(250_000_000);
    expect(status.fechaCierre).toBe("2026-09-15");
    expect(status.gateMatematicoPasado).toBe(true);
    expect(status.createdAt).toEqual(new Date("2026-08-19T10:00:00Z"));
  });

  it("propaga gateMatematicoPasado:false sin tocarlo", () => {
    const status = mapPliegoRow(row({ gateMatematicoPasado: false }));
    expect(status.gateMatematicoPasado).toBe(false);
  });

  it("normaliza NO_ENCONTRADO en fecha_cierre a null", () => {
    const status = mapPliegoRow(
      row({ extraction: { ...row().extraction, fecha_cierre: NO_ENCONTRADO } })
    );
    expect(status.fechaCierre).toBeNull();
  });
});
