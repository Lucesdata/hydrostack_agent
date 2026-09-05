/**
 * Validación del filtro de usuario (SDD §4.2).
 *
 * El caso que más importa es el primero: **un array vacío significa "sin
 * restricción", no "no coincide con nada"**. Si esa semántica se invierte, un
 * filtro recién creado devuelve silencio en vez del sector entero, y el
 * silencio es el modo de fallo caro de este producto (SDD §6.2).
 */

import { describe, it, expect } from "vitest";
import { validarFiltro, EVENTOS_NOTIFICABLES } from "@/src/lib/al/filtros/tipos";

describe("validarFiltro", () => {
  it("un filtro solo con nombre es válido y no restringe nada", () => {
    const r = validarFiltro({ nombre: "Todo el sector" });
    expect(r.error).toBeNull();
    expect(r.valor.unspsc).toEqual([]);
    expect(r.valor.palabrasClave).toEqual([]);
    expect(r.valor.divipola).toEqual([]);
    expect(r.valor.valorMin).toBeNull();
    expect(r.valor.valorMax).toBeNull();
    expect(r.valor.activo).toBe(true);
  });

  it("por defecto notifica las tres transiciones", () => {
    const r = validarFiltro({ nombre: "x" });
    expect(r.valor.eventosNotificables).toEqual([...EVENTOS_NOTIFICABLES]);
  });

  it("una lista vacía de eventos SÍ es una decisión y se respeta", () => {
    // A diferencia de los arrays de criterio, aquí el vacío significa "no me
    // avises de nada" y no debe rellenarse con el default.
    const r = validarFiltro({ nombre: "x", eventosNotificables: [] });
    expect(r.error).toBeNull();
    expect(r.valor.eventosNotificables).toEqual([]);
  });

  it("normaliza las palabras clave a mayúsculas y deduplica", () => {
    const r = validarFiltro({ nombre: "x", palabrasClave: ["ptap", "PTAP", " ptar "] });
    expect(r.valor.palabrasClave).toEqual(["PTAP", "PTAR"]);
  });

  it("limpia el formato del NIT y deja solo dígitos", () => {
    const r = validarFiltro({ nombre: "x", entidadesNit: ["900.123.456-7"] });
    expect(r.valor.entidadesNit).toEqual(["9001234567"]);
  });

  it("acepta DIVIPOLA de departamento (2) y de municipio (5)", () => {
    const r = validarFiltro({ nombre: "x", divipola: ["05", "05001"] });
    expect(r.error).toBeNull();
    expect(r.valor.divipola).toEqual(["05", "05001"]);
  });

  it("rechaza un DIVIPOLA de 3 dígitos", () => {
    expect(validarFiltro({ nombre: "x", divipola: ["050"] }).error).toMatch(/divipola/i);
  });

  it("rechaza un UNSPSC que no sea de 6 a 8 dígitos", () => {
    expect(validarFiltro({ nombre: "x", unspsc: ["V1.83101500"] }).error).toMatch(/unspsc/i);
    expect(validarFiltro({ nombre: "x", unspsc: ["83101500"] }).error).toBeNull();
  });

  it("guarda la cuantía como numeric(20,2) en texto", () => {
    const r = validarFiltro({ nombre: "x", valorMin: 500_000_000 });
    expect(r.valor.valorMin).toBe("500000000.00");
  });

  it("rechaza un rango de cuantía invertido", () => {
    const r = validarFiltro({ nombre: "x", valorMin: 100, valorMax: 50 });
    expect(r.error).toMatch(/valorMin no puede ser mayor/);
  });

  it("rechaza un filtro sin nombre", () => {
    expect(validarFiltro({}).error).toMatch(/nombre/);
    expect(validarFiltro({ nombre: "   " }).error).toMatch(/nombre/);
  });

  it("rechaza un evento que no existe", () => {
    expect(validarFiltro({ nombre: "x", eventosNotificables: ["cancelacion"] }).error).toMatch(
      /solo admite/
    );
  });
});
