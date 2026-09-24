import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AA, componer, contraste, leerTokensHex, parseHex } from "@/src/lib/design/contraste";

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

describe("pastillas de etapa del FichaCard (revisión final 2026-09-21, arreglo 2)", () => {
  /**
   * `.fc-etapa--*` pinta a `600 10px` sobre `--card`: texto normal, exige
   * 4,5:1. Medido al tinte original del 12%: --success daba 4,27:1 y --warning
   * 4,25:1 — ambos por debajo de AA (--danger 5,29:1 y --accent-deep 7,94:1 sí
   * pasaban). El 8% que se probó como corrección tampoco basta: --warning sobre
   * su tinte redondeado a 8 bits da 4,498:1, todavía por debajo del listón. Al
   * 7% las cuatro pasan con margen (mínimo 4,567:1).
   *
   * El rgb de cada tinte sale del propio token (`parseHex(t[...])`), no de un
   * literal congelado: en producción el fondo de la pastilla es
   * `color-mix(in srgb, var(--token) 7%, transparent)` sobre `--card`, así que
   * si el token cambia de valor, este test debe recalcular sobre el valor
   * nuevo — igual que se movería el fondo real.
   */
  const PASTILLAS_ETAPA: Array<[string, string, [number, number, number], number]> = [
    ["etapa ABIERTO", "success", parseHex(t["success"]), 0.07],
    ["etapa EN EVALUACIÓN / SUSPENDIDO", "warning", parseHex(t["warning"]), 0.07],
    ["etapa CANCELADO", "danger", parseHex(t["danger"]), 0.07],
    // El fondo de «adjudicado» mezcla --accent, no --accent-deep: así lo
    // escribe `ficha-card/estilos.ts`. El texto sí pinta con --accent-deep, que
    // es un alias de --accent-ocean (el único de los dos con valor hex propio).
    ["etapa ADJUDICADO", "accent-ocean", parseHex(t["accent"]), 0.07],
  ];

  for (const [nombre, token, rgb, alfa] of PASTILLAS_ETAPA) {
    it(`${nombre}: se lee sobre su propio tinte al ${Math.round(alfa * 100)}%`, () => {
      const fondo = componer(rgb, alfa, t["surface"]);
      const ratio = contraste(t[token], fondo);
      expect(
        ratio,
        `--${token} (${t[token]}) sobre ${fondo} da ${ratio.toFixed(3)}:1`
      ).toBeGreaterThanOrEqual(AA.texto);
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

/** Resuelve los tokens del Hero desde el CSS real, incluidos sus alias. */
function tokensAtlas(oscuro: boolean) {
  const leer = (bloque: string) =>
    Object.fromEntries(
      [...bloque.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()])
    );
  const root = css.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  const claro = css.match(/\.atlas-hero\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const noche = css.match(/\.atlas-hero\[data-theme="dark"\]\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const valores = { ...leer(root), ...leer(claro), ...(oscuro ? leer(noche) : {}) };
  const resolver = (nombre: string, vistos = new Set<string>()): string => {
    if (vistos.has(nombre)) throw new Error(`Alias circular: ${nombre}`);
    const valor = valores[nombre];
    if (!valor) throw new Error(`Falta el token ${nombre}`);
    const alias = valor.match(/^var\(--([a-z0-9-]+)\)$/);
    return alias ? resolver(alias[1], new Set([...vistos, nombre])) : valor;
  };
  return resolver;
}

for (const oscuro of [false, true]) {
  describe(`Hero territorial: tema ${oscuro ? "oscuro" : "claro"}`, () => {
    for (const fondo of ["atlas-bg", "atlas-panel", "atlas-hover"]) {
      for (const texto of ["atlas-text", "atlas-muted", "atlas-cyan"]) {
        it(`${texto} sobre ${fondo} cumple AA`, () => {
          const token = tokensAtlas(oscuro);
          expect(contraste(token(texto), token(fondo))).toBeGreaterThanOrEqual(AA.texto);
        });
      }
      it(`foco y borde del buscador se distinguen sobre ${fondo}`, () => {
        const token = tokensAtlas(oscuro);
        expect(contraste(token("atlas-control-border"), token(fondo))).toBeGreaterThanOrEqual(
          AA.noTextual
        );
      });
    }
    it("el texto del CTA se lee en reposo y hover", () => {
      const token = tokensAtlas(oscuro);
      for (const fondo of ["atlas-cyan", "atlas-cta-hover"]) {
        expect(contraste(token("atlas-on-accent"), token(fondo))).toBeGreaterThanOrEqual(AA.texto);
      }
    });
    it("rótulos opacos: texto AA y borde visible", () => {
      const token = tokensAtlas(oscuro);
      expect(contraste(token("atlas-label-text"), token("atlas-label-bg"))).toBeGreaterThanOrEqual(
        AA.texto
      );
      expect(
        contraste(token("atlas-label-border"), token("atlas-label-bg"))
      ).toBeGreaterThanOrEqual(AA.noTextual);
    });
    it("los contornos y la selección distinguen los departamentos", () => {
      const token = tokensAtlas(oscuro);
      for (let i = 0; i <= 4; i++) {
        expect(
          contraste(token(`atlas-map-e${i}`), token(`atlas-map-stroke-${i < 2 ? "low" : "high"}`))
        ).toBeGreaterThanOrEqual(AA.noTextual);
      }
      expect(
        contraste(token("atlas-selected"), token("atlas-selected-stroke"))
      ).toBeGreaterThanOrEqual(AA.noTextual);
    });
  });
}
