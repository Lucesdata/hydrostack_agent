import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CanalCompuertas, { aguaDelCanal } from "@/src/components/secop/ficha/CanalCompuertas";
import {
  CLAVES_COMPUERTA,
  PALABRA_ESTADO,
  type CompuertaVista,
  type EstadoCompuerta,
} from "@/src/lib/secop/semaforo";

function vistas(estados: EstadoCompuerta[]): CompuertaVista[] {
  return CLAVES_COMPUERTA.map((clave, i) => ({
    clave,
    etiqueta: clave,
    estado: estados[i],
    explicacion: null,
    valorCorto: `valor-${clave}`,
    redactada: false,
  }));
}

describe("aguaDelCanal", () => {
  it("sin perfil no corre agua: no hay veredicto que dibujar", () => {
    expect(aguaDelCanal(vistas(["DATO", "DATO", "DATO", "DATO", "UNKNOWN"]), false)).toEqual([
      "seco",
      "seco",
      "seco",
      "seco",
      "seco",
    ]);
  });

  it("se corta en la primera compuerta que no cumple", () => {
    expect(aguaDelCanal(vistas(["PASS", "WARN", "FAIL", "PASS", "PASS"]), true)).toEqual([
      "fluye",
      "fluye",
      "tope",
      "seco",
      "seco",
    ]);
  });

  it("detrás de una sin datos corre tenue", () => {
    expect(aguaDelCanal(vistas(["PASS", "PASS", "PASS", "PASS", "UNKNOWN"]), true)[4]).toBe(
      "tenue"
    );
  });
});

describe("CanalCompuertas", () => {
  it("cada estado lleva su palabra escrita: el color nunca va solo (criterio 3)", () => {
    const estados: EstadoCompuerta[] = ["PASS", "WARN", "FAIL", "UNKNOWN", "PASS"];
    const html = renderToStaticMarkup(<CanalCompuertas compuertas={vistas(estados)} relativo />);
    for (const e of ["PASS", "WARN", "FAIL", "UNKNOWN"] as EstadoCompuerta[]) {
      expect(html).toContain(PALABRA_ESTADO[e]);
    }
  });

  it("cada estado tiene una forma distinta de hoja (se distingue sin color)", () => {
    const html = renderToStaticMarkup(
      <CanalCompuertas compuertas={vistas(["PASS", "WARN", "FAIL", "UNKNOWN", "DATO"])} relativo />
    );
    const hojas = [
      ...html.matchAll(/class="fd-hoja fd-hoja--(\w+)"[^>]*y="(\d+)"[^>]*height="(\d+)"/g),
    ];
    const forma = Object.fromEntries(hojas.map((m) => [m[1], `${m[2]}/${m[3]}`]));
    expect(forma.pass).not.toBe(forma.warn);
    expect(forma.fail).not.toBe(forma.warn);
    expect(forma.fail).not.toBe(forma.pass);
    // Sin datos comparte la posición de revisar, pero va punteada (CSS de la clase).
    expect(forma.unknown).toBe(forma.warn);
  });

  it("en la lectura del proceso muestra el valor, no una palabra de estado", () => {
    const html = renderToStaticMarkup(
      <CanalCompuertas
        compuertas={vistas(["DATO", "DATO", "DATO", "DATO", "UNKNOWN"])}
        relativo={false}
      />
    );
    expect(html).toContain("valor-sectorial");
    expect(html).not.toContain(PALABRA_ESTADO.DATO);
  });

  it("el dibujo es decorativo para el lector de pantalla", () => {
    const html = renderToStaticMarkup(
      <CanalCompuertas compuertas={vistas(["PASS", "PASS", "PASS", "PASS", "PASS"])} relativo />
    );
    expect(html.match(/<svg[^>]*aria-hidden="true"/g)?.length).toBe(5);
  });
});
