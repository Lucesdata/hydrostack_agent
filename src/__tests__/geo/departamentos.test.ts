import { describe, it, expect } from "vitest";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { DEPARTAMENTOS } from "@/data/dane/divipola";

/**
 * El guardia de la geometría del mapa.
 *
 * `data/geo/departamentos.geo.json` es el archivo que bloqueaba la portada
 * (ver `docs/rediseno-2026-09/SPEC-GEOMETRIA-MAPA.md`). Se cruza con
 * `procesosPorDepartamento()` por el código DIVIPOLA de dos dígitos, y ese
 * cruce falla **en silencio** si el código deja de ser texto: `"05"` como
 * número es `5`, y Antioquia —el departamento con más procesos abiertos— se
 * queda sin pintar sin que nadie vea un error.
 *
 * Por eso esto se comprueba aquí y no a ojo. El test lee el archivo real y NO
 * toca la base: el crosswalk DANE de `data/dane/divipola.ts` es justo la
 * semilla de `geografia`, así que sirve de referencia sin atar el CI a que
 * Supabase responda.
 */

const RUTA = "data/geo/departamentos.geo.json";
const crudo = readFileSync(join(process.cwd(), RUTA), "utf8");
const geo = JSON.parse(crudo) as {
  type: string;
  features: Array<{
    type: string;
    properties: { dpto: string; nombre: string };
    geometry: { type: string; coordinates: unknown };
  }>;
};

/** Todos los anillos de una geometría, sea Polygon o MultiPolygon. */
function anillos(g: { type: string; coordinates: unknown }): number[][][] {
  if (g.type === "Polygon") return g.coordinates as number[][][];
  return (g.coordinates as number[][][][]).flat();
}

const CODIGOS_DANE = DEPARTAMENTOS.map((d) => d.departamentoCodigo).sort();

describe("geometría departamental", () => {
  it("es un FeatureCollection con las 33 geometrías", () => {
    expect(geo.type).toBe("FeatureCollection");
    expect(geo.features).toHaveLength(33);
  });

  it("trae exactamente los 33 códigos del crosswalk DANE", () => {
    const codigos = geo.features.map((f) => f.properties.dpto).sort();
    expect(codigos).toEqual(CODIGOS_DANE);
  });

  it("guarda el código como texto de dos dígitos, con el cero delante", () => {
    for (const f of geo.features) {
      const c = f.properties.dpto;
      expect(typeof c).toBe("string");
      expect(c).toMatch(/^\d{2}$/);
    }
    // Los dos que rompe una conversión a número, y con ellos el cruce entero.
    const codigos = geo.features.map((f) => f.properties.dpto);
    expect(codigos).toContain("05"); // Antioquia, la de más procesos abiertos
    expect(codigos).toContain("08"); // Atlántico
  });

  it("no incluye ningún atributo que no se use", () => {
    for (const f of geo.features) {
      expect(Object.keys(f.properties).sort()).toEqual(["dpto", "nombre"]);
    }
  });

  it("solo tiene polígonos, y ninguno degenerado", () => {
    for (const f of geo.features) {
      expect(["Polygon", "MultiPolygon"]).toContain(f.geometry.type);
      const rs = anillos(f.geometry);
      expect(rs.length).toBeGreaterThan(0);
      for (const r of rs) expect(r.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("cae entero dentro de Colombia, sin los cayos ni Malpelo", () => {
    for (const f of geo.features) {
      for (const r of anillos(f.geometry)) {
        for (const [lon, lat] of r) {
          expect(lon).toBeGreaterThanOrEqual(-82);
          expect(lon).toBeLessThanOrEqual(-66);
          expect(lat).toBeGreaterThanOrEqual(-4.5);
          expect(lat).toBeLessThanOrEqual(13.6);
        }
      }
    }
  });

  it("conserva Bogotá D.C. y San Andrés como geometrías propias", () => {
    const codigos = geo.features.map((f) => f.properties.dpto);
    expect(codigos).toContain("11"); // 2.658 abiertos: tiene que ser clicable
    expect(codigos).toContain("88"); // isla, pero departamento con ruta propia
  });

  /**
   * El presupuesto de peso. No es el tamaño del archivo lo que se paga —el SVG
   * se dibuja en servidor y el JSON nunca viaja— sino los `d` de 33 `path`
   * dentro del HTML de la portada, que hoy son 91 kB. 4.000 coordenadas son
   * unos 48 kB de `d`, ~15 kB con gzip. El doble no cabe.
   */
  it("cabe en el presupuesto: ≤ 4.000 coordenadas y ≤ 150 kB", () => {
    const total = geo.features
      .flatMap((f) => anillos(f.geometry))
      .reduce((n, r) => n + r.length, 0);
    expect(total).toBeLessThanOrEqual(4000);
    expect(statSync(join(process.cwd(), RUTA)).size).toBeLessThanOrEqual(150 * 1024);
  });
});
