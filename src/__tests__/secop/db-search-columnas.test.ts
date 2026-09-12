import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

/**
 * Test de grano grueso sobre el SQL generado: no hay base en CI, así que lo
 * que se verifica es que el módulo ya no dependa del payload para estos
 * campos. Se sustituye por asserts sobre datos reales en la Tarea 12.
 */
describe("db-search ya no lee el payload para los campos promovidos", () => {
  const src = readFileSync("src/lib/secop/db-search.ts", "utf8");

  it("no quedan accesos directos payload->>F.<campo promovido>", () => {
    for (const campo of ["nombre", "descripcion", "fase", "unspsc", "adjudicado"]) {
      expect(src).not.toMatch(new RegExp(`\\$\\{payload\\}->>\\$\\{F\\.${campo}\\}`));
    }
  });

  it("usa coalesce contra las columnas nuevas", () => {
    expect(src).toContain("coalesce");
    expect(src).toContain("proceso.descripcion");
  });
});
