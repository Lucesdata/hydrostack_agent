import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AA, componer, contraste, leerTokensHex } from "@/src/lib/design/contraste";

/**
 * Los colores propios del rediseño «carta hidrográfica» (2026-11-11), que
 * `contraste-oscuro.test.ts` no cubría: tarjetas de familia, casillas de la
 * Ficha Viva, rótulo de la capa y la barra oscura rediseñada. Se mide contra el
 * peor fondo posible de cada pieza (la parte más clara de su degradado o la luz
 * del fondo), y cada color se comprueba primero en el archivo.
 */
const leer = (ruta: string) => readFileSync(join(process.cwd(), ruta), "utf8");
const base = leer("src/components/landing/hero-territorial/hero-territorial.module.css");
const v3 = leer("src/components/landing/hero-territorial/hero-v3.module.css");
const navbar = leer("src/components/Navbar.js");
const t = leerTokensHex(base);

const pinta = (fuente: string, color: string) =>
  expect(fuente.toLowerCase(), `${color} ya no aparece`).toContain(color.toLowerCase());

// Lo más claro que alcanza el degradado de una tarjeta: #11 34 50 (elegida) y,
// encima, el resplandor de la familia al 22 % (el peor caso es el cian).
const tarjetaElegida = "#113450";
const conResplandor = (fam: string) => {
  const h = (i: number) => parseInt(fam.slice(i, i + 2), 16);
  const f = [h(1), h(3), h(5)] as [number, number, number];
  return componer(f, 0.22, tarjetaElegida);
};

describe("tarjetas de familia", () => {
  for (const [nombre, color] of [
    ["texto de la cifra", t["aq-text"]],
    ["nombre y «reciben ofertas»", "#dbe9f4"],
    ["texto de la cifra y del medidor", "#c3d3e0"],
  ] as const) {
    it(`${nombre} llega a AA sobre la tarjeta elegida con resplandor`, () => {
      if (color.startsWith("#d") || color === "#c3d3e0") pinta(v3, color);
      for (const fam of [t["aq-potable"], t["aq-residual"], t["aq-redes"]]) {
        expect(
          contraste(color, conResplandor(fam)),
          `${color} sobre ${fam}`
        ).toBeGreaterThanOrEqual(AA.texto);
      }
    });
  }

  it("el icono elegido: texto noche sobre el color de cada familia", () => {
    pinta(v3, "color: #031625;\n  box-shadow: 0 6px 18px -6px var(--fam)");
    for (const fam of [t["aq-potable"], t["aq-residual"], t["aq-redes"]]) {
      expect(contraste("#031625", fam), fam).toBeGreaterThanOrEqual(AA.noTextual);
    }
  });
});

describe("Ficha Viva como expediente", () => {
  const cinta = (fam: string) => {
    const h = (i: number) => parseInt(fam.slice(i, i + 2), 16);
    return componer([h(1), h(3), h(5)], 0.18, "#0b2c46");
  };
  it("tipo, número y rótulos de las casillas", () => {
    pinta(v3, "#e6f2fa");
    for (const fam of [t["aq-potable"], t["aq-residual"], t["aq-redes"]]) {
      expect(contraste("#e6f2fa", cinta(fam)), fam).toBeGreaterThanOrEqual(AA.texto);
      expect(contraste(t["aq-muted"], cinta(fam)), fam).toBeGreaterThanOrEqual(AA.texto);
    }
    expect(contraste(t["aq-muted"], "#0b2c46")).toBeGreaterThanOrEqual(AA.texto);
  });
  it("estado «Abierto» y estados neutros", () => {
    const sobre = componer([74, 222, 128], 0.1, "#0b2c46");
    expect(contraste(t["aq-abierto"], sobre)).toBeGreaterThanOrEqual(AA.texto);
    pinta(v3, "color: #c3d3e0;\n  font-size: 12.5px");
    expect(contraste("#c3d3e0", "#0b2c46")).toBeGreaterThanOrEqual(AA.texto);
  });
});

describe("texto sobre el fondo animado", () => {
  // El peor caso: la luz azul más clara del fondo (#0b3152) bajo el texto.
  const luz = "#0b3152";
  it("titular, frase, eyebrow y accesos", () => {
    for (const color of [t["aq-text"], "#cfe0ee", t["aq-cyan"], t["aq-muted"]]) {
      expect(contraste(color, luz), color).toBeGreaterThanOrEqual(AA.texto);
    }
    pinta(v3, "#cfe0ee");
  });
  it("rótulo de la capa y pista junto al mapa", () => {
    const sobre = componer([3, 22, 37], 0.6, luz);
    expect(contraste(t["aq-text"], sobre)).toBeGreaterThanOrEqual(AA.texto);
    expect(contraste(t["aq-muted"], luz)).toBeGreaterThanOrEqual(AA.texto);
  });
});

describe("barra oscura rediseñada", () => {
  const cap = "#0a2540"; // cápsula de enlaces sobre la barra (peor caso, vidrio)
  it("enlaces de la cápsula y enlace activo", () => {
    pinta(navbar, "color: #c3d3e0; border-radius: 999px; padding: 8px 14px");
    expect(contraste("#c3d3e0", cap)).toBeGreaterThanOrEqual(AA.texto);
    pinta(navbar, "color: #031625; background: #00d9f4; font-weight: 600");
    expect(contraste("#031625", "#00d9f4")).toBeGreaterThanOrEqual(AA.texto);
  });
  it("lema bajo la marca", () => {
    pinta(navbar, "color: #aec2d2");
    expect(contraste("#aec2d2", "#05203a")).toBeGreaterThanOrEqual(AA.texto);
  });
});
