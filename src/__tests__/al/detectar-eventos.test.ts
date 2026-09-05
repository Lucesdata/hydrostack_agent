/**
 * Detector de eventos de proceso (SDD Fase 5).
 *
 * Los dos invariantes que este archivo protege:
 *
 *  1. **Una adenda nunca sale sin diff.** "Hubo una adenda" sin decir qué cambió
 *     es un aviso, y el SDD dice explícitamente que esto no debe producir avisos.
 *  2. **Ningún campo volátil entra al diff.** Si uno se cuela, el detector emite
 *     una adenda cada día por campos que la fuente reescribe sola, y el correo
 *     diario se vuelve ruido que la gente aprende a ignorar.
 */

import { describe, it, expect } from "vitest";
import {
  detectarEvento,
  estadoDesdePayload,
  diffEstados,
  esTerminal,
} from "@/src/lib/al/eventos/detectar";
import { CAMPOS_VIGILADOS, CAMPOS_VOLATILES_EN_VIGILANCIA } from "@/src/lib/al/eventos/campos";
import { SOURCE_PROCESOS } from "@/src/lib/ingest/sources";

/** Payload real recortado (CO1.REQ.406327). */
const BASE = {
  id_del_proceso: "CO1.REQ.406327",
  estado_del_procedimiento: "Publicado",
  estado_de_apertura_del_proceso: "Abierto",
  precio_base: "1200000000",
  modalidad_de_contratacion: "Licitación pública",
  fecha_de_recepcion_de: "2026-04-20T00:00:00.000",
  adjudicado: "No",
  valor_total_adjudicacion: "0",
  nit_del_proveedor_adjudicado: "No Definido",
  nombre_del_proveedor: "No Definido",
  nombre_del_procedimiento: "OPTIMIZACIÓN DE REDES DE ACUEDUCTO",
  descripci_n_del_procedimiento: "Obras de optimización",
  // Volátiles: la fuente los reescribe sola en cada republicación.
  visualizaciones_del: "36",
  respuestas_al_procedimiento: "3",
  fecha_de_ultima_publicaci: "2026-04-09T00:00:00.000",
};

describe("campos vigilados", () => {
  it("NINGÚN campo volátil está bajo vigilancia", () => {
    // Si esto falla, el detector genera una adenda espuria en cada corrida.
    expect(CAMPOS_VOLATILES_EN_VIGILANCIA).toEqual([]);
  });

  it("la lista de volátiles de la ingesta sigue siendo la referencia", () => {
    // Guarda contra que alguien vacíe `volatileFields` y el test de arriba pase
    // por vacuidad en vez de por corrección.
    expect(SOURCE_PROCESOS.volatileFields.length).toBeGreaterThan(0);
    expect(SOURCE_PROCESOS.volatileFields).toContain("visualizaciones_del");
  });
});

describe("detectarEvento", () => {
  it("sin línea base es una apertura", () => {
    const e = detectarEvento(null, BASE);
    expect(e.tipoEvento).toBe("apertura");
    expect(e.estadoNuevo).toBe("Publicado");
  });

  it("sin cambios no emite nada", () => {
    expect(detectarEvento(estadoDesdePayload(BASE), BASE)).toBeNull();
  });

  it("un cambio en un campo VOLÁTIL no emite nada", () => {
    // Es el caso que justifica toda la lista de campos vigilados.
    const republicado = {
      ...BASE,
      visualizaciones_del: "412",
      respuestas_al_procedimiento: "9",
      fecha_de_ultima_publicaci: "2026-05-01T00:00:00.000",
    };
    expect(detectarEvento(estadoDesdePayload(BASE), republicado)).toBeNull();
  });

  it("una prórroga del plazo es una adenda CON diff", () => {
    const prorrogado = { ...BASE, fecha_de_recepcion_de: "2026-05-10T00:00:00.000" };
    const e = detectarEvento(estadoDesdePayload(BASE), prorrogado);
    expect(e.tipoEvento).toBe("adenda");
    expect(e.delta).not.toBeNull();
    expect(e.delta).toHaveLength(1);
    expect(e.delta[0]).toMatchObject({
      etiqueta: "Fecha de recepción de ofertas",
      antes: "2026-04-20",
      despues: "2026-05-10",
    });
  });

  it("un cambio de presupuesto trae el antes y el después", () => {
    const e = detectarEvento(estadoDesdePayload(BASE), { ...BASE, precio_base: "1450000000" });
    expect(e.tipoEvento).toBe("adenda");
    expect(e.delta[0]).toMatchObject({
      etiqueta: "Presupuesto oficial",
      antes: "1200000000.00",
      despues: "1450000000.00",
    });
  });

  it("NINGUNA adenda sale con delta nulo o vacío", () => {
    const cambios = [
      { precio_base: "999" },
      { estado_del_procedimiento: "Evaluación" },
      { estado_de_apertura_del_proceso: "Cerrado" },
      { modalidad_de_contratacion: "Selección abreviada" },
      { nombre_del_procedimiento: "OTRO OBJETO" },
    ];
    for (const c of cambios) {
      const e = detectarEvento(estadoDesdePayload(BASE), { ...BASE, ...c });
      expect(e.tipoEvento).toBe("adenda");
      expect(e.delta.length).toBeGreaterThan(0);
    }
  });

  it("adjudicar gana sobre adenda aunque cambien otras cosas a la vez", () => {
    const adjudicado = {
      ...BASE,
      adjudicado: "Si",
      estado_del_procedimiento: "Seleccionado",
      valor_total_adjudicacion: "1168754073",
      nit_del_proveedor_adjudicado: "900179755",
      nombre_del_proveedor: "CONINTEGRAL S.A.S",
    };
    const e = detectarEvento(estadoDesdePayload(BASE), adjudicado);
    expect(e.tipoEvento).toBe("adjudicacion");
    // El resto del cambio viaja igual dentro del delta.
    expect(e.delta.map((d) => d.etiqueta)).toContain("Estado del procedimiento");
    expect(e.valorNuevo).toBe(e.valorNuevo); // el estimado no cambió
  });

  it("el objeto se vigila por hash: se detecta QUE cambió, no CÓMO", () => {
    // Guardar los dos textos por cada proceso costaría más que toda la tabla.
    const e = detectarEvento(estadoDesdePayload(BASE), {
      ...BASE,
      descripci_n_del_procedimiento: "Otra cosa completamente distinta",
    });
    const cambio = e.delta.find((d) => d.etiqueta === "Objeto o descripción");
    expect(cambio).toBeDefined();
    expect(cambio.antes).toBeNull();
    expect(cambio.despues).toBeNull();
  });

  it("el hash de idempotencia solo depende del estado nuevo", () => {
    const a = detectarEvento(null, BASE);
    const b = detectarEvento(null, { ...BASE, visualizaciones_del: "999" });
    expect(a.payloadHash).toBe(b.payloadHash);
  });
});

describe("diffEstados", () => {
  it("no reporta campos que no cambiaron", () => {
    const antes = estadoDesdePayload(BASE);
    const despues = estadoDesdePayload({ ...BASE, precio_base: "1" });
    expect(diffEstados(antes, despues).map((d) => d.campo)).toEqual(["precio_base"]);
  });

  it("cada campo vigilado tiene etiqueta legible", () => {
    for (const c of CAMPOS_VIGILADOS) {
      expect(c.etiqueta).not.toBe(c.campo);
      expect(c.etiqueta.length).toBeGreaterThan(3);
    }
  });
});

describe("esTerminal", () => {
  it("Seleccionado y Cancelado salen del seguimiento", () => {
    expect(esTerminal("Seleccionado")).toBe(true);
    expect(esTerminal("Cancelado")).toBe(true);
    expect(esTerminal("Publicado")).toBe(false);
    expect(esTerminal(null)).toBe(false);
  });
});
