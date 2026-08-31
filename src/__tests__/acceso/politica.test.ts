import { describe, it, expect } from "vitest";
import { nivelDe, puede, type Capacidad, type Nivel } from "@/src/lib/acceso/politica";

const USUARIO = { id: "u1", email: "u1@example.com" };

describe("nivelDe", () => {
  it("sin usuario es anonimo", () => {
    expect(nivelDe(null)).toBe("anonimo");
  });

  it("con usuario y sin plan explícito es gratis", () => {
    expect(nivelDe(USUARIO)).toBe("gratis");
  });

  it("con usuario y plan 'gratis' es gratis", () => {
    expect(nivelDe(USUARIO, "gratis")).toBe("gratis");
  });

  it("con usuario y plan 'pro' es pro", () => {
    expect(nivelDe(USUARIO, "pro")).toBe("pro");
  });

  it("un plan desconocido degrada a gratis, no a pro", () => {
    expect(nivelDe(USUARIO, "enterprise")).toBe("gratis");
    expect(nivelDe(USUARIO, null)).toBe("gratis");
  });

  it("un plan sin usuario sigue siendo anonimo: la sesión manda", () => {
    expect(nivelDe(null, "pro")).toBe("anonimo");
  });
});

describe("puede", () => {
  const abiertas: Capacidad[] = [
    "explorar",
    "detalle_proceso",
    "veredicto_resumen",
    "diagnostico",
  ];
  const conCuenta: Capacidad[] = [
    "veredicto_detalle",
    "perfil_guardar",
    "coincidencias",
    "alertas",
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

  it("es monótona: lo que puede un nivel lo puede el siguiente", () => {
    const orden: Nivel[] = ["anonimo", "gratis", "pro"];
    const todas: Capacidad[] = [...abiertas, ...conCuenta, ...dePago];
    for (let i = 0; i < orden.length - 1; i++) {
      for (const cap of todas) {
        if (puede(orden[i], cap)) expect(puede(orden[i + 1], cap)).toBe(true);
      }
    }
  });
});
