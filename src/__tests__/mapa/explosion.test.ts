import { describe, expect, it } from "vitest";
import { CENTRO_DESPIECE, despieceDe, estiloDespiece } from "@/src/lib/mapa/explosion";
import { CODIGOS_CON_ANCLA, anclaDe } from "@/src/lib/mapa/etiquetas-procesos";
import { posicionEnCaja } from "@/src/components/landing/hero-territorial/escena";

/**
 * El despiece del mapa del hero (2026-11-11): es presentación, pero decide
 * hacia dónde se mueve cada departamento, así que se comprueba que no mezcle
 * piezas ni dependa del azar.
 */
describe("despiece del mapa", () => {
  it("cada departamento anclable tiene su vector y un turno único", () => {
    const turnos = CODIGOS_CON_ANCLA.map((d) => despieceDe(d)?.orden);
    expect(turnos.every((t) => typeof t === "number")).toBe(true);
    expect(new Set(turnos).size).toBe(CODIGOS_CON_ANCLA.length);
    expect(Math.min(...(turnos as number[]))).toBe(0);
  });

  it("la pieza se aleja del centro en la dirección de su anclaje", () => {
    for (const dpto of CODIGOS_CON_ANCLA) {
      const [x, y] = anclaDe(dpto)!;
      const d = despieceDe(dpto)!;
      expect(d.x).toBeCloseTo(x - CENTRO_DESPIECE[0], 1);
      expect(d.y).toBeCloseTo(y - CENTRO_DESPIECE[1], 1);
    }
    // La Guajira (44) sale al noreste; Nariño (52), al suroeste.
    expect(despieceDe("44")!.x).toBeGreaterThan(0);
    expect(despieceDe("44")!.y).toBeLessThan(0);
    expect(despieceDe("52")!.x).toBeLessThan(0);
    expect(despieceDe("52")!.y).toBeGreaterThan(0);
  });

  it("se arma del centro hacia fuera y es determinístico", () => {
    const dist = (d: string) => Math.hypot(despieceDe(d)!.x, despieceDe(d)!.y);
    const porTurno = [...CODIGOS_CON_ANCLA].sort(
      (a, b) => despieceDe(a)!.orden - despieceDe(b)!.orden
    );
    for (let i = 1; i < porTurno.length; i++) {
      expect(dist(porTurno[i])).toBeGreaterThanOrEqual(dist(porTurno[i - 1]) - 0.1);
    }
    expect(despieceDe("05")).toEqual(despieceDe("05"));
  });

  it("las variables CSS llevan unidades; un código desconocido no mueve nada", () => {
    expect(estiloDespiece("05")).toMatchObject({
      "--ex": expect.stringMatching(/^-?[\d.]+px$/),
      "--ey": expect.stringMatching(/^-?[\d.]+px$/),
      "--i": expect.stringMatching(/^\d+$/),
    });
    expect(despieceDe("00")).toBeNull();
    expect(estiloDespiece("00")).toBeUndefined();
  });

  it("la baliza cae en el mismo punto del viewBox que su anclaje", () => {
    // viewBox -8 0 436 520: el origen del mapa queda a 8 unidades del borde.
    expect(posicionEnCaja(-8, 0)).toMatchObject({ x: 0, y: 0 });
    expect(posicionEnCaja(210, 260).x).toBeCloseTo(50, 5);
    expect(posicionEnCaja(210, 260).y).toBeCloseTo(50, 5);
    expect(posicionEnCaja(0, 0, 43.6, 52)).toMatchObject({ ex: 10, ey: 10 });
  });
});
