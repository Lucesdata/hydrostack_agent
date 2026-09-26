import { describe, expect, it } from "vitest";
import { dptoDesdeObjetivo } from "@/src/components/landing/hero-territorial/sincronia";

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
