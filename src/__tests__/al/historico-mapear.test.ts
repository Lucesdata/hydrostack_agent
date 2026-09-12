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

/**
 * Fila canónica de `proceso`, recortada (CO1.REQ.406327). Hasta 2026-09-12
 * esto era un payload crudo de `raw_record`; `adjudicado` era el string "Si"
 * y ahora es el booleano real que ya vive en la columna.
 */
const ADJUDICADO = {
  secopProcesoId: "CO1.REQ.406327",
  adjudicado: true,
  adjudicatario: "CONINTEGRAL S.A.S",
  nitAdjudicatario: "900179755",
  valorAdjudicacion: "1168754073.00",
  fechaAdjudicacion: "2018-05-18",
  unspsc: "V1.77121701",
  valorEstimado: "0.00",
  modalidad: "Licitación pública",
};

describe("mapearAdjudicatario", () => {
  it("'Seleccionado' con adjudicado=false NO produce fila", () => {
    const r = mapearAdjudicatario(
      {
        secopProcesoId: "CO1.REQ.10951305",
        adjudicado: false,
        adjudicatario: "No Definido",
        nitAdjudicatario: null,
        unspsc: null,
        modalidad: null,
        valorEstimado: null,
        valorAdjudicacion: null,
        fechaAdjudicacion: null,
      },
      CTX,
      null
    );
    expect(r).toBeNull();
  });

  it("mapea el ganador desde el adjudicatario canónico", () => {
    const r = mapearAdjudicatario(ADJUDICADO, CTX, null);
    expect(r.proveedorNombre).toBe("CONINTEGRAL S.A.S");
    expect(r.adjudicado).toBe(true);
  });

  it("quita el prefijo de versión del UNSPSC", () => {
    expect(mapearAdjudicatario(ADJUDICADO, CTX, null).unspsc).toBe("77121701");
  });

  it("un valor_estimado de 0 es 'sin dato', no un precio", () => {
    expect(mapearAdjudicatario(ADJUDICADO, CTX, null).valorEstimado).toBeNull();
    expect(mapearAdjudicatario(ADJUDICADO, CTX, null).valorAdjudicado).toBe("1168754073.00");
  });

  it("conserva la fecha de adjudicación", () => {
    expect(mapearAdjudicatario(ADJUDICADO, CTX, null).fechaAdjudicacion).toBe("2018-05-18");
  });

  it("sin ganador atribuible no hay fila, aunque adjudicado sea true", () => {
    expect(
      mapearAdjudicatario({ ...ADJUDICADO, adjudicatario: "No Definido" }, CTX, null)
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
