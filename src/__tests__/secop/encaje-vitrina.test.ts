import { describe, it, expect } from "vitest";
import { idsValidos, MAX_IDS_ENCAJE, resumirVeredicto } from "@/src/lib/secop/encaje-vitrina";
import { fraseEncaje } from "@/src/components/secop/vitrina/EncajeVitrina";
import type { GateStatus, Verdict } from "@/src/lib/secop/verdict";

function veredicto(estados: GateStatus[], overall: GateStatus): Verdict {
  const [sectorial, cuantia, plazo, ubicacion, habilitacion] = estados.map((status) => ({
    status,
    reason: "no debe salir del servidor",
  }));
  return {
    procesoId: "CO1.REQ.1",
    overall,
    gates: { sectorial, cuantia, plazo, ubicacion, habilitacion },
    level: 0,
  } as unknown as Verdict;
}

describe("los ids que acepta el encaje", () => {
  it("acepta ids de SECOP y quita repetidos", () => {
    expect(idsValidos(["CO1.REQ.1", "CO1.REQ.2", "CO1.REQ.1"])).toEqual(["CO1.REQ.1", "CO1.REQ.2"]);
  });

  it("rechaza lo vacío, lo que no es lista, lo que no tiene forma de id y el exceso", () => {
    expect(idsValidos([])).toBeNull();
    expect(idsValidos("CO1.REQ.1")).toBeNull();
    expect(idsValidos(["CO1.REQ.1", "x' or 1=1"])).toBeNull();
    expect(idsValidos([42])).toBeNull();
    expect(
      idsValidos(Array.from({ length: MAX_IDS_ENCAJE + 1 }, (_, i) => `CO1.REQ.${i}`))
    ).toBeNull();
  });
});

describe("el resumen del veredicto", () => {
  it("cuenta las que cumple y las que no, y no lleva los reason", () => {
    const r = resumirVeredicto(veredicto(["PASS", "PASS", "FAIL", "UNKNOWN", "PASS"], "FAIL"));
    expect(r).toEqual({ cumple: 3, noCumple: 1, total: 5, overall: "FAIL" });
    expect(JSON.stringify(r)).not.toContain("reason");
  });
});

describe("la frase de la tarjeta sale del conteo", () => {
  it("todas cumplen", () => {
    expect(fraseEncaje({ cumple: 5, noCumple: 0, total: 5, overall: "PASS" })).toBe(
      "Cumples los 5 requisitos"
    );
  });

  it("faltan datos o hay algo que revisar", () => {
    expect(fraseEncaje({ cumple: 4, noCumple: 0, total: 5, overall: "UNKNOWN" })).toBe(
      "Cumples 4 de 5 · revisa el resto"
    );
  });

  it("alguno no se cumple, en singular y en plural", () => {
    expect(fraseEncaje({ cumple: 4, noCumple: 1, total: 5, overall: "FAIL" })).toBe(
      "Cumples 4 de 5 · uno no se cumple"
    );
    expect(fraseEncaje({ cumple: 2, noCumple: 2, total: 5, overall: "FAIL" })).toBe(
      "Cumples 2 de 5 · 2 no se cumplen"
    );
  });
});
