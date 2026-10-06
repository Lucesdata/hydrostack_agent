import { describe, expect, it } from "vitest";
import {
  etapaDeProceso,
  fechaLegible,
  sinFasePegada,
  type ContratoSenal,
  type SenalesProceso,
} from "@/src/lib/secop/etapa";

// Mediodía del 5 de octubre de 2026 en Colombia.
const HOY = new Date("2026-10-05T17:00:00Z");

const base: SenalesProceso = {
  estadoActual: "Publicado",
  estadoApertura: "Abierto",
  fechaPublicacion: "2026-09-20",
  fechaRecepcion: null,
  valorEstimado: "500000000",
  adjudicado: false,
  adjudicatario: null,
  fechaAdjudicacion: null,
  contratos: [],
};

const contrato = (c: Partial<ContratoSenal>): ContratoSenal => ({
  fechaFirma: "2026-09-25",
  fechaInicio: "2026-09-29",
  fechaFinInicial: "2026-12-31",
  fechaFinActual: "2026-12-31",
  valorInicial: "480000000",
  valorActual: "480000000",
  estado: "En ejecución",
  ...c,
});

const codigos = (s: SenalesProceso) => etapaDeProceso(s, HOY).contradicciones.map((c) => c.codigo);

describe("etapaDeProceso: recepción de ofertas", () => {
  it("recibe ofertas solo con una fecha de recepción vigente", () => {
    const e = etapaDeProceso({ ...base, fechaRecepcion: "2026-10-20" }, HOY);
    expect(e.etapa).toBe("recibe_ofertas");
    expect(e.nombre).toBe("Recibe ofertas");
    expect(e.linea).toContain("20 oct 2026");
  });

  it("el último día de recepción todavía recibe ofertas", () => {
    expect(etapaDeProceso({ ...base, fechaRecepcion: "2026-10-05" }, HOY).etapa).toBe(
      "recibe_ofertas"
    );
  });

  it("«Publicado / Abierto» sin fecha de recepción no se afirma abierto (régimen especial, M9)", () => {
    const e = etapaDeProceso(base, HOY);
    expect(e.etapa).toBe("por_verificar");
    expect(e.linea).toMatch(/no publica una fecha para recibir ofertas/);
  });

  it("recepción vencida: en evaluación, y se señala la contradicción C3", () => {
    const s = { ...base, fechaRecepcion: "2026-09-30" };
    expect(etapaDeProceso(s, HOY).etapa).toBe("en_evaluacion");
    expect(codigos(s)).toEqual(["C3"]);
  });

  it("estado «Evaluación» o apertura «Cerrado»: en evaluación", () => {
    expect(etapaDeProceso({ ...base, estadoActual: "Evaluación" }, HOY).etapa).toBe(
      "en_evaluacion"
    );
    expect(etapaDeProceso({ ...base, estadoApertura: "Cerrado" }, HOY).etapa).toBe("en_evaluacion");
  });
});

describe("etapaDeProceso: adjudicación", () => {
  it("adjudicado sin contrato firmado", () => {
    const s = {
      ...base,
      estadoActual: "Seleccionado",
      adjudicado: true,
      adjudicatario: "CONSORCIO X",
      fechaAdjudicacion: "2026-09-28",
    };
    const e = etapaDeProceso(s, HOY);
    expect(e.etapa).toBe("adjudicado");
    expect(e.linea).toContain("28 sep 2026");
  });

  it("«Seleccionado» sin contrato es adjudicado (M7b)", () => {
    expect(etapaDeProceso({ ...base, estadoActual: "Seleccionado" }, HOY).etapa).toBe("adjudicado");
  });

  it("adjudicado sin adjudicatario publicado: C6", () => {
    expect(codigos({ ...base, estadoActual: "Seleccionado", adjudicado: true })).toContain("C6");
  });
});

describe("etapaDeProceso: el contrato manda", () => {
  it("CO1.REQ.10637968 (PSMV): estado «Abierto», contrato en ejecución → en ejecución y C1", () => {
    const s: SenalesProceso = {
      ...base,
      estadoActual: "Abierto",
      estadoApertura: null,
      fechaPublicacion: "2026-07-11",
      contratos: [
        contrato({
          fechaFirma: "2026-09-09",
          fechaInicio: "2026-09-29",
          fechaFinActual: "2026-12-31",
        }),
      ],
    };
    const e = etapaDeProceso(s, HOY);
    expect(e.etapa).toBe("en_ejecucion");
    expect(e.linea).toMatch(/Según las fechas del contrato/);
    expect(e.linea).toMatch(/no publica el avance de la obra/);
    expect(e.contradicciones.map((c) => c.codigo)).toEqual(["C1"]);
    expect(e.contradicciones[0].texto).toContain("9 sep 2026");
  });

  it("CO1.REQ.10824491: fin del contrato ya pasado → plazo cumplido, aunque la fuente diga «terminado»", () => {
    const s: SenalesProceso = {
      ...base,
      estadoActual: "Abierto",
      estadoApertura: null,
      fechaPublicacion: "2026-08-10",
      contratos: [
        contrato({
          fechaFirma: "2026-08-21",
          fechaInicio: "2026-08-24",
          fechaFinActual: "2026-09-07",
          estado: "terminado",
        }),
      ],
    };
    const e = etapaDeProceso(s, HOY);
    expect(e.etapa).toBe("plazo_cumplido");
    expect(e.nombre).toBe("Plazo cumplido");
    expect(e.linea).toMatch(/No significa que la obra se haya entregado/);
    expect(e.linea).toMatch(/«terminado»/);
  });

  it("OPA-ST-07-2023 con su contrato: firmado antes de publicarse (C2) y mostrado abierto (C1)", () => {
    const s: SenalesProceso = {
      ...base,
      fechaPublicacion: "2023-11-28",
      valorEstimado: "995976833",
      contratos: [
        contrato({
          fechaFirma: "2023-11-24",
          fechaInicio: "2023-11-30",
          fechaFinActual: "2024-02-27",
          valorActual: "995976833",
        }),
      ],
    };
    const e = etapaDeProceso(s, HOY);
    expect(e.etapa).toBe("plazo_cumplido");
    expect(e.contradicciones.map((c) => c.codigo)).toEqual(["C1", "C2"]);
  });

  it("OPA-ST-07-2023 tal como está en la base (sin contrato vinculado): por verificar, nunca abierto", () => {
    const e = etapaDeProceso({ ...base, fechaPublicacion: "2023-11-28" }, HOY);
    expect(e.etapa).toBe("por_verificar");
  });

  it("firmado con inicio futuro, o sin fecha de inicio: contratado", () => {
    expect(
      etapaDeProceso({ ...base, contratos: [contrato({ fechaInicio: "2026-11-01" })] }, HOY).etapa
    ).toBe("contratado");
    expect(
      etapaDeProceso({ ...base, contratos: [contrato({ fechaInicio: null })] }, HOY).etapa
    ).toBe("contratado");
  });

  it("un contrato sin firmar o cancelado no cuenta como contratado (M2d)", () => {
    for (const estado of ["Borrador", "enviado Proveedor", "En aprobación", "Cancelado"]) {
      const e = etapaDeProceso(
        { ...base, fechaRecepcion: "2026-10-20", contratos: [contrato({ estado })] },
        HOY
      );
      expect(e.etapa, estado).toBe("recibe_ofertas");
      expect(e.contrato, estado).toBeNull();
    }
  });

  it("varios contratos: manda el de firma más reciente", () => {
    const e = etapaDeProceso(
      {
        ...base,
        contratos: [
          contrato({
            fechaFirma: "2026-01-10",
            fechaInicio: "2026-01-15",
            fechaFinActual: "2026-03-01",
          }),
          contrato({ fechaFirma: "2026-09-25" }),
        ],
      },
      HOY
    );
    expect(e.etapa).toBe("en_ejecucion");
    expect(e.contrato?.fechaFirma).toBe("2026-09-25");
  });

  it("suspendido: se dice, sin cambiar la etapa", () => {
    const e = etapaDeProceso(
      { ...base, estadoActual: "Seleccionado", contratos: [contrato({ estado: "Suspendido" })] },
      HOY
    );
    expect(e.etapa).toBe("en_ejecucion");
    expect(e.linea).toMatch(/suspendido/);
  });
});

describe("etapaDeProceso: no se llevó a cabo", () => {
  it("cancelado sin contrato", () => {
    expect(etapaDeProceso({ ...base, estadoActual: "Cancelado" }, HOY).etapa).toBe(
      "no_se_llevo_a_cabo"
    );
  });

  it("cancelado con contrato firmado: por verificar y C5", () => {
    const s = { ...base, estadoActual: "Cancelado", contratos: [contrato({})] };
    expect(etapaDeProceso(s, HOY).etapa).toBe("por_verificar");
    expect(codigos(s)).toContain("C5");
  });
});

describe("contradicciones de cifras y fechas", () => {
  it("C4 solo por encima de 10 veces el presupuesto (M8: 1,28× es lo corriente)", () => {
    expect(codigos({ ...base, contratos: [contrato({ valorActual: "640000000" })] })).not.toContain(
      "C4"
    );
    const absurdo = { ...base, contratos: [contrato({ valorActual: "500000000000" })] };
    expect(codigos(absurdo)).toContain("C4");
    expect(
      etapaDeProceso(absurdo, HOY).contradicciones.find((c) => c.codigo === "C4")!.texto
    ).toMatch(/1\.000 veces/);
  });

  it("C7: el contrato termina antes de empezar", () => {
    expect(
      codigos({
        ...base,
        contratos: [contrato({ fechaInicio: "2026-09-29", fechaFinActual: "2026-09-01" })],
      })
    ).toContain("C7");
  });

  it("sin contradicciones, la lista va vacía", () => {
    expect(codigos({ ...base, fechaRecepcion: "2026-10-20" })).toEqual([]);
  });
});

describe("utilidades", () => {
  it("fechaLegible conserva el día de calendario", () => {
    expect(fechaLegible("2023-11-24")).toBe("24 nov 2023");
    expect(fechaLegible("2026-01-01T00:00:00Z")).toBe("1 ene 2026");
    expect(fechaLegible(null)).toBeNull();
    expect(fechaLegible("no es fecha")).toBeNull();
  });

  it("sinFasePegada quita la fase que la fuente pega al final", () => {
    expect(sinFasePegada("ALSUTAMAR-CMA-002-2026 (Presentación de oferta)")).toBe(
      "ALSUTAMAR-CMA-002-2026"
    );
    expect(sinFasePegada("CONSULTORÍA PMAA (Presentación de oferta)")).toBe("CONSULTORÍA PMAA");
    expect(sinFasePegada("4182.010.32.1.327-2026 (Presentación de observaciones)")).toBe(
      "4182.010.32.1.327-2026"
    );
    // Un paréntesis que no es una fase se conserva.
    expect(sinFasePegada("Obra (Fase II del acueducto)")).toBe("Obra (Fase II del acueducto)");
  });
});
