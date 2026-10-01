import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AA, componer, contraste, leerTokensHex } from "@/src/lib/design/contraste";
import { FAMILIAS } from "@/src/lib/classify/tipo-color";

/**
 * El guardia de legibilidad del tema oscuro de la portada.
 *
 * `contraste.test.ts` mide los tokens de `globals.css`, que son del tema claro.
 * El hero y la barra de navegación de la portada pintan con colores propios
 * (`--aq-*` en hero-territorial.module.css y sus copias en Navbar.js; el ticker,
 * que también los copiaba, salió el 2026-09-27), así que hasta el 2026-09-26
 * nadie los medía — y el texto
 * blanco de los botones azules daba 3,08:1 y 2,30:1.
 *
 * Se leen los archivos reales. Los colores escritos a mano (no tokens) se
 * comprueban primero en el archivo: si alguien los cambia, este test lo nota en
 * vez de seguir midiendo un color que ya nadie pinta.
 */

const leer = (ruta: string) => readFileSync(join(process.cwd(), ruta), "utf8");
const HERO = "src/components/landing/hero-territorial/hero-territorial.module.css";
const css = leer(HERO);
const navbar = leer("src/components/Navbar.js");
const fichaViva = leer("src/components/landing/ficha-viva/ficha-viva.module.css");
const t = leerTokensHex(css);

/** El color está escrito en el archivo (sin distinguir mayúsculas). */
const pinta = (fuente: string, color: string) =>
  expect(fuente.toLowerCase(), `${color} ya no aparece en el archivo`).toContain(
    color.toLowerCase()
  );

const fondo = () => t["aq-bg"];
const panel = () => componer([12, 32, 52], 0.72, fondo());

describe("tokens del hero", () => {
  it("define los que este test necesita", () => {
    const requeridos = ["aq-bg", "aq-text", "aq-muted", "aq-cyan", "aq-cta", "aq-cta-2"];
    expect(requeridos.filter((k) => !t[k])).toEqual([]);
  });
});

describe("texto sobre el fondo oscuro", () => {
  const casos: Array<[string, () => string, () => string]> = [
    ["texto principal", () => t["aq-text"], fondo],
    ["texto secundario", () => t["aq-muted"], fondo],
    ["cian de rótulos y enlaces", () => t["aq-cyan"], fondo],
    ["texto secundario sobre panel", () => t["aq-muted"], panel],
  ];
  for (const [nombre, texto, sobre] of casos) {
    it(`${nombre} llega a AA`, () => {
      expect(contraste(texto(), sobre())).toBeGreaterThanOrEqual(AA.texto);
    });
  }

  it("colores escritos a mano en el hero llegan a AA", () => {
    for (const [color, sobre] of [
      ["#c3d3e0", fondo()], // párrafo del hero
      ["#7d93a6", panel()], // placeholder del buscador
    ] as const) {
      pinta(css, color);
      expect(contraste(color, sobre), `${color}`).toBeGreaterThanOrEqual(AA.texto);
    }
  });
});

describe("resultado y opciones del mapa", () => {
  // El resultado del departamento dejó de ser una tarjeta blanca (2026-09-27):
  // va sobre el fondo, con los colores de texto de arriba. Lo nuevo es el panel
  // flotante de «Opciones del mapa».
  it("etiquetas y valores del panel de opciones llegan a AA", () => {
    pinta(css, "#0a1d30");
    for (const token of ["aq-text", "aq-muted", "aq-cyan"]) {
      expect(contraste(t[token], "#0a1d30"), `--${token}`).toBeGreaterThanOrEqual(AA.texto);
    }
  });
});

describe("semáforo de los destacados, en oscuro (hero v2)", () => {
  // semaforo/estilos.ts pinta con los tokens de fondo claro; el hero los
  // sobreescribe. Sin perfil solo hay DATO y UNKNOWN, que son los que se miden.
  it("etiqueta y valor de cada compuerta llegan a AA", () => {
    for (const color of ["#c3d3e0", "#d7edf8"]) {
      pinta(css, color);
      expect(contraste(color, fondo()), color).toBeGreaterThanOrEqual(AA.texto);
    }
    // El valor de una compuerta UNKNOWN baja a --aq-muted.
    expect(css).toContain(".sf-item:has(.sf-punto--unknown) .sf-palabra");
    expect(contraste(t["aq-muted"], fondo())).toBeGreaterThanOrEqual(AA.texto);
  });

  it("los puntos DATO y UNKNOWN se distinguen del fondo (no textual)", () => {
    expect(css).toMatch(/\.sf-punto--dato\)\s*\{\s*background: var\(--aq-cyan\)/);
    expect(css).toMatch(/\.sf-punto--unknown\)\s*\{\s*background: var\(--aq-muted\)/);
    for (const token of ["aq-cyan", "aq-muted"]) {
      expect(contraste(t[token], fondo()), `--${token}`).toBeGreaterThanOrEqual(AA.noTextual);
    }
  });
});

describe("botones azules con texto blanco", () => {
  it("se lee en los dos extremos del degradado del CTA principal", () => {
    expect(contraste("#ffffff", t["aq-cta"])).toBeGreaterThanOrEqual(AA.texto);
    expect(contraste("#ffffff", t["aq-cta-2"])).toBeGreaterThanOrEqual(AA.texto);
  });

  it("el botón se distingue del fondo (componente no textual)", () => {
    expect(contraste(t["aq-cta"], fondo())).toBeGreaterThanOrEqual(AA.noTextual);
  });

  it("la barra de navegación usa el mismo azul, no el que no se leía", () => {
    pinta(navbar, t["aq-cta"]);
    expect(navbar.toLowerCase()).not.toContain("background: #1a9be0");
  });
});

describe("barra y árbol de la Ficha Viva", () => {
  const barra = componer([6, 20, 35], 0.94, "#061423");
  it("enlaces y texto secundario de la barra oscura", () => {
    for (const color of ["#c3d3e0", "#9fb4c6"]) {
      pinta(navbar, color);
      expect(contraste(color, barra)).toBeGreaterThanOrEqual(AA.texto);
    }
  });

  it("texto del árbol de decisiones", () => {
    pinta(fichaViva, "#0b2239");
    for (const color of ["#c3d3e0", "#9fb4c6", "#4cc9ff"]) {
      pinta(fichaViva, color);
      expect(contraste(color, "#0b2239")).toBeGreaterThanOrEqual(AA.texto);
    }
  });
});

describe("tipos de la ficha del departamento", () => {
  it("el nombre del tipo, en su color, se lee sobre el panel", () => {
    for (const f of FAMILIAS) {
      expect(contraste(f.oscuro, panel()), f.label).toBeGreaterThanOrEqual(AA.texto);
    }
  });
});

describe("rampa del mapa", () => {
  const rampa = [0, 1, 2, 3, 4, 5].map((i) => t[`aq-e${i}`]);

  it("cada escalón se distingue del anterior", () => {
    // No lleva texto encima, así que no se mide contra AA. Lo que no puede
    // pasar es que dos escalones vecinos se confundan: el más cercano de los
    // de siempre (--aq-e3 → --aq-e4) está en 1,45:1.
    expect(rampa.every(Boolean)).toBe(true);
    for (let i = 1; i < rampa.length; i++) {
      expect(contraste(rampa[i - 1], rampa[i]), `e${i - 1} → e${i}`).toBeGreaterThanOrEqual(1.4);
    }
  });

  it("el anillo del seleccionado se ve sobre el escalón más claro y junto al más oscuro", () => {
    // Trazo --aq-bg y halo claro (2026-09-27). Un trazo solo blanco daba 1,29:1
    // sobre --aq-e5. Componente no textual: 3:1 (WCAG 1.4.11).
    const regla = css.slice(css.indexOf(".clr-mapa__dpto.is-seleccionado"));
    const bloque = regla.slice(0, regla.indexOf("}"));
    expect(bloque).toContain("stroke: var(--aq-bg)");
    expect(bloque).toContain("#f3f8fc");
    expect(contraste(t["aq-bg"], t["aq-e5"])).toBeGreaterThanOrEqual(AA.noTextual);
    expect(contraste("#f3f8fc", t["aq-e0"])).toBeGreaterThanOrEqual(AA.noTextual);
  });

  it("la imagen para compartir usa la misma rampa", () => {
    const og = leer("app/opengraph-image.js");
    for (const color of rampa) pinta(og, color);
  });
});
