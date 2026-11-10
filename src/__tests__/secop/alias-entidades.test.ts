import { describe, expect, it } from "vitest";
import { ALIAS_ENTIDADES, aliasDeBusqueda } from "@/src/lib/secop/alias-entidades";

describe("alias de entidades", () => {
  it("resuelve la sigla a su NIT, sin importar mayúsculas, tildes ni signos", () => {
    expect(aliasDeBusqueda("EMCALI")?.nit).toBe("890399003");
    expect(aliasDeBusqueda("  emcali ")?.nit).toBe("890399003");
    expect(aliasDeBusqueda("U.A.E.S.P.")?.nit).toBe("900126860");
    expect(aliasDeBusqueda("EAAB")?.nit).toBe("899999094");
  });
  it("no es una coincidencia aproximada", () => {
    expect(aliasDeBusqueda("emcalima")).toBeNull();
    expect(aliasDeBusqueda("emcali cali")).toBeNull();
    expect(aliasDeBusqueda("cali")).toBeNull();
    expect(aliasDeBusqueda("")).toBeNull();
  });
  it("EMCALI avisa de que EMCALIMA es otra entidad", () => {
    expect(aliasDeBusqueda("emcali")?.nota).toContain("EMCALIMA");
  });
  it("todo NIT es de 9 dígitos y no se repite", () => {
    const nits = Object.values(ALIAS_ENTIDADES).map((a) => a.nit);
    for (const n of nits) expect(n).toMatch(/^\d{9}$/);
    expect(new Set(nits).size).toBe(nits.length);
  });
});
