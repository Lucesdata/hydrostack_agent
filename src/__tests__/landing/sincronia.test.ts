import { describe, expect, it } from "vitest";
import {
  contornoSeleccionado,
  dptoDesdeObjetivo,
  indicesDeModo,
} from "@/src/components/landing/hero-territorial/sincronia";
import { escalonDe, escalonMontoDe } from "@/src/lib/mapa/escala";

/** Un nodo mínimo con la API de DOM que usa la función. */
function nodo({
  dpto = null,
  enlace = false,
  ancestro = null,
  hijo = null,
}: {
  dpto?: string | null;
  enlace?: boolean;
  ancestro?: ReturnType<typeof nodo> | null;
  hijo?: ReturnType<typeof nodo> | null;
}): any {
  const self: any = {
    getAttribute: (n: string) => (n === "data-dpto" ? dpto : null),
    closest: () => (dpto ? self : (ancestro?.closest() ?? null)),
    matches: () => enlace,
    querySelector: () => hijo,
  };
  return self;
}

describe("dptoDesdeObjetivo", () => {
  it("lee el código del departamento bajo el puntero", () => {
    expect(dptoDesdeObjetivo(nodo({ dpto: "05" }))).toBe("05");
  });

  it("con foco de teclado, lo lee del camino dentro del enlace", () => {
    expect(dptoDesdeObjetivo(nodo({ enlace: true, hijo: nodo({ dpto: "76" }) }))).toBe("76");
  });

  it("en el hueco entre departamentos no inventa uno", () => {
    // El <svg>: no es un departamento ni un enlace, aunque contenga caminos.
    expect(dptoDesdeObjetivo(nodo({ hijo: nodo({ dpto: "05" }) }))).toBeNull();
    expect(dptoDesdeObjetivo(null)).toBeNull();
  });
});

describe("indicesDeModo", () => {
  const departamentos = [
    { clave: "05", n: 5000, montoAbierto: 2e12, tipos: { acueducto: 1200, ptar: 40 } },
    { clave: "99", n: 1, montoAbierto: 0, tipos: { acueducto: 0, ptar: 1 } },
  ];
  const base = { departamentos, escalonDe, escalonMontoDe };

  it("en «procesos» no repinta: manda el servidor", () => {
    expect(indicesDeModo({ ...base, modo: "procesos", tipo: null })).toBeNull();
  });

  it("en «monto» usa la escala del monto; sin presupuesto va a 0", () => {
    const m = indicesDeModo({ ...base, modo: "monto", tipo: null })!;
    expect(m.get("05")).toBe(4);
    expect(m.get("99")).toBe(0);
  });

  it("en «tipo» cuenta solo ese tipo, con la escala de procesos", () => {
    const m = indicesDeModo({ ...base, modo: "tipo", tipo: "ptar" })!;
    expect(m.get("05")).toBe(escalonDe(40).indice);
    expect(m.get("99")).toBe(escalonDe(1).indice);
    expect(indicesDeModo({ ...base, modo: "tipo", tipo: "acueducto" })!.get("99")).toBe(0);
  });
});

describe("contornoSeleccionado", () => {
  /** Una raíz mínima: los caminos por código, cada uno con su `d` y si va en el recuadro. */
  function raiz(caminos: Record<string, { d: string; recuadro?: boolean }>): any {
    return {
      querySelector: (sel: string) => {
        const codigo = sel.match(/data-dpto="(\d+)"/)?.[1];
        const c = codigo ? caminos[codigo] : undefined;
        if (!c) return null;
        return {
          getAttribute: (n: string) => (n === "d" ? c.d : null),
          closest: (s: string) => (s === "g[transform]" && c.recuadro ? {} : null),
        };
      },
    };
  }

  it("copia el contorno del departamento elegido", () => {
    expect(contornoSeleccionado(raiz({ "05": { d: "M1 1Z" } }), "05")).toBe("M1 1Z");
  });

  it("sin elección, o con un código que no está en el mapa, no pinta nada", () => {
    expect(contornoSeleccionado(raiz({ "05": { d: "M1 1Z" } }), null)).toBeNull();
    expect(contornoSeleccionado(raiz({ "05": { d: "M1 1Z" } }), "99")).toBeNull();
  });

  it("San Andrés no: va en su recuadro, con otra transformación", () => {
    expect(contornoSeleccionado(raiz({ "88": { d: "M2 2Z", recuadro: true } }), "88")).toBeNull();
  });
});
