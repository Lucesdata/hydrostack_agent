import { describe, it, expect } from "vitest";
import { CAPACIDADES, nivelDe, puede, type Capacidad } from "@/src/lib/acceso/politica";

const USUARIO = { id: "u1", email: "u1@example.com" };

describe("nivelDe", () => {
  it("sin usuario es anonimo", () => {
    expect(nivelDe(null, null)).toBe("anonimo");
  });

  it("con usuario y sin plan en la fila es gratis", () => {
    expect(nivelDe(USUARIO, null)).toBe("gratis");
  });

  it("con usuario y plan 'gratis' es gratis", () => {
    expect(nivelDe(USUARIO, "gratis")).toBe("gratis");
  });

  it("con usuario y plan 'pro' es pro", () => {
    expect(nivelDe(USUARIO, "pro")).toBe("pro");
  });

  it("un plan desconocido degrada a gratis, no a pro", () => {
    expect(nivelDe(USUARIO, "enterprise")).toBe("gratis");
    expect(nivelDe(USUARIO, "")).toBe("gratis");
  });

  it("un plan sin usuario sigue siendo anonimo: la sesión manda", () => {
    expect(nivelDe(null, "pro")).toBe("anonimo");
  });
});

describe("puede", () => {
  const abiertas: Capacidad[] = ["explorar", "detalle_proceso", "veredicto_resumen", "diagnostico"];
  const conCuenta: Capacidad[] = [
    "veredicto_detalle",
    "diagnostico_historial",
    "perfil_guardar",
    "coincidencias",
    "alertas",
    "filtros",
  ];
  const dePago: Capacidad[] = ["pliego_extraer", "asistentes"];

  it("el anónimo puede exactamente lo abierto", () => {
    for (const cap of abiertas) expect(puede("anonimo", cap)).toBe(true);
    for (const cap of [...conCuenta, ...dePago]) expect(puede("anonimo", cap)).toBe(false);
  });

  it("gratis puede lo abierto y lo de cuenta, pero no lo de pago", () => {
    for (const cap of [...abiertas, ...conCuenta]) expect(puede("gratis", cap)).toBe(true);
    for (const cap of dePago) expect(puede("gratis", cap)).toBe(false);
  });

  it("pro puede todo", () => {
    for (const cap of [...abiertas, ...conCuenta, ...dePago]) {
      expect(puede("pro", cap)).toBe(true);
    }
  });

  it("los tres grupos cubren TODAS las capacidades", () => {
    // Sustituye a un test de monotonía que no podía fallar: `puede` es una
    // comparación ordinal, así que ninguna tabla la rompe. Esto sí protege —
    // añadir una capacidad sin clasificarla arriba deja su nivel sin probar, y
    // fue exactamente lo que pasó con `diagnostico_historial`.
    const clasificadas = [...abiertas, ...conCuenta, ...dePago].sort();
    expect(clasificadas).toEqual([...CAPACIDADES].sort());
  });
});
