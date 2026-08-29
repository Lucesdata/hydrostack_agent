import { describe, it, expect } from "vitest";
import { construirHistorial, versionesEnHistorial } from "@/src/lib/diagnostico/historial";
import type { DiagnosticoGuardado } from "@/src/lib/diagnostico/diagnostico-store";

/** Fila mínima: al historial solo le importan versión, puntaje y bloqueantes. */
const d = (
  version: string,
  puntajeTotal: number,
  bloqueantes: string[],
  dia: number
): DiagnosticoGuardado =>
  ({
    id: `d${dia}`,
    usuarioId: "u1",
    version,
    respuestas: {},
    puntajeTotal,
    banda: "casi",
    puntajeAreas: {},
    escalon: null,
    estadoRup: null,
    bloqueantes,
    bloqueoAbsoluto: [],
    creadoEn: new Date(2026, 7, dia),
  }) as unknown as DiagnosticoGuardado;

describe("construirHistorial", () => {
  it("el más antiguo no tiene con qué compararse", () => {
    const h = construirHistorial([d("co-apsb-v1", 60, [], 1)]);
    expect(h[0].variacion).toBeNull();
    expect(h[0].bloqueantesResueltos).toBeNull();
  });

  it("calcula la variación contra el anterior en el tiempo", () => {
    // Llegan del más reciente al más antiguo, como los da el store.
    const h = construirHistorial([
      d("co-apsb-v1", 78, ["rup_no"], 20),
      d("co-apsb-v1", 60, ["rup_no", "secop_no", "fin_no"], 10),
    ]);
    expect(h[0].variacion).toBe(18);
    expect(h[0].bloqueantesResueltos).toBe(2);
    expect(h[1].variacion).toBeNull();
  });

  it("una variación negativa se reporta tal cual", () => {
    const h = construirHistorial([
      d("co-apsb-v1", 50, ["rup_vencido"], 20),
      d("co-apsb-v1", 70, [], 10),
    ]);
    // El RUP se venció entre un diagnóstico y otro: es información, no un error.
    expect(h[0].variacion).toBe(-20);
    expect(h[0].bloqueantesResueltos).toBe(0);
  });

  it("NUNCA compara cuestionarios distintos", () => {
    // Restar 88 (co-esp, 8 preguntas) menos 60 (co-apsb, 10) daría un +28 con
    // aspecto de progreso y sin ningún significado.
    const h = construirHistorial([d("co-esp-v1", 88, [], 20), d("co-apsb-v1", 60, [], 10)]);
    expect(h[0].variacion).toBeNull();
    expect(h[1].variacion).toBeNull();
  });

  it("salta por encima de otra variante para encontrar su propio anterior", () => {
    const h = construirHistorial([
      d("co-apsb-v1", 80, [], 30), // el más reciente
      d("co-esp-v1", 95, [], 20), // otra variante, se ignora al comparar
      d("co-apsb-v1", 55, ["fin_no"], 10),
    ]);
    expect(h[0].variacion).toBe(25);
    expect(h[0].bloqueantesResueltos).toBe(1);
    expect(h[1].variacion).toBeNull(); // primero de co-esp-v1
    expect(h[2].variacion).toBeNull(); // primero de co-apsb-v1
  });

  it("un historial vacío no rompe nada", () => {
    expect(construirHistorial([])).toEqual([]);
  });

  it("conserva el orden que recibe", () => {
    const entradas = construirHistorial([
      d("co-apsb-v1", 80, [], 30),
      d("co-apsb-v1", 70, [], 20),
      d("co-apsb-v1", 60, [], 10),
    ]);
    expect(entradas.map((e) => e.diagnostico.puntajeTotal)).toEqual([80, 70, 60]);
    expect(entradas.map((e) => e.variacion)).toEqual([10, 10, null]);
  });
});

describe("versionesEnHistorial", () => {
  it("lista las variantes distintas, sin repetir y en orden de aparición", () => {
    expect(
      versionesEnHistorial([
        d("co-apsb-v1", 80, [], 30),
        d("co-esp-v1", 90, [], 20),
        d("co-apsb-v1", 60, [], 10),
      ])
    ).toEqual(["co-apsb-v1", "co-esp-v1"]);
    expect(versionesEnHistorial([])).toEqual([]);
  });
});
