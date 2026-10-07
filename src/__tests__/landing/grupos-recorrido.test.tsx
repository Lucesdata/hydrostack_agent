import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ColombiaChoropleth from "@/src/components/mapa/ColombiaChoropleth";
import { aplicarGrupo } from "@/src/components/landing/hero-territorial/sincronia";
import {
  INTERVALO_RECORRIDO,
  indiceRelativo,
  siguienteIndice,
} from "@/src/components/landing/hero-territorial/recorrido";
import { familiasPorDepartamento, gruposDe, TAMANO_GRUPO } from "@/src/lib/landing/grupos-portada";
import { procesoPortada } from "./fixtures-portada";

/** Doce procesos: dos grupos de cinco y uno de dos. Departamentos variados. */
const DPTOS = ["76", "52", "11", "05", "08", "68", "25", "13", "54", "17", "73", "50"];
const doce = DPTOS.map((dpto, i) =>
  procesoPortada({
    id: `CO1.REQ.${100 + i}`,
    departamentoCodigo: dpto,
    departamento: `Departamento ${dpto}`,
    tipoProyecto: i % 2 ? "ptar" : "acueducto",
  })
);

describe("gruposDe", () => {
  it("parte en grupos de cinco, en orden, sin perder ni repetir", () => {
    const g = gruposDe(doce);
    expect(g.map((x) => x.length)).toEqual([5, 5, 2]);
    expect(g.flat().map((p) => p.id)).toEqual(doce.map((p) => p.id));
    expect(gruposDe([])).toEqual([]);
    expect(TAMANO_GRUPO).toBe(5);
  });
});

describe("mapa con varios grupos", () => {
  const html = renderToStaticMarkup(<ColombiaChoropleth filas={[]} seleccion={doce} />);

  it("dibuja las señales de todos los grupos; solo el primero visible", () => {
    expect(html.match(/class="clr-mapa__grupo"/g)).toHaveLength(1);
    expect(html.match(/class="clr-mapa__grupo is-oculto"/g)).toHaveLength(2);
    for (const p of doce) expect(html).toContain(`href="${p.href}"`);
  });

  it("el tinte inicial es el del primer grupo, no el de toda la muestra", () => {
    expect(html).toMatch(/data-dpto="76" data-familia="potable"/);
    // Bogotá (11) está en el primer grupo; Meta (50), solo en el tercero.
    expect(html).toMatch(/data-dpto="11" data-familia=/);
    expect(html).not.toMatch(/data-dpto="50" data-familia=/);
  });

  it("la descripción habla del grupo visible", () => {
    expect(html).toContain("5 procesos marcados");
  });
});

/** DOM mínimo para `aplicarGrupo`. */
function el(attrs: Record<string, string>) {
  const a = { ...attrs };
  const clases = new Set<string>(a.class ? a.class.split(" ") : []);
  return {
    a,
    clases,
    getAttribute: (n: string) => a[n] ?? null,
    setAttribute: (n: string, v: string) => {
      a[n] = v;
    },
    removeAttribute: (n: string) => {
      delete a[n];
    },
    classList: { toggle: (c: string, on: boolean) => (on ? clases.add(c) : clases.delete(c)) },
  };
}

describe("aplicarGrupo", () => {
  it("enciende el grupo pedido y repinta los departamentos con sus familias", () => {
    const g0 = el({ "data-grupo": "0" });
    const g1 = el({ "data-grupo": "1", class: "is-oculto" });
    const valle = el({
      "data-dpto": "76",
      "data-familia": "potable",
      class: "clr-mapa__dpto--sel",
    });
    const meta = el({ "data-dpto": "50" });
    const raiz = {
      querySelectorAll: (sel: string) => (sel === "[data-grupo]" ? [g0, g1] : [valle, meta]),
    };
    aplicarGrupo(raiz, 1, new Map([["50", "residual"]]));
    expect(g0.clases.has("is-oculto")).toBe(true);
    expect(g1.clases.has("is-oculto")).toBe(false);
    expect(valle.clases.has("clr-mapa__dpto--sel")).toBe(false);
    expect(valle.a["data-familia"]).toBeUndefined();
    expect(meta.clases.has("clr-mapa__dpto--sel")).toBe(true);
    expect(meta.a["data-familia"]).toBe("residual");
  });

  it("el tinte de cada grupo sale de la misma función que usa el servidor", () => {
    const [, segundo] = gruposDe(doce);
    expect([...familiasPorDepartamento(segundo).keys()]).toEqual(["68", "25", "13", "54", "17"]);
  });
});

describe("recorrido", () => {
  it("avanza y da la vuelta", () => {
    expect(siguienteIndice(-1, 5)).toBe(0);
    expect(siguienteIndice(3, 5)).toBe(4);
    expect(siguienteIndice(4, 5)).toBe(0);
    expect(siguienteIndice(0, 0)).toBe(-1);
  });

  it("las flechas de la ficha son circulares en los dos sentidos", () => {
    expect(indiceRelativo(0, -1, 5)).toBe(4);
    expect(indiceRelativo(4, 1, 5)).toBe(0);
    expect(indiceRelativo(2, 1, 5)).toBe(3);
    expect(indiceRelativo(2, -1, 5)).toBe(1);
    expect(indiceRelativo(0, 1, 0)).toBe(-1);
  });

  it("el recorrido avanza desde el proceso a la vista, no desde su propio contador", () => {
    const fuente = readFileSync("src/components/landing/hero-territorial/recorrido.js", "utf8");
    expect(fuente).toMatch(/ids\.indexOf\(actualRef\.current\)/);
  });

  it("da tiempo a leer una ficha: 7 s por paso (2026-10-07; eran 5 s para una etiqueta)", () => {
    expect(INTERVALO_RECORRIDO).toBe(7000);
  });

  it("respeta reducir movimiento, la pestaña oculta y la pausa", () => {
    const fuente = readFileSync("src/components/landing/hero-territorial/recorrido.js", "utf8");
    expect(fuente).toContain("prefers-reduced-motion: reduce");
    expect(fuente).toContain("document.hidden");
    expect(fuente).toContain("clearInterval");
    expect(fuente).not.toMatch(/scrollIntoView|scrollTo/);
    const hero = readFileSync(
      "src/components/landing/hero-territorial/HeroTerritorial.jsx",
      "utf8"
    );
    expect(hero).toMatch(/hayRecorrido && !pausado && !interactuando/);
  });
});
