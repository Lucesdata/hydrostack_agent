/**
 * Mapeo del histórico de oferentes (SDD §4.7).
 *
 * El caso que justifica el archivo entero es el primero: un proceso
 * `estado_del_procedimiento='Seleccionado'` con `adjudicado='No'` NO produce
 * fila. 23.195 de los 36.724 "Seleccionado" de la base están en ese caso — usar
 * el estado como criterio cargaría un 63% de filas sin ganador.
 */

import { describe, it, expect } from "vitest";
import {
  mapearAdjudicatario,
  mapearProponente,
  proveedorKey,
  normalizarNombre,
  nitPlausible,
} from "@/src/lib/al/historico/mapear";

const CTX = {
  procesoId: "11111111-1111-1111-1111-111111111111",
  entidadId: "22222222-2222-2222-2222-222222222222",
  entidadNit: "811000231",
  geografiaId: "05001",
  modalidad: "Licitación pública",
  valorEstimado: null,
  fechaPublicacion: "2018-04-09",
};

/** Payload real, recortado (CO1.REQ.406327). */
const ADJUDICADO = {
  id_del_proceso: "CO1.REQ.406327",
  adjudicado: "Si",
  nombre_del_proveedor: "CONINTEGRAL S.A.S",
  nit_del_proveedor_adjudicado: "900179755",
  nombre_del_adjudicador: "LUZ JANNET ZULUAGA QUINTERO",
  valor_total_adjudicacion: "1168754073",
  fecha_adjudicacion: "2018-05-18T00:00:00.000",
  codigo_principal_de_categoria: "V1.77121701",
  precio_base: "0",
  nit_entidad: "811000231",
};

describe("mapearAdjudicatario", () => {
  it("'Seleccionado' con adjudicado='No' NO produce fila", () => {
    const r = mapearAdjudicatario(
      {
        id_del_proceso: "CO1.REQ.10951305",
        estado_del_procedimiento: "Seleccionado",
        adjudicado: "No",
        nombre_del_proveedor: "No Definido",
        nombre_del_adjudicador: "No Adjudicado",
      },
      CTX,
      null
    );
    expect(r).toBeNull();
  });

  it("mapea el ganador desde nombre_del_proveedor, no desde nombre_del_adjudicador", () => {
    const r = mapearAdjudicatario(ADJUDICADO, CTX, null);
    // `nombre_del_adjudicador` es la funcionaria de la entidad que firma; si
    // alguna vez vuelve a colarse aquí, este test lo caza.
    expect(r.proveedorNombre).toBe("CONINTEGRAL S.A.S");
    expect(r.proveedorNombre).not.toBe("LUZ JANNET ZULUAGA QUINTERO");
    expect(r.adjudicado).toBe(true);
  });

  it("quita el prefijo de versión del UNSPSC", () => {
    expect(mapearAdjudicatario(ADJUDICADO, CTX, null).unspsc).toBe("77121701");
  });

  it("un precio_base de 0 es 'sin dato', no un precio", () => {
    expect(mapearAdjudicatario(ADJUDICADO, CTX, null).valorEstimado).toBeNull();
    expect(mapearAdjudicatario(ADJUDICADO, CTX, null).valorAdjudicado).toBe("1168754073.00");
  });

  it("recorta la fecha a día", () => {
    expect(mapearAdjudicatario(ADJUDICADO, CTX, null).fechaAdjudicacion).toBe("2018-05-18");
  });

  it("sin ganador atribuible no hay fila, aunque adjudicado sea 'Si'", () => {
    expect(
      mapearAdjudicatario({ ...ADJUDICADO, nombre_del_proveedor: "No Definido" }, CTX, null)
    ).toBeNull();
  });
});

describe("proveedorKey", () => {
  it("usa el NIT cuando existe", () => {
    expect(proveedorKey("900179755", "CONINTEGRAL S.A.S")).toBe("nit:900179755");
  });

  it("cae al nombre normalizado cuando no hay NIT", () => {
    // Sin esto la mitad de los adjudicados quedaría con clave NULL, y en Postgres
    // los NULL de un índice único no colisionan: el backfill duplicaría en cada
    // corrida.
    expect(proveedorKey(null, "Coníntegral  S.A.S.")).toBe("nom:CONINTEGRAL S A S");
  });

  it("rechaza documentos basura y cae al nombre", () => {
    // "0" agrupaba 22 razones sociales distintas en la carga real.
    expect(proveedorKey("0", "CONSORCIO A")).toBe("nom:CONSORCIO A");
    expect(proveedorKey("0000", "CONSORCIO B")).toBe("nom:CONSORCIO B");
    expect(proveedorKey("1", "CONSORCIO INTERUNION")).toBe("nom:CONSORCIO INTERUNION");
    // Dos consorcios distintos con el mismo NIT basura ya no se fusionan.
    expect(proveedorKey("0", "CONSORCIO A")).not.toBe(proveedorKey("0", "CONSORCIO B"));
  });

  it("rechaza los NITs comodín de dígito repetido", () => {
    expect(nitPlausible("1111111111")).toBe(false);
    expect(nitPlausible("999999999")).toBe(false);
    expect(proveedorKey("1111111111", "CONSORCIO X")).toBe("nom:CONSORCIO X");
  });

  it("acepta los NITs de longitud real (8-10 dígitos)", () => {
    expect(proveedorKey("900179755", "x")).toBe("nit:900179755");
    expect(proveedorKey("81100023", "x")).toBe("nit:81100023");
  });

  it("un nombre que sean dígitos no colisiona con un NIT", () => {
    expect(proveedorKey(null, "900179755")).not.toBe(proveedorKey("900179755", "x"));
  });

  it("normaliza tildes, puntuación y espacios", () => {
    expect(normalizarNombre("  Unión   Temporal  Agua-Limpia, S.A.  ")).toBe(
      "UNION TEMPORAL AGUA LIMPIA S A"
    );
  });
});

describe("mapearProponente", () => {
  const ROW = {
    id_procedimiento: "CO1.REQ.8592187",
    nit_proveedor: "830501223",
    proveedor: "INTERCOMERCIAL MEDICA",
    nit_entidad: "901541245",
  };

  it("nunca marca adjudicado ni inventa precio", () => {
    const r = mapearProponente(ROW, CTX);
    expect(r.adjudicado).toBe(false);
    // La fuente no publica el valor ofertado por quien pierde (no-objetivo §1.3).
    expect(r.valorAdjudicado).toBeNull();
    expect(r.fuente).toBe("proponentes");
  });

  it("comparte la llave con la fila del proceso si es el mismo proveedor", () => {
    // Es lo que hace que el ganador no se duplique como proponente.
    const prop = mapearProponente({ ...ROW, nit_proveedor: "900179755" }, CTX);
    const adj = mapearAdjudicatario(ADJUDICADO, CTX, null);
    expect(prop.proveedorKey).toBe(adj.proveedorKey);
  });
});
