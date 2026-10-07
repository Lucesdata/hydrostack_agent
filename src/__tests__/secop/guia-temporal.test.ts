import { describe, expect, it } from "vitest";
import { guiaTemporal } from "@/src/lib/secop/guia-temporal";
import type { SenalesProceso } from "@/src/lib/secop/etapa";
const senales: SenalesProceso = {
  estadoActual: "Publicado",
  estadoApertura: "Abierto",
  fechaPublicacion: "2026-09-18",
  fechaRecepcion: "2026-10-22",
  valorEstimado: "6420000000",
  adjudicado: false,
  adjudicatario: null,
  fechaAdjudicacion: null,
  contratos: [],
};
const ahora = new Date("2026-10-06T15:20:00-05:00");
describe("Guía temporal de la ficha", () => {
  it("cuenta días naturales sin inventar hora de cierre", () => {
    const g = guiaTemporal(senales, null, ahora);
    expect(g.dias).toBe(16);
    expect(g.cierre).toBe("22 oct 2026");
    expect(g.etapa.etapa).toBe("recibe_ofertas");
    expect(g.avance).toBeCloseTo((18 / 34) * 100);
  });
  it("usa el día de Colombia y no el día UTC", () => {
    expect(guiaTemporal(senales, null, new Date("2026-10-07T02:00:00Z")).dias).toBe(16);
  });
  it("el día del cierre no inventa minutos restantes", () => {
    const g = guiaTemporal(senales, null, new Date("2026-10-22T09:00:00-05:00"));
    expect(g.dias).toBe(0);
    expect(g.mensajePlazo).toContain("Cierra hoy");
  });
  it("al vencer no invita a preparar ofertas ni cuenta negativo", () => {
    const g = guiaTemporal(senales, null, new Date("2026-10-23T01:00:00-05:00"));
    expect(g.dias).toBeNull();
    expect(g.accion.href).toBe("#ficha-plazos");
    expect(g.mensajePlazo).toContain("finalizado");
  });
  it.each(["Suspendido", "Cancelado", "Desierto"])(
    "%s no tiene contador ni acción de oferta",
    (estadoActual) => {
      const g = guiaTemporal({ ...senales, estadoActual }, null, ahora);
      expect(g.dias).toBeNull();
      expect(g.accion.href).not.toBe("#ficha-documentos");
    }
  );
  it("sin fecha no afirma que recibe ofertas", () => {
    const g = guiaTemporal({ ...senales, fechaRecepcion: null }, null, ahora);
    expect(g.dias).toBeNull();
    expect(g.etapa.etapa).toBe("por_verificar");
  });
  it("rechaza fechas imposibles y no muestra barra de tiempo", () => {
    const g = guiaTemporal({ ...senales, fechaRecepcion: "2026-02-30" }, null, ahora);
    expect(g.cierre).toBeNull();
    expect(g.dias).toBeNull();
    expect(g.avance).toBeNull();
  });
  it("un cierre textual del pliego se muestra sin convertirlo a una hora o fecha supuesta", () => {
    const g = guiaTemporal(senales, "20 de octubre de 2026 a las 10 am", ahora);
    expect(g.cierre).toBe("20 de octubre de 2026 a las 10 am");
    expect(g.dias).toBeNull();
    expect(g.avance).toBeNull();
    expect(g.mensajePlazo).toContain("pliego");
  });
  it("un contrato prevalece y no deja activo el contador de ofertas", () => {
    const g = guiaTemporal(
      {
        ...senales,
        contratos: [
          {
            fechaFirma: "2026-10-01",
            fechaInicio: "2026-10-05",
            fechaFinInicial: "2027-10-05",
            fechaFinActual: null,
            valorInicial: "6000000000",
            valorActual: null,
            estado: "En ejecución",
          },
        ],
      },
      null,
      ahora
    );
    expect(g.etapa.etapa).toBe("en_ejecucion");
    expect(g.dias).toBeNull();
    expect(g.etapas.some((e) => e.actual && e.id === "contrato")).toBe(true);
  });
});
