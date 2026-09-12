import { describe, it, expect } from "vitest";
import { estadoDesdeProceso } from "@/src/lib/al/eventos/correr";

describe("estadoDesdeProceso", () => {
  it("mapea la fila canónica al snapshot de al_proceso_estado", () => {
    const e = estadoDesdeProceso({
      secopProcesoId: "CO1.REQ.1",
      estadoActual: "Presentación de oferta",
      estadoApertura: "Abierto",
      valorEstimado: "1000.00",
      modalidad: "Licitación pública",
      fechaRecepcion: "2026-10-01",
      adjudicado: false,
      valorAdjudicacion: null,
      nitAdjudicatario: null,
      objeto: "Acueducto",
      descripcion: "Red veredal",
    });
    expect(e.estado).toBe("Presentación de oferta");
    expect(e.estadoApertura).toBe("Abierto");
    expect(e.adjudicado).toBe(false);
    expect(e.objetoHash).toHaveLength(64);
  });

  it("el objetoHash cambia si cambia la descripción", () => {
    const base = {
      secopProcesoId: "CO1.REQ.1",
      estadoActual: null,
      estadoApertura: null,
      valorEstimado: null,
      modalidad: null,
      fechaRecepcion: null,
      adjudicado: null,
      valorAdjudicacion: null,
      nitAdjudicatario: null,
      objeto: "Acueducto",
    };
    const a = estadoDesdeProceso({ ...base, descripcion: "uno" });
    const b = estadoDesdeProceso({ ...base, descripcion: "dos" });
    expect(a.objetoHash).not.toBe(b.objetoHash);
  });
});
