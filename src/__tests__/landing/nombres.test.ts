import { describe, it, expect } from "vitest";
import {
  SECCIONES_HOME,
  ETIQUETA_POR_NIVEL,
  NOMBRE_POR_ID,
  NAV_PRINCIPAL,
  COLUMNAS_PIE,
  MENU_CUENTA,
  seccionesPorNivel,
} from "@/src/components/landing/seccionesHome";

/** `seccionesHome.js` es JS: al indexar por un string suelto hay que ayudar a TS. */
const nombre = (id: string): string | undefined => (NOMBRE_POR_ID as Record<string, string>)[id];

describe("NOMBRE_POR_ID", () => {
  it("no nombra ninguna sección que no exista en SECCIONES_HOME", () => {
    const ids = new Set(SECCIONES_HOME.map((s) => s.id));
    const huerfanos = Object.keys(NOMBRE_POR_ID).filter((id) => !ids.has(id));
    expect(huerfanos, "sobran nombres para ids que ya no existen").toEqual([]);
  });
});

describe("seccionesPorNivel", () => {
  it("devuelve un grupo por nivel, en el orden de ETIQUETA_POR_NIVEL", () => {
    expect(seccionesPorNivel().map((g) => g.nivel)).toEqual(Object.keys(ETIQUETA_POR_NIVEL));
  });

  it("cada grupo lleva la etiqueta que le corresponde a su nivel", () => {
    for (const g of seccionesPorNivel()) {
      expect(g.etiqueta).toBe((ETIQUETA_POR_NIVEL as Record<string, string>)[g.nivel]);
      for (const s of g.secciones) expect(s.etiqueta).toBe(g.etiqueta);
    }
  });

  it("ningún nivel queda vacío: los tres tienen algo que mostrar", () => {
    // Es lo que impide que la columna "plan pro" del home salga en blanco
    // justo donde debe explicar qué cuesta dinero.
    for (const g of seccionesPorNivel()) {
      expect(
        g.secciones.length,
        `el nivel ${g.nivel} no tiene ninguna sección con nombre en NOMBRE_POR_ID`
      ).toBeGreaterThan(0);
    }
  });

  it("omite las secciones sin nombre en vez de inventarles uno", () => {
    const listadas = seccionesPorNivel().flatMap((g) => g.secciones.map((s) => s.id));
    // `veredicto` no es una página aparte, es una parte de /licitaciones: no
    // tiene nombre propio y no debe aparecer como si lo tuviera.
    expect(listadas).not.toContain("veredicto");
    for (const id of listadas) expect(nombre(id)).toBeTruthy();
  });

  it("toda sección con nombre aparece en exactamente un grupo", () => {
    // El criterio de aceptación de T-06: añadir una sección a SECCIONES_HOME
    // con nombre en NOMBRE_POR_ID la hace aparecer sin tocar S7Acceso.jsx.
    const listadas = seccionesPorNivel().flatMap((g) => g.secciones.map((s) => s.id));
    const nombradas = SECCIONES_HOME.filter((s) => nombre(s.id)).map((s) => s.id);
    expect([...listadas].sort()).toEqual([...nombradas].sort());
  });

  it("cada grupo expone el nombre legible junto a la sección", () => {
    for (const g of seccionesPorNivel()) {
      for (const s of g.secciones) expect(s.nombre).toBe(nombre(s.id));
    }
  });
});

/**
 * La navegación es una sola fuente desde 2026-09-15: `NAV_PRINCIPAL` y
 * `COLUMNAS_PIE` declaran lo que el navbar y el pie renderizan.
 *
 * Estas pruebas existen por un fallo real cometido al montarlas: se añadió
 * `precios` a las columnas del pie sin darle nombre en `NOMBRE_POR_ID`, y el
 * pie pintaba un enlace VACÍO de 44px de alto — clicable, sin texto, invisible
 * para quien no supiera que está ahí. No lo detectó nada, porque `undefined`
 * renderiza como cadena vacía sin protestar.
 */
describe("navegación: nav y pie", () => {
  it("todo id del nav existe en el catálogo y tiene nombre", () => {
    for (const id of NAV_PRINCIPAL) {
      expect(
        SECCIONES_HOME.some((s) => s.id === id),
        `${id} no está en SECCIONES_HOME`
      ).toBe(true);
      expect(nombre(id), `${id} no tiene nombre en NOMBRE_POR_ID`).toBeTruthy();
    }
  });

  it("todo id del pie existe en el catálogo y tiene nombre", () => {
    for (const col of COLUMNAS_PIE) {
      for (const id of col.ids) {
        expect(
          SECCIONES_HOME.some((s) => s.id === id),
          `${id} no está en SECCIONES_HOME`
        ).toBe(true);
        expect(nombre(id), `${id} (columna "${col.grupo}") no tiene nombre`).toBeTruthy();
      }
    }
  });

  it("ninguna sección con nombre queda sin puerta visible", () => {
    // Si una ruta tiene nombre pero no aparece ni en el nav ni en el pie, existe
    // y no hay forma de llegar a ella navegando — que es lo que le pasaba a
    // /cuenta y a /mis-coincidencias antes de este rediseño.
    const alcanzables = new Set([
      ...NAV_PRINCIPAL,
      ...COLUMNAS_PIE.flatMap((c) => c.ids),
      ...MENU_CUENTA,
    ]);
    const huerfanas = SECCIONES_HOME.filter((s) => nombre(s.id) && !alcanzables.has(s.id)).map(
      (s) => s.id
    );
    expect(huerfanas, "secciones con nombre y sin enlace en la navegación").toEqual([]);
  });

  it("el nav no repite un destino que ya está en su propia lista", () => {
    expect(new Set(NAV_PRINCIPAL).size).toBe(NAV_PRINCIPAL.length);
  });

  it("todo id del menú de usuario existe en el catálogo y tiene nombre", () => {
    for (const id of MENU_CUENTA) {
      expect(
        SECCIONES_HOME.some((s) => s.id === id),
        `${id} no está en SECCIONES_HOME`
      ).toBe(true);
      expect(nombre(id), `${id} no tiene nombre en NOMBRE_POR_ID`).toBeTruthy();
    }
  });
});
