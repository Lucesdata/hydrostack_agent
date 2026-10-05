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
const rgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
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
    ] as const) {
      pinta(css, color);
      expect(contraste(color, sobre), `${color}`).toBeGreaterThanOrEqual(AA.texto);
    }
  });
});

describe("minifichas del hero (2026-10-04)", () => {
  // Las cinco tarjetas y las etiquetas del mapa van sobre --aq-card; la tarjeta
  // activa, sobre --aq-card-activa.
  const tarjetas = () => [t["aq-card"], t["aq-card-activa"]];

  it("define los colores de tarjeta, base del mapa y familias", () => {
    const requeridos = ["aq-card", "aq-card-activa", "aq-base", "aq-abierto"];
    expect(requeridos.filter((k) => !t[k])).toEqual([]);
  });

  it("objeto, número, entidad y estado llegan a AA sobre la tarjeta", () => {
    for (const sobre of tarjetas()) {
      for (const color of [t["aq-text"], t["aq-muted"], t["aq-cyan"], "#c3d3e0", "#ffffff"]) {
        pinta(css, color);
        expect(contraste(color, sobre), `${color} sobre ${sobre}`).toBeGreaterThanOrEqual(AA.texto);
      }
    }
  });

  it("la categoría se lee sobre el tinte de su familia", () => {
    pinta(css, "#e6f2fa");
    expect(css).toContain("background: color-mix(in srgb, var(--fam) 18%, transparent)");
    for (const f of FAMILIAS) {
      for (const sobre of tarjetas()) {
        const tinte = componer(rgb(f.oscuro), 0.18, sobre);
        expect(contraste("#e6f2fa", tinte), f.label).toBeGreaterThanOrEqual(AA.texto);
      }
    }
  });

  // Panel de lugar y presupuesto: un velo sobre la tarjeta (opción B, 2026-10-04).
  const VELO_PANEL: [number, number, number] = [140, 190, 225];
  const paneles = () => tarjetas().map((sobre) => componer(VELO_PANEL, 0.08, sobre));

  it("lugar, presupuesto y su contexto se leen sobre el panel", () => {
    expect(css).toContain("background: rgba(140, 190, 225, 0.08)");
    for (const sobre of paneles()) {
      for (const color of ["#c3d3e0", "#ffffff", t["aq-muted"]]) {
        expect(contraste(color, sobre), `${color} sobre ${sobre}`).toBeGreaterThanOrEqual(AA.texto);
      }
    }
  });

  it("las pastillas de estado se leen sobre su tinte", () => {
    expect(css).toContain("background: rgba(74, 222, 128, 0.12)");
    expect(css).toContain("background: rgba(159, 180, 198, 0.12)");
    for (const sobre of tarjetas()) {
      const abierto = componer([74, 222, 128], 0.12, sobre);
      const otro = componer([159, 180, 198], 0.12, sobre);
      expect(contraste(t["aq-abierto"], abierto)).toBeGreaterThanOrEqual(AA.texto);
      expect(contraste("#c3d3e0", otro)).toBeGreaterThanOrEqual(AA.texto);
    }
  });

  it("«Ver ficha» es texto blanco sobre el azul de los CTA", () => {
    expect(css).toMatch(/\.aqMiniVer\) \{[^}]*background: var\(--aq-cta\);[^}]*color: #ffffff;/);
    expect(contraste("#ffffff", t["aq-cta"])).toBeGreaterThanOrEqual(AA.texto);
    expect(contraste("#ffffff", t["aq-cta-2"])).toBeGreaterThanOrEqual(AA.texto);
  });

  it("el punto de «Abierto» se distingue de la tarjeta (no textual, 3:1)", () => {
    for (const sobre of tarjetas()) {
      expect(contraste(t["aq-abierto"], sobre)).toBeGreaterThanOrEqual(AA.noTextual);
    }
  });
});

describe("mapa de los procesos elegidos (2026-10-04)", () => {
  it("los colores de familia son los `oscuro` de tipo-color.ts", () => {
    for (const f of FAMILIAS) {
      expect(t[`aq-${f.familia}`]?.toLowerCase(), f.label).toBe(f.oscuro.toLowerCase());
    }
  });

  it("cada familia se distingue de la tarjeta y del departamento base (3:1)", () => {
    for (const f of FAMILIAS) {
      expect(contraste(f.oscuro, t["aq-card"]), f.label).toBeGreaterThanOrEqual(AA.noTextual);
      expect(contraste(f.oscuro, t["aq-base"]), f.label).toBeGreaterThanOrEqual(AA.noTextual);
    }
  });

  it("el departamento base se distingue poco del fondo, a propósito, pero se ve", () => {
    // Discreto (spec §7.2), no invisible: el contorno del país tiene que leerse.
    expect(contraste(t["aq-base"], fondo())).toBeGreaterThanOrEqual(1.3);
  });
});

describe("franja de la ficha: panel claro (2026-10-02)", () => {
  // El panel lleva .tema-claro: se miden los tokens claros que pinta.
  const claro = leerTokensHex(
    leer("app/globals.css").slice(leer("app/globals.css").indexOf(".tema-claro {"))
  );

  it("usa los tokens del tema claro, no colores sueltos", () => {
    expect(fichaViva).toContain("background: var(--surface)");
    expect(fichaViva).toContain("color: var(--accent)");
    expect(fichaViva).toContain("color: var(--accent-deep)");
  });

  it("títulos, explicaciones y enlaces llegan a AA sobre blanco", () => {
    for (const token of ["text-primary", "text-muted", "accent", "accent-deep"]) {
      expect(contraste(claro[token], claro.surface), `--${token}`).toBeGreaterThanOrEqual(AA.texto);
    }
  });

  it("el chip «QUÉ ENCONTRARÁS» se lee sobre su tinte", () => {
    const tinte = componer([3, 105, 161], 0.13, claro.surface);
    expect(contraste(claro["accent-deep"], tinte)).toBeGreaterThanOrEqual(AA.texto);
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

  it("la barra de navegación no vuelve al azul que no se leía", () => {
    expect(navbar.toLowerCase()).not.toContain("background: #1a9be0");
  });
});

describe("horizonte de luz del hero", () => {
  // La leyenda y el pie de las tarjetas pueden caer sobre el resplandor del
  // horizonte (.procesos::before). Peor caso: el resplandor a su opacidad
  // máxima (la sombra difuminada nunca llega a ella) más el halo radial, sobre
  // el fondo del hero.
  it("el texto secundario y el cian se leen sobre su punto más claro", () => {
    pinta(css, "--aq-horizonte-luz: rgba(76, 201, 255, 0.2)");
    pinta(css, "rgba(76, 201, 255, 0.07)");
    const luz = componer([76, 201, 255], 0.07, componer([76, 201, 255], 0.2, fondo()));
    for (const nombre of ["aq-text", "aq-muted", "aq-cyan"]) {
      expect(contraste(t[nombre], luz), nombre).toBeGreaterThanOrEqual(AA.texto);
    }
  });
});

describe("barra y árbol de la Ficha Viva", () => {
  // La píldora de la barra oscura (2026-10-04): su fondo translúcido sobre el
  // de la portada.
  const barra = componer([12, 32, 52], 0.8, "#061423");
  it("enlaces y texto secundario de la barra oscura", () => {
    pinta(navbar, "rgba(12, 32, 52, 0.8)");
    for (const color of ["#c3d3e0", "#9fb4c6", "#4cc9ff"]) {
      pinta(navbar, color);
      expect(contraste(color, barra)).toBeGreaterThanOrEqual(AA.texto);
    }
  });

  it("el botón blanco de la barra: texto noche y se distingue de la píldora", () => {
    pinta(navbar, "color: #061423; background: #f3f8fc");
    expect(contraste("#061423", "#f3f8fc")).toBeGreaterThanOrEqual(AA.texto);
    expect(contraste("#f3f8fc", barra)).toBeGreaterThanOrEqual(AA.noTextual);
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
