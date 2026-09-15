import { describe, it, expect } from "vitest";
import { ESTADOS_ABIERTO, slugificar } from "@/src/lib/secop/agregados";

describe("slugificar", () => {
  it("quita acentos y deja segmentos de URL estables", () => {
    expect(slugificar("Valle del Cauca")).toBe("valle-del-cauca");
    expect(slugificar("Nariño")).toBe("narino");
    expect(slugificar("Bogotá D.C.")).toBe("bogota-d-c");
    expect(slugificar("Archipiélago de San Andrés, Providencia y Santa Catalina")).toBe(
      "archipielago-de-san-andres-providencia-y-santa-catalina"
    );
  });

  it("no deja guiones colgando en los extremos", () => {
    expect(slugificar("  Chocó  ")).toBe("choco");
    expect(slugificar("¡Meta!")).toBe("meta");
  });
});

describe("la definición de «abierto»", () => {
  it("no es solo estado_apertura: exige también el estado del trámite", () => {
    // `estado_apertura='Abierto'` a secas son 68.563 procesos e incluye los ya
    // seleccionados y cancelados. Cruzado con estos estados quedan 35.222.
    expect([...ESTADOS_ABIERTO]).toEqual(["Publicado", "Abierto"]);
  });
});
