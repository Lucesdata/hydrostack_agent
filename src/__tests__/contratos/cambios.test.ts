import { describe, it, expect } from "vitest";
import {
  detectarCambiosContrato,
  normalizarValor,
  sentidoDelCambio,
  type EstadoContrato,
} from "@/src/lib/contratos/cambios";

const base: EstadoContrato = {
  valorActual: "1250000000.00",
  fechaFinActual: "2026-06-30",
  estadoActual: "En ejecución",
};

describe("normalizarValor", () => {
  it("compara dinero como decimal exacto, sin depender de ceros finales", () => {
    expect(normalizarValor("1250000000.00")).toBe("1250000000");
    expect(normalizarValor("1250000000")).toBe("1250000000");
    expect(normalizarValor("1250000000.50")).toBe("1250000000.5");
    expect(normalizarValor("0.00")).toBe("0");
  });
  it("conserva la precisión de montos grandes (sin pasar por float)", () => {
    expect(normalizarValor("12345678901234567.89")).toBe("12345678901234567.89");
  });
  it("lo no numérico o vacío da null", () => {
    expect(normalizarValor(null)).toBeNull();
    expect(normalizarValor("")).toBeNull();
    expect(normalizarValor("abc")).toBeNull();
  });
});

describe("detectarCambiosContrato", () => {
  it("sin línea base previa no hay cambios: se siembra en silencio", () => {
    expect(detectarCambiosContrato(null, base)).toEqual([]);
  });

  it("sin diferencias no devuelve nada, aunque el formato del valor difiera", () => {
    expect(detectarCambiosContrato(base, { ...base, valorActual: "1250000000" })).toEqual([]);
    expect(detectarCambiosContrato(base, { ...base, estadoActual: "  En   ejecución " })).toEqual(
      []
    );
  });

  it("detecta una prórroga: cambia la fecha fin", () => {
    expect(detectarCambiosContrato(base, { ...base, fechaFinActual: "2026-09-30" })).toEqual([
      { campo: "fecha_fin_actual", valorAnterior: "2026-06-30", valorNuevo: "2026-09-30" },
    ]);
  });

  it("detecta un cambio de valor y de estado a la vez, en orden estable", () => {
    const c = detectarCambiosContrato(base, {
      valorActual: "1500000000.00",
      fechaFinActual: "2026-06-30",
      estadoActual: "Terminado",
    });
    expect(c.map((x) => x.campo)).toEqual(["valor_actual", "estado_actual"]);
    expect(c[0]).toMatchObject({ valorAnterior: "1250000000", valorNuevo: "1500000000" });
  });

  it("un campo que la fuente deja en blanco NO es un cambio (no borra lo que sabíamos)", () => {
    expect(
      detectarCambiosContrato(base, { valorActual: null, fechaFinActual: null, estadoActual: null })
    ).toEqual([]);
  });

  it("de null a un valor sí es un cambio (primera vez que la fuente lo publica)", () => {
    const c = detectarCambiosContrato({ ...base, fechaFinActual: null }, base);
    expect(c).toEqual([
      { campo: "fecha_fin_actual", valorAnterior: null, valorNuevo: "2026-06-30" },
    ]);
  });
});

describe("sentidoDelCambio", () => {
  it("fechas y valores: aumento o disminución; estado: cambio", () => {
    expect(sentidoDelCambio("fecha_fin_actual", "2026-06-30", "2026-09-30")).toBe("aumento");
    expect(sentidoDelCambio("fecha_fin_actual", "2026-09-30", "2026-06-30")).toBe("disminucion");
    expect(sentidoDelCambio("valor_actual", "100", "150.5")).toBe("aumento");
    expect(sentidoDelCambio("valor_actual", "150", "100")).toBe("disminucion");
    expect(sentidoDelCambio("estado_actual", "A", "B")).toBe("cambio");
  });
  it("sin valor anterior no se afirma sentido", () => {
    expect(sentidoDelCambio("fecha_fin_actual", null, "2026-09-30")).toBe("cambio");
  });
});
