import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ColombiaChoropleth from "@/src/components/mapa/ColombiaChoropleth";
import HeroTerritorial from "@/src/components/landing/hero-territorial/HeroTerritorial";
import {
  escalonFamiliaDe,
  ESCALONES_FAMILIA,
  filasDeCapa,
  textoConteo,
  type ConteoDepartamento,
} from "@/src/lib/landing/conteos-familia";
import { procesoPortada } from "./fixtures-portada";

/**
 * El mapa del hero contado por familia (spec 2026-10-07-hero-tres-destacados,
 * PR 2). Datos de prueba, no de SECOP.
 */

const cero = { n: 0, abiertos: 0 };
const conteos: ConteoDepartamento[] = [
  {
    dpto: "76",
    nombre: "Valle del Cauca",
    potable: { n: 42, abiertos: 3 },
    residual: { n: 1, abiertos: 1 },
    redes: cero,
  },
  {
    dpto: "05",
    nombre: "Antioquia",
    potable: { n: 600, abiertos: 0 },
    residual: cero,
    redes: { n: 7, abiertos: 2 },
  },
  {
    dpto: "52",
    nombre: "Nariño",
    potable: { n: 42, abiertos: 0 },
    residual: cero,
    redes: cero,
  },
];

describe("escalones por familia", () => {
  it("cortes fijos: cero, 1–9, 10–49, 50–199, 200–499, 500+", () => {
    expect(
      [0, 1, 9, 10, 49, 50, 199, 200, 499, 500, 9999].map((n) => escalonFamiliaDe(n).indice)
    ).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
    expect(escalonFamiliaDe(-1)).toBe(ESCALONES_FAMILIA[0]);
    expect(escalonFamiliaDe(Number.NaN)).toBe(ESCALONES_FAMILIA[0]);
  });
});

describe("textoConteo", () => {
  it("dice los publicados en 2026 y los que reciben ofertas, en singular cuando toca", () => {
    expect(textoConteo({ n: 1234, abiertos: 3 })).toBe("1.234 en 2026 · 3 reciben ofertas");
    expect(textoConteo({ n: 5, abiertos: 1 })).toBe("5 en 2026 · 1 recibe ofertas");
    expect(textoConteo({ n: 5, abiertos: 0 })).toBe("5 en 2026 · ninguno recibe ofertas");
    expect(textoConteo(cero)).toBe("ninguno en 2026");
  });
});

describe("filasDeCapa", () => {
  it("solo los departamentos con procesos de la familia, de más a menos; empate por nombre", () => {
    expect(filasDeCapa(conteos, "potable").map((f) => f.nombre)).toEqual([
      "Antioquia",
      "Nariño",
      "Valle del Cauca",
    ]);
    expect(filasDeCapa(conteos, "redes").map((f) => f.dpto)).toEqual(["05"]);
    expect(filasDeCapa([], "residual")).toEqual([]);
  });
});

describe("mapa con conteos", () => {
  const procesos = [procesoPortada({ id: "CO1.REQ.1" })];
  const html = renderToStaticMarkup(
    <ColombiaChoropleth filas={[]} seleccion={procesos} conteos={conteos} />
  );

  it("cada departamento lleva su escalón en las tres familias, sin el tinte de selección", () => {
    expect(html).toMatch(/data-dpto="76" data-e-potable="2" data-e-residual="1" data-e-redes="0"/);
    expect(html).toMatch(/data-dpto="05" data-e-potable="5" data-e-residual="0" data-e-redes="1"/);
    // Un departamento sin fila de conteos queda en cero en las tres.
    expect(html).toMatch(/data-dpto="91" data-e-potable="0" data-e-residual="0" data-e-redes="0"/);
    expect(html).not.toContain("clr-mapa__dpto--sel");
  });

  it("las cifras van en un grupo por familia, ocultas al lector de pantalla, sin ceros", () => {
    for (const f of ["potable", "residual", "redes"]) {
      expect(html).toContain(`class="clr-mapa__cifras" data-cifras="${f}"`);
    }
    const potable = html.slice(
      html.indexOf('data-cifras="potable"'),
      html.indexOf('data-cifras="residual"')
    );
    expect(potable.match(/class="clr-mapa__cifra"/g)).toHaveLength(3);
    expect(potable).toContain(">600<");
    const redes = html.slice(html.indexOf('data-cifras="redes"'));
    expect(redes.slice(0, redes.indexOf("</g>")).match(/class="clr-mapa__cifra"/g)).toHaveLength(1);
  });

  it("«ninguno» va rayado además de su tono, y la descripción lo explica", () => {
    expect(html).toContain('id="clr-mapa-sin-sel"');
    expect(html).toContain("se colorea según cuántos procesos del tipo elegido publicó este año");
  });

  it("sin conteos, el mapa de selección sigue como antes", () => {
    const antes = renderToStaticMarkup(<ColombiaChoropleth filas={[]} seleccion={procesos} />);
    expect(antes).not.toContain("data-e-potable");
    expect(antes).not.toContain("clr-mapa__cifras");
    expect(antes).toContain("clr-mapa__dpto--sel");
  });
});

describe("hero con conteos", () => {
  const destacados = (["potable", "residual", "redes"] as const).map((familia, i) => ({
    familia,
    proceso: procesoPortada({ id: `CO1.REQ.${i + 1}` }),
    cierre: "2026-10-20",
    holgado: true,
  }));
  const html = renderToStaticMarkup(
    <HeroTerritorial destacados={destacados} conteos={conteos} mapa={<svg />} />
  );

  it("la pestaña elegida enciende su capa en el mapa", () => {
    expect(html).toMatch(/data-capa="potable" data-familia="potable"/);
  });

  it("bajo el mapa, la escala de esa familia y la lista de departamentos por cifra", () => {
    expect(html).toMatch(
      /Procesos de (<!-- -->)?agua potable(<!-- -->)? publicados en (<!-- -->)?2026/
    );
    for (const e of ESCALONES_FAMILIA) expect(html).toContain(`>${e.etiqueta}</li>`);
    expect(html).toMatch(/Ver por departamento \((<!-- -->)?3/);
    const lista = html.slice(html.indexOf("<ol>"), html.indexOf("</ol>"));
    expect(lista.indexOf("Antioquia")).toBeLessThan(lista.indexOf("Valle del Cauca"));
    expect(lista).toContain("42 en 2026 · 3 reciben ofertas");
    // La leyenda de familias deja su sitio a la escala.
    expect(html).not.toContain('aria-label="Categorías del proceso"');
  });

  it("sin conteos (falló la consulta), la leyenda de familias y sin capa", () => {
    const sin = renderToStaticMarkup(<HeroTerritorial destacados={destacados} mapa={<svg />} />);
    expect(sin).not.toContain("data-capa");
    expect(sin).toContain('aria-label="Categorías del proceso"');
  });
});

it("la portada pide los conteos una vez, junto a los destacados, y los pasa al mapa y al hero", () => {
  const page = readFileSync("app/page.js", "utf8");
  expect(page.match(/conteosPorFamilia\(/g)).toHaveLength(1);
  expect(page).toContain("Promise.all");
  expect(page).toContain("conteos={conteos}");
  expect(page).toContain("conteos={conteos ?? undefined}");
});
