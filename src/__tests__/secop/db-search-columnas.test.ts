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
    for (const campo of [
      "nombre",
      "descripcion",
      "fase",
      "unspsc",
      "adjudicado",
      "valorAdjudicacion",
      "adjudicatario",
      "estadoApertura",
      "url",
    ]) {
      expect(src).not.toMatch(new RegExp(`\\$\\{payload\\}->>\\$\\{F\\.${campo}\\}`));
    }
  });

  it("usa coalesce contra las columnas nuevas", () => {
    expect(src).toContain("coalesce");
    expect(src).toContain("proceso.descripcion");
  });

  // Los 4 campos con forma de SQL menos obvia (::text, case when, ->'url'->>)
  // no estaban cubiertos por el test anterior — cada uno es su propia forma de
  // esconder una regresión: alguien podría reintroducir un acceso directo al
  // payload en cualquiera de estas expresiones sin que el regex genérico de
  // arriba lo note.
  it("valorAdjudicacion: coalesce contra la columna, casteada a texto", () => {
    expect(src).toMatch(/coalesce\(\$\{proceso\.valorAdjudicacion\}::text,/);
  });

  it("adjudicatario: coalesce contra la columna propia", () => {
    expect(src).toMatch(/coalesce\(\$\{proceso\.adjudicatario\},/);
  });

  it("estadoApertura: coalesce contra la columna propia (usado también en el WHERE de apertura)", () => {
    expect(src).toMatch(/coalesce\(\$\{proceso\.estadoApertura\},/);
  });

  it("url: coalesce prioriza la columna propia sobre el payload->'url'->>'url'", () => {
    expect(src).toMatch(/coalesce\(\$\{proceso\.url\},/);
  });
});
