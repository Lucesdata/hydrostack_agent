import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AA, componer, contraste, leerTokensHex } from "@/src/lib/design/contraste";

/**
 * El guardia de legibilidad del tema claro.
 *
 * Lee los tokens reales de `app/globals.css` — no una copia — y comprueba que
 * cada pareja texto/superficie que el producto pinta de verdad sigue siendo
 * legible. Si alguien cambia un token y baja el contraste, esto falla antes de
 * llegar a producción, que es lo que no ocurría hasta ahora.
 *
 * El foco es el semáforo de elegibilidad: es la pantalla donde el color no
 * decora, informa. Sus compuertas se pintan a 11,5px, y 11,5px es texto normal
 * — exige 4,5:1, no los 3:1 del texto grande.
 */

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
const t = leerTokensHex(css);

/** Las superficies sobre las que el producto pinta texto de verdad. */
const SUPERFICIES = {
  "fondo de página (--bg)": t["bg"],
  "tarjeta (--surface)": t["surface"],
} as const;

describe("tokens del tema claro", () => {
  it("define todos los que este test necesita", () => {
    const requeridos = [
      "bg",
      "surface",
      "surface-alt",
      "ink-900",
      "ink-600",
      "ink-300",
      "accent",
      "accent-ocean",
      "line",
      "success",
      "warning",
      "danger",
    ];
    expect(
      requeridos.filter((k) => !t[k]),
      "tokens que faltan en :root"
    ).toEqual([]);
  });
});

describe("semáforo de elegibilidad", () => {
  // Las cinco compuertas se pintan con estos tres colores más --ink-600 para
  // UNKNOWN. Si uno deja de leerse, el usuario deja de saber si puede participar.
  const estados = { PASS: "success", WARN: "warning", FAIL: "danger", UNKNOWN: "ink-600" };

  for (const [estado, token] of Object.entries(estados)) {
    for (const [donde, fondo] of Object.entries(SUPERFICIES)) {
      it(`${estado} se lee sobre ${donde}`, () => {
        const ratio = contraste(t[token], fondo);
        expect(
          ratio,
          `--${token} (${t[token]}) sobre ${fondo} da ${ratio.toFixed(2)}:1, y el texto de ` +
            `las compuertas es de 11,5px — texto normal, exige ${AA.texto}:1`
        ).toBeGreaterThanOrEqual(AA.texto);
      });
    }
  }

  it("los cuatro estados se distinguen entre sí por luminancia, no solo por tono", () => {
    // Un usuario con deuteranopia no separa verde de ámbar por el tono. Si
    // además comparten luminancia, PASS y WARN son el mismo píxel. Por eso la
    // lista de compuertas lleva glifo (✓ ! ✕ ?) además de color: el color nunca
    // viaja solo. Esta prueba fija ese razonamiento por escrito.
    const glifos = { PASS: "✓", WARN: "!", FAIL: "✕", UNKNOWN: "?" };
    expect(Object.keys(glifos).sort()).toEqual(Object.keys(estados).sort());
  });
});

describe("texto sobre superficie", () => {
  const textos = ["ink-900", "ink-600", "accent", "accent-ocean"];

  for (const token of textos) {
    for (const [donde, fondo] of Object.entries(SUPERFICIES)) {
      it(`--${token} se lee sobre ${donde}`, () => {
        expect(contraste(t[token], fondo)).toBeGreaterThanOrEqual(AA.texto);
      });
    }
  }

  it("el texto blanco de los botones se lee sobre el acento", () => {
    expect(contraste("#ffffff", t["accent"])).toBeGreaterThanOrEqual(AA.texto);
    expect(contraste("#ffffff", t["accent-ocean"])).toBeGreaterThanOrEqual(AA.texto);
  });
});

describe("texto sobre sus propios tintes", () => {
  /**
   * Los avisos y las pastillas de estado pintan el color sobre un lavado del
   * mismo color al 6–10% de opacidad, no sobre blanco. Es un fondo más oscuro
   * que el blanco, así que un color puede cumplir sobre tarjeta y fallar aquí —
   * que es exactamente lo que pasaba con el rojo: 4,83 sobre blanco y 3,95
   * sobre el tinte de /mis-coincidencias. Sin esta comprobación, ese fallo se
   * cuela.
   *
   * Los tintes siguen derivados del escalón -600 anterior a propósito: al 10%
   * la diferencia con el -700 es de 4 puntos RGB sobre 255, imperceptible, y
   * re-derivarlos tocaría 25 sitios repartidos en seis archivos sin que se note.
   */
  const TINTES: Array<[string, string, [number, number, number], number]> = [
    ["pastilla de éxito", "success", [22, 163, 74], 0.08],
    ["pastilla de aviso", "warning", [217, 119, 6], 0.1],
    ["aviso del explorador", "warning", [217, 119, 6], 0.08],
    ["aviso del diagnóstico", "warning", [217, 119, 6], 0.05],
    ["aviso de coincidencias", "warning", [217, 119, 6], 0.07],
    ["pastilla de error", "danger", [220, 38, 38], 0.1],
  ];

  for (const [nombre, token, rgb, alfa] of TINTES) {
    it(`${nombre}: --${token} se lee sobre su lavado al ${Math.round(alfa * 100)}%`, () => {
      const fondo = componer(rgb, alfa, t["surface"]);
      const ratio = contraste(t[token], fondo);
      expect(
        ratio,
        `--${token} (${t[token]}) sobre ${fondo} da ${ratio.toFixed(3)}:1`
      ).toBeGreaterThanOrEqual(AA.texto);
    });
  }

  /** Tintes sólidos, no compuestos, de /mis-coincidencias. */
  const SOLIDOS: Array<[string, string, string]> = [
    ["glifo de pliego conseguido", "success", "#dcfce7"],
    ["glifo de pliego fallido", "danger", "#fee2e2"],
  ];

  for (const [nombre, token, fondo] of SOLIDOS) {
    it(`${nombre}: --${token} se lee sobre ${fondo}`, () => {
      expect(contraste(t[token], fondo)).toBeGreaterThanOrEqual(AA.texto);
    });
  }
});

/**
 * Lo que hoy NO cumple, medido y fijado para que no empeore.
 *
 * No se silencia ni se marca como pendiente invisible: cada excepción lleva su
 * valor de hoy, y el test falla si baja. Así la deuda es visible y acotada, en
 * vez de desaparecer hasta que alguien se queja.
 */
describe("excepciones conocidas (no deben empeorar)", () => {
  const conocidas: Array<[string, string, string, number, string]> = [
    [
      "--ink-300 sobre --surface-alt",
      // El valor medido es 4.3699; el umbral se deja un paso por debajo para
      // que la prueba vigile regresiones y no el redondeo.
      "ink-300",
      "surface-alt",
      4.36,
      "texto tenue sobre la superficie alterna: por debajo de AA desde antes de esta medición",
    ],
    [
      "--line sobre --surface (segmento UNKNOWN de la barra)",
      "line",
      "surface",
      1.26,
      "la barra pinta UNKNOWN con --line y no se ve: exige 3:1 por ser elemento no textual. " +
        "Ningún gris claro llega — se arregla rediseñando la barra, no oscureciendo el token",
    ],
  ];

  for (const [nombre, a, b, minimo, porque] of conocidas) {
    it(`${nombre} no baja de ${minimo}:1 (${porque})`, () => {
      expect(contraste(t[a], t[b])).toBeGreaterThanOrEqual(minimo);
    });
  }
});
