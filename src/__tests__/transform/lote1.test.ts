import { describe, expect, it } from "vitest";
import { mapLote1Contrato, mapLote1Proceso } from "@/src/lib/transform/lote1";

describe("mapLote1Proceso", () => {
  it("duración y unidad en el vocabulario de la base", () => {
    for (const [unidad, esperada] of [
      ["día(s)", "dias"],
      ["Dia(s)", "dias"],
      ["Semana(s)", "semanas"],
      ["Mes(es)", "meses"],
      ["Año(s)", "anos"],
    ] as const) {
      expect(mapLote1Proceso({ duracion: "12", unidad_de_duracion: unidad })).toEqual({
        duracionValor: 12,
        duracionUnidad: esperada,
      });
    }
  });

  it("sin dato: cero, vacío, centinela, no entero o unidad desconocida dejan las dos en null", () => {
    const vacio = { duracionValor: null, duracionUnidad: null };
    for (const duracion of ["0", "", "No Definido", "abc", "-3", "1.5", null, undefined]) {
      expect(mapLote1Proceso({ duracion, unidad_de_duracion: "Mes(es)" })).toEqual(vacio);
    }
    expect(mapLote1Proceso({ duracion: "12", unidad_de_duracion: "Lustro(s)" })).toEqual(vacio);
    expect(mapLote1Proceso({ duracion: "12" })).toEqual(vacio);
    expect(mapLote1Proceso({})).toEqual(vacio);
  });

  it("acepta un número JSON además de texto", () => {
    expect(mapLote1Proceso({ duracion: 6, unidad_de_duracion: "Mes(es)" }).duracionValor).toBe(6);
  });
});

describe("mapLote1Contrato", () => {
  const base = {
    origen_de_los_recursos: "Recursos Propios",
    destino_gasto: "Inversión",
    sistema_general_de_participaciones: "427947323",
    recursos_propios: "0",
    presupuesto_general_de_la_nacion_pgn: "0",
    recursos_de_credito: "0",
    sistema_general_de_regal_as: "0",
    dias_adicionados: "60",
    liquidaci_n: "Si",
  };

  it("mapea el caso completo", () => {
    expect(mapLote1Contrato(base)).toEqual({
      origenRecursos: "Recursos Propios",
      destinoGasto: "Inversión",
      fuentesRecursos: { sgp: 427947323 },
      diasAdicionados: 60,
      liquidado: true,
    });
  });

  it("fuentes: solo las mayores que cero; ninguna → null", () => {
    expect(
      mapLote1Contrato({
        ...base,
        sistema_general_de_participaciones: "100.00",
        recursos_propios: "50",
        presupuesto_general_de_la_nacion_pgn: "7",
        recursos_de_credito: "1",
        sistema_general_de_regal_as: "3",
      }).fuentesRecursos
    ).toEqual({ sgp: 100, propios: 50, pgn: 7, credito: 1, regalias: 3 });
    expect(
      mapLote1Contrato({ ...base, sistema_general_de_participaciones: "0" }).fuentesRecursos
    ).toBeNull();
    expect(mapLote1Contrato({}).fuentesRecursos).toBeNull();
    expect(mapLote1Contrato({ ...base, recursos_propios: "-5" }).fuentesRecursos).toEqual({
      sgp: 427947323,
    });
  });

  it("textos: el centinela «No Definido» es null; el resto es literal", () => {
    const c = mapLote1Contrato({
      ...base,
      origen_de_los_recursos: "Distribuido",
      destino_gasto: "No Definido",
    });
    expect(c.origenRecursos).toBe("Distribuido");
    expect(c.destinoGasto).toBeNull();
  });

  it("días adicionados: cero, vacío o basura son null", () => {
    for (const v of ["0", "", "No Definido", "x", "-2", "2.5", null, undefined]) {
      expect(mapLote1Contrato({ ...base, dias_adicionados: v }).diasAdicionados).toBeNull();
    }
  });

  it("liquidación: Sí/No/ambiguo", () => {
    expect(mapLote1Contrato({ ...base, liquidaci_n: "Sí" }).liquidado).toBe(true);
    expect(mapLote1Contrato({ ...base, liquidaci_n: "No" }).liquidado).toBe(false);
    expect(mapLote1Contrato({ ...base, liquidaci_n: "No Definido" }).liquidado).toBeNull();
    expect(mapLote1Contrato({ ...base, liquidaci_n: "quizá" }).liquidado).toBeNull();
    expect(mapLote1Contrato({}).liquidado).toBeNull();
  });
});
