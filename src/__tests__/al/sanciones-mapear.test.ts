/**
 * Mapeo del historial sancionatorio (SDD módulo 3).
 *
 * Los casos que importan son los de basura de la fuente: sin ellos el producto
 * afirmaría que un hospital se sancionó a sí mismo, o atribuiría multas a un
 * "PRUEBA CONTRATISTA" con documento 123456789.
 */

import { describe, it, expect } from "vitest";
import { mapearSancionSecopI, mapearSancionSecopII } from "@/src/lib/al/sanciones/mapear";
import { nitPlausible } from "@/src/lib/al/historico/mapear";

/** Fila real de 4n4q-k399. */
const SECOP_I = {
  documento_contratista: "830501223",
  nombre_contratista: "INTERCOMERCIAL MEDICA",
  nit_entidad: "901037916",
  nombre_entidad: "ADRES",
  numero_de_resolucion: "RESOLUCION 41549 DE 2019",
  numero_de_contrato: "ADRES-CTO-137-2019",
  valor_sancion: "3797492",
  fecha_de_firmeza: "2019-11-14T00:00:00.000",
  ruta_de_proceso: "https://www.contratos.gov.co/x",
};

describe("mapearSancionSecopI", () => {
  it("mapea una sanción bien formada y la deja cruzable por NIT", () => {
    const r = mapearSancionSecopI(SECOP_I);
    expect(r.nitCanonico).toBe("830501223");
    expect(r.valorSancion).toBe("3797492.00");
    expect(r.fechaFirmeza).toBe("2019-11-14");
    expect(r.fuente).toBe("secop_i_multas");
  });

  it("NO cruza cuando el documento es el NIT de la propia entidad", () => {
    // 14 filas reales: la entidad puso su propio NIT en el campo del contratista
    // y el número de resolución en el del nombre. La sanción existió, pero
    // cruzarla diría que un hospital se sancionó a sí mismo.
    const r = mapearSancionSecopI({
      ...SECOP_I,
      documento_contratista: "892000501",
      nit_entidad: "892000501",
      nombre_contratista: "RESOLUCION NO 0030 DE 2021",
    });
    expect(r).not.toBeNull();
    expect(r.documento).toBe("892000501"); // la fila se conserva
    expect(r.nitCanonico).toBeNull(); // pero no se atribuye a nadie
  });

  it("NO cruza los documentos de prueba de la fuente", () => {
    const r = mapearSancionSecopI({
      ...SECOP_I,
      documento_contratista: "123456789",
      nombre_contratista: "PRUEBA CONTRATISTA",
    });
    expect(r.nitCanonico).toBeNull();
  });

  it("la llave natural distingue registros del mismo contratista", () => {
    const a = mapearSancionSecopI(SECOP_I);
    const b = mapearSancionSecopI({ ...SECOP_I, numero_de_resolucion: "RESOLUCION 999 DE 2020" });
    expect(a.registroKey).not.toBe(b.registroKey);
  });

  it("la llave natural es estable entre recargas", () => {
    expect(mapearSancionSecopI(SECOP_I).registroKey).toBe(mapearSancionSecopI(SECOP_I).registroKey);
  });
});

describe("mapearSancionSecopII", () => {
  /** Fila real de it5q-hg94. */
  const SECOP_II = {
    id_proceso: "CO1.BDOS.5786919",
    id_contrato: "No definido",
    as_codigo_proveedor_objeto: "11291853",
    nombre_proveedor_objeto_de: "DIANA CAROLINA CHAVEZ GARCIA",
    nombre_entidad_creadora: "FONDO DE PRESTACIONES",
    valor: "1080000",
    fecha_evento: "2025-09-08T00:00:00.000",
    numero_de_acto: "RESOLUCIÓN No. SFA - 00192",
    tipo_de_sancion: "Clausula Penal",
    numero_de_version: "3",
  };

  it("conserva el portafolio, que es su única vía de cruce real", () => {
    // El documento se promueve igual —`nitPlausible` no puede distinguir una
    // cédula de 8 dígitos de un NIT, y no debe inventarse esa distinción—, pero
    // no cruza con nadie: medido, 0 de los 251 documentos de esta fuente
    // coinciden con un proveedor. La vía útil es `id_proceso` (CO1.BDOS.*)
    // contra `proceso.portafolio_id`.
    const r = mapearSancionSecopII(SECOP_II);
    expect(r.portafolioId).toBe("CO1.BDOS.5786919");
    expect(r.nitCanonico).toBe("11291853");
    expect(r.tipo).toBe("Clausula Penal");
  });

  it("'No definido' es un centinela, no un número de contrato", () => {
    expect(mapearSancionSecopII(SECOP_II).numeroContrato).toBeNull();
  });

  it("la versión entra en la llave: una corrección no duplica", () => {
    const v3 = mapearSancionSecopII(SECOP_II);
    const v4 = mapearSancionSecopII({ ...SECOP_II, numero_de_version: "4" });
    expect(v3.registroKey).not.toBe(v4.registroKey);
  });
});

describe("nitPlausible", () => {
  it("rechaza secuencias de teclado", () => {
    expect(nitPlausible("123456789")).toBe(false);
    expect(nitPlausible("1234567890")).toBe(false);
    expect(nitPlausible("123456790")).toBe(true); // no es secuencia
  });
});
