import { describe, expect, it } from "vitest";
import { porcentajePagado } from "@/src/lib/secop/avance-adjudicado";

describe("porcentaje pagado", () => {
  it("compara el pago publicado con el valor vigente del mismo contrato", () => {
    expect(porcentajePagado(75, 300)).toBe(25);
  });

  it("no presenta ausencias, ceros de SECOP ni montos inconsistentes como avance", () => {
    expect(porcentajePagado(null, 100)).toBeNull();
    expect(porcentajePagado(0, 100)).toBeNull();
    expect(porcentajePagado(20, null)).toBeNull();
    expect(porcentajePagado(105, 100)).toBeNull();
  });
});
