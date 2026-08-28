import { describe, it, expect } from "vitest";
import { restantesTexto } from "@/src/lib/diagnostico/resumen";

describe("restantesTexto — resumen de pendientes fuera de los tres listados", () => {
  it("no dice nada cuando no queda nada por listar", () => {
    expect(restantesTexto(0, 0)).toBe("");
    expect(restantesTexto(3, 0)).toBe("");
  });

  it("cuenta solo las mejoras cuando los duros caben en la lista", () => {
    expect(restantesTexto(2, 1)).toBe("1 mejora más por delante");
    expect(restantesTexto(3, 4)).toBe("4 mejoras más por delante");
  });

  it("suma duros ocultos y mejoras cuando hay más de tres duros", () => {
    expect(restantesTexto(5, 2)).toBe("4 pendientes más");
    expect(restantesTexto(4, 0)).toBe("1 pendiente más");
  });
});
