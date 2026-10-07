import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PanelRegion from "@/src/components/landing/hero-territorial/PanelRegion";
import HeroTerritorial from "@/src/components/landing/hero-territorial/HeroTerritorial";
import { esRespuestaDe, urlRegion } from "@/src/components/landing/hero-territorial/region";
import {
  aplicarRegion,
  regionDesdeObjetivo,
} from "@/src/components/landing/hero-territorial/sincronia";
import { hrefRegion, type ConteoDepartamento } from "@/src/lib/landing/conteos-familia";
import { procesoPortada } from "./fixtures-portada";

/**
 * El panel de una región del hero (spec 2026-10-07-hero-tres-destacados,
 * PR 3). Datos de prueba, no de SECOP.
 */

const abierto = { ...procesoPortada({ id: "CO1.REQ.1" }), cierre: "2026-10-20" };
const cerrado = {
  ...procesoPortada({ id: "CO1.REQ.2", abierto: false, estado: "Adjudicado" }),
  cierre: "2026-03-15",
};
const listo = (procesos = [abierto, cerrado]) => ({
  fase: "listo",
  datos: { dpto: "05", familia: "potable", conteo: { n: 36, abiertos: 16 }, procesos },
  reintentar: () => {},
});
const panel = (estado: object, conteo = { n: 36, abiertos: 16 }) =>
  renderToStaticMarkup(
    <PanelRegion
      dpto="05"
      nombre="Antioquia"
      familia="potable"
      conteo={conteo}
      estado={estado}
      onCerrar={() => {}}
    />
  );

describe("PanelRegion", () => {
  it("cabecera con región y familia, el conteo del mapa y volver al destacado", () => {
    const html = panel(listo());
    expect(html).toMatch(
      /<h2 id="aq-region-titulo" tabindex="-1">Antioquia(<!-- -->)? · (<!-- -->)?Agua potable<\/h2>/
    );
    expect(html).toContain("36 en 2026 · 16 reciben ofertas");
    expect(html).toContain("los 5 de mayor presupuesto");
    expect(html).toContain("Volver al destacado");
  });

  it("cada proceso enlaza su ficha y dice si recibe ofertas; nunca presenta un cerrado como oportunidad", () => {
    const html = panel(listo());
    expect(html).toContain(`href="${abierto.href}"`);
    expect(html).toContain("Recibe ofertas hasta el 20 oct 2026");
    expect(html).toContain("No recibe ofertas");
    expect(html.match(/Recibe ofertas hasta/g)).toHaveLength(1);
  });

  it("el enlace a la vitrina solo si alguno recibe ofertas, y va antes de la lista", () => {
    const html = panel(listo());
    const enlace = hrefRegion("Antioquia", "potable").replaceAll("&", "&amp;");
    expect(html).toContain(`href="${enlace}"`);
    expect(html.indexOf(enlace)).toBeLessThan(html.indexOf("<ol"));
    expect(html).toMatch(
      /Ver los 16 que reciben ofertas en (<!-- -->)?Antioquia|Ver los 16 que reciben ofertas en Antioquia/
    );
    const ninguno = panel(listo(), { n: 3, abiertos: 0 });
    expect(ninguno).not.toContain("/licitaciones?");
    expect(ninguno).toMatch(/Ninguno recibe ofertas hoy en (<!-- -->)?Antioquia/);
  });

  it("cargando y error se dicen; el error ofrece reintentar", () => {
    expect(panel({ fase: "cargando", reintentar: () => {} })).toMatch(/Cargando los procesos de/);
    const error = panel({ fase: "error", reintentar: () => {} });
    expect(error).toContain("No pudimos cargar los procesos");
    expect(error).toContain(">Reintentar</button>");
    expect(error).not.toContain("<ol");
  });
});

describe("datos de la región", () => {
  it("la URL de la API y la respuesta solo se aceptan si son de la región pedida", () => {
    expect(urlRegion("05", "residual")).toBe("/api/portada/region/05/residual");
    const datos = listo().datos;
    expect(esRespuestaDe(datos, "05", "potable")).toBe(true);
    expect(esRespuestaDe(datos, "50", "potable")).toBe(false);
    expect(esRespuestaDe(datos, "05", "redes")).toBe(false);
    expect(esRespuestaDe({ error: "x" }, "05", "potable")).toBe(false);
    expect(esRespuestaDe(null, "05", "potable")).toBe(false);
  });

  it("la vitrina de la región: familia, slug del departamento y por presupuesto", () => {
    expect(hrefRegion("Bogotá D.C.", "redes")).toBe(
      "/licitaciones?tipo=redes&departamento=bogota-d-c&orden=valor"
    );
  });
});

/** DOM mínimo para la sincronía. */
function camino(attrs: Record<string, string>) {
  const clases = new Set<string>();
  return {
    clases,
    getAttribute: (k: string) => attrs[k] ?? null,
    closest: (sel: string) => (sel === "path[data-dpto]" ? camino(attrs) : null),
    classList: { toggle: (c: string, on: boolean) => (on ? clases.add(c) : clases.delete(c)) },
  };
}

describe("el mapa abre la región", () => {
  it("solo un departamento con procesos en la capa elegida", () => {
    const antioquia = camino({ "data-dpto": "05", "data-e-potable": "3", "data-e-redes": "0" });
    expect(regionDesdeObjetivo(antioquia, "potable")).toBe("05");
    expect(regionDesdeObjetivo(antioquia, "redes")).toBeNull();
    expect(regionDesdeObjetivo(antioquia, null)).toBeNull();
    expect(regionDesdeObjetivo({ closest: () => null }, "potable")).toBeNull();
  });

  it("marca el departamento abierto y solo ese", () => {
    const a = camino({ "data-dpto": "05" });
    const b = camino({ "data-dpto": "76" });
    const raiz = { querySelectorAll: () => [a, b] };
    aplicarRegion(raiz, "76");
    expect([a.clases.has("is-region"), b.clases.has("is-region")]).toEqual([false, true]);
    aplicarRegion(raiz, null);
    expect(b.clases.has("is-region")).toBe(false);
  });
});

describe("hero con regiones", () => {
  const cero = { n: 0, abiertos: 0 };
  const conteos: ConteoDepartamento[] = [
    {
      dpto: "05",
      nombre: "Antioquia",
      potable: { n: 36, abiertos: 16 },
      residual: cero,
      redes: cero,
    },
  ];
  const destacados = (["potable", "residual", "redes"] as const).map((familia, i) => ({
    familia,
    proceso: procesoPortada({ id: `CO1.REQ.${i + 1}` }),
    cierre: "2026-10-20",
    holgado: true,
  }));
  const html = renderToStaticMarkup(
    <HeroTerritorial destacados={destacados} conteos={conteos} mapa={<svg />} />
  );

  it("cada departamento de la lista es un enlace a su vitrina (sin JavaScript) que abre su panel", () => {
    expect(html).toContain(`href="${hrefRegion("Antioquia", "potable").replaceAll("&", "&amp;")}"`);
  });

  it("de entrada no hay región abierta: se ve el destacado", () => {
    expect(html).not.toContain("aq-region-titulo");
    expect(html).toContain('class="aqMini"');
  });

  it("la única petición del hero es la de la región, fuera del componente", () => {
    const hero = readFileSync(
      "src/components/landing/hero-territorial/HeroTerritorial.jsx",
      "utf8"
    );
    const panelFuente = readFileSync(
      "src/components/landing/hero-territorial/PanelRegion.jsx",
      "utf8"
    );
    expect(hero).not.toContain("fetch(");
    expect(panelFuente).not.toContain("fetch(");
    expect(readFileSync("src/components/landing/hero-territorial/region.js", "utf8")).toContain(
      "AbortController"
    );
    // Con una región abierta el recorrido se detiene.
    expect(hero).toMatch(/!interactuando && !regionAbierta/);
  });
});
