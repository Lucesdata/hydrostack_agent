import { describe, it, expect } from "vitest";
import { clicDelPanel, vecino } from "@/src/lib/secop/radar-navegacion";

const ids = ["A", "B", "C"];

describe("↑/↓ en la lista del Radar", () => {
  it("baja y sube de uno en uno", () => {
    expect(vecino(ids, "A", 1)).toBe("B");
    expect(vecino(ids, "C", -1)).toBe("B");
  });

  it("no da la vuelta en los bordes", () => {
    expect(vecino(ids, "C", 1)).toBe("C");
    expect(vecino(ids, "A", -1)).toBe("A");
  });

  it("sin elegido, o con uno que ya no está, empieza por el primero", () => {
    expect(vecino(ids, null, 1)).toBe("A");
    expect(vecino(ids, "Z", -1)).toBe("A");
    expect(vecino([], "A", 1)).toBeNull();
  });
});

describe("qué clic atiende el panel", () => {
  const base = { button: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false };

  it("el clic principal sin teclas elige la tarjeta", () => {
    expect(clicDelPanel(base)).toBe(true);
  });

  it("con Ctrl, Cmd, Mayúsculas, Alt o el botón central, se abre la ficha como siempre", () => {
    expect(clicDelPanel({ ...base, ctrlKey: true })).toBe(false);
    expect(clicDelPanel({ ...base, metaKey: true })).toBe(false);
    expect(clicDelPanel({ ...base, shiftKey: true })).toBe(false);
    expect(clicDelPanel({ ...base, altKey: true })).toBe(false);
    expect(clicDelPanel({ ...base, button: 1 })).toBe(false);
  });
});
