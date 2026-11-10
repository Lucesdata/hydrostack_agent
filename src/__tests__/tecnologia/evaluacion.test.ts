import { describe, it, expect } from "vitest";
import {
  aCsv,
  etiquetasDeCsv,
  evaluar,
  kappaCohen,
  parseCsv,
  type EtiquetaRevisor,
} from "@/src/lib/tecnologia/evaluacion";

const et = (
  id: string,
  actividad: string,
  bienExplicito: string,
  categorias = ""
): EtiquetaRevisor => ({ id, actividad, bienExplicito, categorias });

describe("CSV", () => {
  it("ida y vuelta con comas, comillas y saltos de línea en un campo", () => {
    const filas = [
      ["id", "objeto"],
      ["A1", 'Suministro, "bombas"\ny repuestos'],
    ];
    expect(parseCsv(aCsv(filas))).toEqual(filas);
  });

  it("ignora el BOM y las líneas vacías", () => {
    expect(parseCsv("﻿a,b\n\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("etiquetasDeCsv normaliza a mayúsculas y exige las columnas", () => {
    const csv = "id,objeto,actividad,bien_explicito,categorias\nX,txt,oyM,si,bom.sum;ins\n";
    expect(etiquetasDeCsv(csv)).toEqual([et("X", "OYM", "SI", "BOM.SUM;INS")]);
    expect(() => etiquetasDeCsv("id,objeto\nX,y\n")).toThrow(/actividad/);
  });
});

describe("kappaCohen", () => {
  it("1 con acuerdo total, 0 con acuerdo igual al azar, negativo con desacuerdo sistemático", () => {
    expect(kappaCohen(["A", "B", "A", "B"], ["A", "B", "A", "B"])).toBe(1);
    expect(kappaCohen(["A", "A", "B", "B"], ["A", "B", "A", "B"])).toBeCloseTo(0, 5);
    expect(kappaCohen(["A", "B", "A", "B"], ["B", "A", "B", "A"])).toBeLessThan(0);
  });

  it("devuelve null sin datos y exige el mismo largo", () => {
    expect(kappaCohen([], [])).toBeNull();
    expect(() => kappaCohen(["A"], [])).toThrow();
  });

  it("con una sola etiqueta y acuerdo total devuelve 1", () => {
    expect(kappaCohen(["A", "A"], ["A", "A"])).toBe(1);
  });
});

describe("evaluar", () => {
  const r1 = [
    et("1", "OYM", "SI", "BOM"),
    et("2", "OBRA_REDES", "NO"),
    et("3", "OYM", "SI", "INS"),
    et("4", "OTRO", "NO"),
  ];
  const r2 = [
    et("1", "OYM", "SI", "BOM.SUM"), // misma raíz: consenso
    et("2", "OBRA_REDES", "NO"),
    et("3", "OYM", "NO"), // discrepa: a adjudicar
    et("4", "OTRO", "NO"),
  ];
  const clave = { "1": ["BOM.SUM"], "2": ["TUB"], "3": ["INS"], "4": [] };

  it("evalúa solo sobre consenso y manda las discrepancias a adjudicación", () => {
    const inf = evaluar(r1, r2, clave);
    expect(inf.porAdjudicar).toEqual(["3"]);
    expect(inf.consenso.contratos).toBe(3);
  });

  it("precisión y recobrado en categoría raíz (hijo cuenta como su raíz)", () => {
    const { consenso } = evaluar(r1, r2, clave);
    // Candidatos en consenso: fila 1 (BOM ✔) y fila 2 (TUB ✘) → 1/2.
    expect(consenso.candidatos).toBe(2);
    expect(consenso.precisionRaiz).toBeCloseTo(0.5, 5);
    expect(consenso.falsosPositivos).toEqual([{ id: "2", categoria: "TUB" }]);
    // Esperadas: solo fila 1 (BOM), encontrada.
    expect(consenso.recobradoRaiz).toBe(1);
  });

  it("registra omitidos y la cobertura de bienes explícitos", () => {
    const inf = evaluar([et("9", "OYM", "SI", "FIL")], [et("9", "OYM", "SI", "FIL")], { "9": [] });
    expect(inf.consenso.omitidos).toEqual([{ id: "9", categoria: "FIL" }]);
    expect(inf.consenso.cobertura).toEqual({ conBienExplicito: 1, conCandidato: 0 });
  });

  it("un contrato que solo tiene un revisor no cuenta", () => {
    const inf = evaluar([et("1", "OYM", "NO")], [], {});
    expect(inf.conAmbosRevisores).toBe(0);
    expect(inf.consenso.precisionRaiz).toBeNull();
  });
});
