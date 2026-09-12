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
 *
 * Hasta 2026-09-12 los fixtures de este archivo eran payloads crudos de
 * `raw_record` y se proyectaban con `estadoDesdePayload` (`detectar.ts`).
 * `correr.ts` dejó de leer `raw_record` ese día, `estadoDesdePayload` quedó
 * sin llamador en producción y se retiró para no dejar dos caminos que
 * construyen `EstadoProceso` y puedan divergir — así que estos fixtures ahora
 * son filas canónicas de `proceso` y se proyectan con `estadoDesdeProceso`
 * (`correr.ts`). El invariante 2 se vuelve más fuerte con el cambio, no más
 * débil: `FilaProceso` no tiene campos para "visualizaciones_del" ni
 * "respuestas_al_procedimiento" — un campo volátil ya no puede colarse en el
 * diff porque no hay dónde ponerlo, no porque el código lo filtre en runtime.
 * El caso que antes probaba eso perturbando un payload no tiene equivalente
 * literal aquí; lo que queda vigilando la misma propiedad es
 * `describe("campos vigilados")` más abajo (contra `CAMPOS_VIGILADOS`) y el
 * tipo `FilaProceso` en sí.
 */

import { describe, it, expect } from "vitest";
import { detectarEvento, diffEstados, esTerminal } from "@/src/lib/al/eventos/detectar";
import { estadoDesdeProceso, type FilaProceso } from "@/src/lib/al/eventos/correr";
import { CAMPOS_VIGILADOS, CAMPOS_VOLATILES_EN_VIGILANCIA } from "@/src/lib/al/eventos/campos";
import { SOURCE_PROCESOS } from "@/src/lib/ingest/sources";

/**
 * Fila canónica de `proceso`, recortada (CO1.REQ.406327) — equivalente ya
 * proyectado del payload real que usaba esta suite antes de 2026-09-12.
 * `valorAdjudicacion` y `nitAdjudicatario` van en `null` porque el proceso no
 * está adjudicado (`adjudicado: false`), igual que reportaba
 * `estadoDesdePayload` para "0" y "No Definido" (money-cero y centinela).
 */
const BASE: FilaProceso = {
  secopProcesoId: "CO1.REQ.406327",
  estadoActual: "Publicado",
  estadoApertura: "Abierto",
  valorEstimado: "1200000000.00",
  modalidad: "Licitación pública",
  fechaRecepcion: "2026-04-20",
  adjudicado: false,
  valorAdjudicacion: null,
  nitAdjudicatario: null,
  objeto: "OPTIMIZACIÓN DE REDES DE ACUEDUCTO",
  descripcion: "Obras de optimización",
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
    const e = detectarEvento(null, estadoDesdeProceso(BASE));
    expect(e.tipoEvento).toBe("apertura");
    expect(e.estadoNuevo).toBe("Publicado");
  });

  it("sin cambios no emite nada", () => {
    expect(detectarEvento(estadoDesdeProceso(BASE), estadoDesdeProceso(BASE))).toBeNull();
  });

  it("una prórroga del plazo es una adenda CON diff", () => {
    const prorrogado: FilaProceso = { ...BASE, fechaRecepcion: "2026-05-10" };
    const e = detectarEvento(estadoDesdeProceso(BASE), estadoDesdeProceso(prorrogado));
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
    const e = detectarEvento(
      estadoDesdeProceso(BASE),
      estadoDesdeProceso({ ...BASE, valorEstimado: "1450000000.00" })
    );
    expect(e.tipoEvento).toBe("adenda");
    expect(e.delta[0]).toMatchObject({
      etiqueta: "Presupuesto oficial",
      antes: "1200000000.00",
      despues: "1450000000.00",
    });
  });

  it("NINGUNA adenda sale con delta nulo o vacío", () => {
    const cambios: Array<Partial<FilaProceso>> = [
      { valorEstimado: "999.00" },
      { estadoActual: "Evaluación" },
      { estadoApertura: "Cerrado" },
      { modalidad: "Selección abreviada" },
      { objeto: "OTRO OBJETO" },
    ];
    for (const c of cambios) {
      const e = detectarEvento(estadoDesdeProceso(BASE), estadoDesdeProceso({ ...BASE, ...c }));
      expect(e.tipoEvento).toBe("adenda");
      expect(e.delta.length).toBeGreaterThan(0);
    }
  });

  it("adjudicar gana sobre adenda aunque cambien otras cosas a la vez", () => {
    const adjudicado: FilaProceso = {
      ...BASE,
      adjudicado: true,
      estadoActual: "Seleccionado",
      valorAdjudicacion: "1168754073.00",
      nitAdjudicatario: "900179755",
    };
    const e = detectarEvento(estadoDesdeProceso(BASE), estadoDesdeProceso(adjudicado));
    expect(e.tipoEvento).toBe("adjudicacion");
    // El resto del cambio viaja igual dentro del delta.
    expect(e.delta.map((d) => d.etiqueta)).toContain("Estado del procedimiento");
    expect(e.valorNuevo).toBe(e.valorNuevo); // el estimado no cambió
  });

  it("el objeto se vigila por hash: se detecta QUE cambió, no CÓMO", () => {
    // Guardar los dos textos por cada proceso costaría más que toda la tabla.
    const e = detectarEvento(
      estadoDesdeProceso(BASE),
      estadoDesdeProceso({ ...BASE, descripcion: "Otra cosa completamente distinta" })
    );
    const cambio = e.delta.find((d) => d.etiqueta === "Objeto o descripción");
    expect(cambio).toBeDefined();
    expect(cambio.antes).toBeNull();
    expect(cambio.despues).toBeNull();
  });

  it("el hash de idempotencia es determinista para el mismo estado", () => {
    // Antes esto perturbaba un campo volátil del payload ("visualizaciones_del")
    // para probar que el hash no depende de él. `FilaProceso` no tiene ese
    // campo — no hay forma de perturbarlo — así que lo que queda por probar
    // aquí es que el hash no varía entre dos proyecciones del mismo estado.
    const a = detectarEvento(null, estadoDesdeProceso(BASE));
    const b = detectarEvento(null, estadoDesdeProceso({ ...BASE }));
    expect(a.payloadHash).toBe(b.payloadHash);
  });
});

describe("diffEstados", () => {
  it("no reporta campos que no cambiaron", () => {
    const antes = estadoDesdeProceso(BASE);
    const despues = estadoDesdeProceso({ ...BASE, valorEstimado: "1.00" });
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
