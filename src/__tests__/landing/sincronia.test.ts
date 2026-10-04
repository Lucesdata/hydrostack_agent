import { describe, expect, it } from "vitest";
import {
  aplicarActivo,
  marcasDeActivo,
  procesoDesdeObjetivo,
} from "@/src/components/landing/hero-territorial/sincronia";

describe("procesoDesdeObjetivo", () => {
  it("lee el id del proceso de la señal bajo el puntero o el foco", () => {
    const etiqueta = { getAttribute: (n: string) => (n === "data-proceso" ? "CO1.REQ.1" : null) };
    expect(procesoDesdeObjetivo({ closest: () => etiqueta })).toBe("CO1.REQ.1");
  });

  it("sobre un departamento o el hueco del mapa, ninguno", () => {
    expect(procesoDesdeObjetivo({ closest: () => null })).toBeNull();
    expect(procesoDesdeObjetivo(null)).toBeNull();
  });
});

describe("marcasDeActivo", () => {
  const anclas = [
    { dpto: "76", ids: ["a", "b"] },
    { dpto: "11", ids: ["c"] },
  ];
  const familias = new Map([
    ["a", "potable"],
    ["b", "residual"],
    ["c", "redes"],
  ]);

  it("un anclaje compartido toma la familia del proceso activo, no una sola para todos", () => {
    expect(marcasDeActivo("a", anclas, familias)).toEqual({ dpto: "76", familia: "potable" });
    expect(marcasDeActivo("b", anclas, familias)).toEqual({ dpto: "76", familia: "residual" });
    expect(marcasDeActivo("c", anclas, familias)).toEqual({ dpto: "11", familia: "redes" });
  });

  it("sin activo, o con uno que el mapa no tiene, no marca nada", () => {
    expect(marcasDeActivo(null, anclas, familias)).toEqual({ dpto: null, familia: null });
    expect(marcasDeActivo("z", anclas, familias)).toEqual({ dpto: null, familia: null });
  });
});

/** Un DOM mínimo: lo justo que usa `aplicarActivo`. */
function elemento(attrs: Record<string, string>, tag = "g") {
  const a = { ...attrs };
  const clases = new Set<string>();
  return {
    tag,
    attrs: a,
    clases,
    getAttribute: (n: string) => a[n] ?? null,
    setAttribute: (n: string, v: string) => {
      a[n] = v;
    },
    removeAttribute: (n: string) => {
      delete a[n];
    },
    classList: { toggle: (c: string, on: boolean) => (on ? clases.add(c) : clases.delete(c)) },
  };
}

describe("aplicarActivo", () => {
  const etqA = elemento({ "data-proceso": "a" });
  const etqB = elemento({ "data-proceso": "b" });
  const ancla = elemento({ "data-ancla": "76", "data-procesos": "a b", "data-familia": "mixta" });
  const valle = elemento({ "data-dpto": "76" }, "path");
  const narino = elemento({ "data-dpto": "52" }, "path");
  const raiz = elemento({});
  const dom = Object.assign(raiz, {
    querySelectorAll: (sel: string) =>
      sel === "[data-procesos]"
        ? [ancla]
        : sel === "[data-proceso]"
          ? [etqA, etqB]
          : [valle, narino],
  });
  const familias = new Map([
    ["a", "potable"],
    ["b", "residual"],
  ]);

  it("resalta la señal, el anclaje con su familia y el departamento; atenúa el resto", () => {
    aplicarActivo(dom, "b", familias);
    expect([...etqB.clases]).toEqual(["is-activo"]);
    expect(etqA.clases.size).toBe(0);
    expect(ancla.attrs["data-activa"]).toBe("residual");
    expect([...valle.clases]).toEqual(["is-resaltado"]);
    expect(narino.clases.size).toBe(0);
    expect(raiz.attrs["data-activo"]).toBe("");
  });

  it("al soltar vuelve al estado normal", () => {
    aplicarActivo(dom, null, familias);
    expect(etqB.clases.size).toBe(0);
    expect(ancla.attrs["data-activa"]).toBeUndefined();
    expect(valle.clases.size).toBe(0);
    expect(raiz.attrs["data-activo"]).toBeUndefined();
  });
});
