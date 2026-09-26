import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { contraste, leerTokensHex } from "@/src/lib/design/contraste";
import { COLOR_TIPO, FAMILIAS, colorDeTipo } from "@/src/lib/classify/tipo-color";
import { TIPOS_PROYECTO } from "@/src/lib/classify/tipo-proyecto";

/**
 * El color del tipo de proyecto no es texto, es un componente gráfico (punto,
 * borde, barra): WCAG 1.4.11 pide 3:1 contra lo que tiene al lado. Se mide
 * contra los fondos reales donde se pinta.
 */

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
const t = leerTokensHex(css);
/** El panel oscuro del hero (`--aq-bg` en hero-territorial.module.css). */
const FONDO_HERO = "#061423";

describe("color por tipo de proyecto", () => {
  it("cada uno de los cinco tipos tiene color y familia", () => {
    for (const tipo of TIPOS_PROYECTO) {
      expect(COLOR_TIPO[tipo], tipo).toBeDefined();
      expect(COLOR_TIPO[tipo].familiaLabel.length).toBeGreaterThan(0);
    }
  });

  it("sigue la decisión: azul potable, marrón residual, gris redes", () => {
    expect(COLOR_TIPO.acueducto.familia).toBe("potable");
    expect(COLOR_TIPO.ptap.familia).toBe("potable");
    expect(COLOR_TIPO.ptar.familia).toBe("residual");
    expect(COLOR_TIPO.alcantarillado.familia).toBe("redes");
    expect(COLOR_TIPO.otros.familia).toBe("otros");
  });

  it("las familias de la leyenda no se repiten", () => {
    expect(new Set(FAMILIAS.map((f) => f.familia)).size).toBe(FAMILIAS.length);
  });

  it("no inventa color para lo que no es un tipo", () => {
    expect(colorDeTipo(null)).toBeNull();
    expect(colorDeTipo("inventado")).toBeNull();
  });

  it.each(FAMILIAS)("$label llega a 3:1 sobre los fondos claros y el oscuro", (f) => {
    for (const fondo of [t["bg"], t["surface"]]) {
      expect(contraste(f.claro, fondo)).toBeGreaterThanOrEqual(3);
    }
    expect(contraste(f.oscuro, FONDO_HERO)).toBeGreaterThanOrEqual(3);
  });
});
