import { describe, it, expect } from "vitest";
import { ESTADOS_ABIERTO, filaDepartamentoDesdeSql, slugificar } from "@/src/lib/secop/agregados";

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

describe("filaDepartamentoDesdeSql", () => {
  const cruda = {
    clave: "05",
    label: "Antioquia",
    n: 5155,
    nuevos7d: 212,
    monto: "812345678901.50",
    nConMonto: 5020,
    nEntidades: 318,
    t_acueducto: 1800,
    t_alcantarillado: 900,
    t_ptap: 300,
    t_ptar: 400,
    t_otros: 1700,
  };

  it("convierte el numeric de pg (texto) en número y deriva el slug", () => {
    const f = filaDepartamentoDesdeSql(cruda)!;
    expect(f.montoAbierto).toBeCloseTo(812345678901.5);
    expect(f.slug).toBe("antioquia");
    expect(f.nuevos7d).toBe(212);
    expect(f.nConMonto).toBe(5020);
    expect(f.nEntidades).toBe(318);
  });

  it("devuelve los cinco tipos, y cero en los que faltan", () => {
    const { t_ptar, ...sinPtar } = cruda;
    void t_ptar;
    const f = filaDepartamentoDesdeSql(sinPtar)!;
    expect(Object.keys(f.tipos)).toEqual(["acueducto", "alcantarillado", "ptap", "ptar", "otros"]);
    expect(f.tipos.ptar).toBe(0);
    expect(f.tipos.acueducto).toBe(1800);
  });

  it("sin monto publicado no inventa uno", () => {
    expect(filaDepartamentoDesdeSql({ ...cruda, monto: null })!.montoAbierto).toBe(0);
    expect(filaDepartamentoDesdeSql({ ...cruda, monto: "abc" })!.montoAbierto).toBe(0);
  });

  it("descarta filas sin geografía resuelta", () => {
    expect(filaDepartamentoDesdeSql({ ...cruda, clave: null })).toBeNull();
    expect(filaDepartamentoDesdeSql({ ...cruda, label: null })).toBeNull();
  });
});
