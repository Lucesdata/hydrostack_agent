import { describe, it, expect } from "vitest";
import {
  CLASES_ENTIDAD,
  CLASE_ENTIDAD,
  CLASE_ENTIDAD_POR_SLUG,
  claseDeEntidad,
  sqlClaseEntidad,
} from "@/src/lib/secop/clase-entidad";

/**
 * La regla de clase de entidad vive dos veces: en TypeScript y emitida a SQL.
 * Que coincidan se comprobó contra los 4.223 nombres reales de la base el
 * 2026-09-15 — cero discrepancias. Aquí se fija la estructura y los casos que
 * decidieron los patrones, que es lo que se puede probar sin base.
 */

describe("la taxonomía de entidades", () => {
  it("tiene cinco clases y `otras` al final", () => {
    expect(CLASES_ENTIDAD).toHaveLength(5);
    expect(CLASES_ENTIDAD.at(-1)).toBe("otras");
  });

  it("resuelve slug → clase en los dos sentidos", () => {
    for (const c of CLASES_ENTIDAD) {
      expect(CLASE_ENTIDAD_POR_SLUG[CLASE_ENTIDAD[c].slug]).toBe(c);
    }
  });
});

describe("claseDeEntidad", () => {
  it("reconoce a los prestadores por su razón social", () => {
    expect(claseDeEntidad("EMPRESA DE ACUEDUCTO Y ALCANTARILLADO DE BOGOTÁ")).toBe("esp");
    expect(claseDeEntidad("AGUAS DE CARTAGENA S.A. E.S.P.")).toBe("esp");
    expect(claseDeEntidad("EMPRESAS PÚBLICAS DE MEDELLÍN")).toBe("esp");
  });

  it("una ESP territorial sigue siendo ESP: el nivel no la degrada", () => {
    // El nivel de gobierno solo decide cuando el nombre no delata a un prestador.
    expect(claseDeEntidad("EMPRESA DE ACUEDUCTO DE PEREIRA", "Territorial")).toBe("esp");
  });

  it("el nivel declarado gana al nombre cuando dice nacional", () => {
    // Es un dato de la fuente, no una inferencia sobre una cadena de texto.
    expect(claseDeEntidad("INSTITUTO DE PLANIFICACIÓN", "Nacional")).toBe("nacional");
    expect(claseDeEntidad("CORPORACIÓN DEL VALLE", "Corporación Autónoma")).toBe("nacional");
  });

  it("separa alcaldías de gobernaciones", () => {
    expect(claseDeEntidad("ALCALDÍA DE MEDELLÍN")).toBe("alcaldia");
    expect(claseDeEntidad("MUNICIPIO DE SOACHA")).toBe("alcaldia");
    expect(claseDeEntidad("GOBERNACIÓN DE ANTIOQUIA")).toBe("gobernacion");
    expect(claseDeEntidad("DEPARTAMENTO DEL HUILA")).toBe("gobernacion");
  });

  it("lo que no encaja cae en `otras`, no se fuerza", () => {
    expect(claseDeEntidad("HOSPITAL SAN RAFAEL")).toBe("otras");
    expect(claseDeEntidad(null)).toBe("otras");
  });
});

describe("sqlClaseEntidad", () => {
  it("emite un CASE con las cinco salidas y en el mismo orden que el TS", () => {
    const sql = sqlClaseEntidad("e.nombre", "e.nivel_gobierno");
    for (const c of CLASES_ENTIDAD) expect(sql).toContain(`'${c}'`);
    // El orden importa: si `esp` dejara de evaluarse primero, toda ESP
    // territorial pasaría a otra clase sin que nada fallara.
    expect(sql.indexOf("'esp'")).toBeLessThan(sql.indexOf("'nacional'"));
    expect(sql.indexOf("'alcaldia'")).toBeLessThan(sql.indexOf("'gobernacion'"));
  });

  it("usa las columnas que le pasan, para poder aplicarse con alias", () => {
    expect(sqlClaseEntidad("x.nom", "x.niv")).toContain("x.nom");
    expect(sqlClaseEntidad("x.nom", "x.niv")).toContain("x.niv");
  });

  it("emite los mismos patrones que usa el clasificador de TypeScript", () => {
    // Una sola definición, dos emisores: si alguien edita los patrones de una
    // clase, esto sigue pasando; si añade un patrón solo al SQL, no.
    const sql = sqlClaseEntidad("n", "g");
    for (const c of CLASES_ENTIDAD) {
      for (const p of CLASE_ENTIDAD[c].patrones) expect(sql).toContain(p);
    }
  });
});
