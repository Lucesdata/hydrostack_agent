import { describe, it, expect } from "vitest";
import {
  normalizarModalidad,
  alcanzaEscalon,
  avisoEscalon,
} from "@/src/lib/diagnostico/modalidad";

/**
 * Los 15 valores distintos de `proceso.modalidad` en la base, tal cual
 * (SELECT DISTINCT del 2026-08-28). Si SECOP introduce uno nuevo, este test no
 * se entera — pero fija que los que existen hoy no se clasifican mal.
 */
const REALES: Array<[string | null, ReturnType<typeof normalizarModalidad>]> = [
  ["Contratación régimen especial", null],
  ["Contratación directa", null],
  ["Mínima cuantía", "minima_cuantia"],
  ["Selección Abreviada de Menor Cuantía", "menor_cuantia"],
  ["Solicitud de información a los Proveedores", null],
  ["Concurso de méritos abierto", null],
  ["Contratación Directa (con ofertas)", null],
  ["Contratación régimen especial (con ofertas)", null],
  ["Licitación pública Obra Publica", "licitacion_publica"],
  ["Selección abreviada subasta inversa", "menor_cuantia"],
  ["Licitación pública", "licitacion_publica"],
  ["Seleccion Abreviada Menor Cuantia Sin Manifestacion Interes", "menor_cuantia"],
  ["Subasta de prueba", null],
  [null, null],
  ["Licitación Pública Acuerdo Marco de Precios", "licitacion_publica"],
];

describe("normalizarModalidad — contra los valores reales de la base", () => {
  it.each(REALES)("%s → %s", (modalidad, esperado) => {
    expect(normalizarModalidad(modalidad)).toBe(esperado);
  });

  it("ignora acentos, mayúsculas y espacios repetidos", () => {
    expect(normalizarModalidad("  MINIMA   CUANTIA ")).toBe("minima_cuantia");
    expect(normalizarModalidad("mínima cuantía")).toBe("minima_cuantia");
  });

  it("calla ante lo desconocido en vez de forzar un escalón", () => {
    expect(normalizarModalidad("")).toBeNull();
    expect(normalizarModalidad(undefined)).toBeNull();
    expect(normalizarModalidad("Modalidad que SECOP invente mañana")).toBeNull();
  });
});

describe("alcanzaEscalon", () => {
  it("alcanzar un escalón implica los de abajo", () => {
    expect(alcanzaEscalon("licitacion_publica", "minima_cuantia")).toBe(true);
    expect(alcanzaEscalon("licitacion_publica", "menor_cuantia")).toBe(true);
    expect(alcanzaEscalon("menor_cuantia", "minima_cuantia")).toBe(true);
    expect(alcanzaEscalon("minima_cuantia", "minima_cuantia")).toBe(true);
  });

  it("no alcanza los de arriba", () => {
    expect(alcanzaEscalon("minima_cuantia", "menor_cuantia")).toBe(false);
    expect(alcanzaEscalon("minima_cuantia", "licitacion_publica")).toBe(false);
    expect(alcanzaEscalon("menor_cuantia", "licitacion_publica")).toBe(false);
  });
});

describe("avisoEscalon", () => {
  it("avisa solo cuando el proceso exige más", () => {
    expect(avisoEscalon("minima_cuantia", "Licitación pública")).toBe("Licitación pública");
    expect(avisoEscalon("minima_cuantia", "Selección Abreviada de Menor Cuantía")).toBe(
      "Pide RUP e indicadores"
    );
  });

  it("calla cuando el proceso está al alcance", () => {
    expect(avisoEscalon("licitacion_publica", "Licitación pública")).toBeNull();
    expect(avisoEscalon("menor_cuantia", "Mínima cuantía")).toBeNull();
    expect(avisoEscalon("minima_cuantia", "Mínima cuantía")).toBeNull();
  });

  it("calla ante modalidades que no están en la escalera", () => {
    // Régimen especial (Ley 142) y directa no son peldaños del diagnóstico:
    // avisar ahí sería inventarse un veredicto.
    for (const m of [
      "Contratación régimen especial",
      "Contratación directa",
      "Concurso de méritos abierto",
      "Solicitud de información a los Proveedores",
      null,
    ]) {
      expect(avisoEscalon("minima_cuantia", m)).toBeNull();
    }
  });
});
