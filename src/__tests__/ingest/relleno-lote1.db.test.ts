/**
 * Relleno del Lote 1 por identificador (spec 2026-10-24-lote1-datos-columnas, D-T3).
 * Núcleo con fetch y vacuum inyectados y base PGlite con las migraciones reales.
 */
import path from "node:path";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/src/lib/db/schema";
import { contrato, proceso } from "@/src/lib/db/schema";
import {
  aplicarContratos,
  aplicarProcesos,
  crearFetchFilas,
  enVentanaDelTick,
  idsDelUniverso,
  rellenarLote1,
  type RellenoDeps,
} from "@/src/lib/ingest/relleno-lote1";

const db = drizzle(new PGlite(), { schema });

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
  await db.insert(proceso).values([
    { secopProcesoId: "P1", fechaPublicacion: "2026-03-01" },
    { secopProcesoId: "P2", fechaPublicacion: "2026-04-01" },
    {
      secopProcesoId: "P3",
      fechaPublicacion: "2026-05-01",
      duracionValor: 5,
      duracionUnidad: "meses",
    },
    { secopProcesoId: "VIEJO", fechaPublicacion: "2025-12-31" },
    { secopProcesoId: "BORRADO", fechaPublicacion: "2026-06-01", deletedAt: new Date() },
  ]);
  const [p1, p2, viejo] = await Promise.all(
    ["P1", "P2", "VIEJO"].map(
      async (id) => (await db.select().from(proceso).where(eq(proceso.secopProcesoId, id)))[0]
    )
  );
  await db
    .insert(contrato)
    .values([
      { secopContratoId: "C1", procesoId: p1.id },
      { secopContratoId: "C2", procesoId: p2.id, diasAdicionados: 10 },
      { secopContratoId: "CVIEJO", procesoId: viejo.id },
      { secopContratoId: "CSUELTO" },
    ]);
}, 30000);

const filasProcesos = {
  P1: { id_del_proceso: "P1", duracion: "12", unidad_de_duracion: "Mes(es)" },
  P2: { id_del_proceso: "P2", duracion: "0", unidad_de_duracion: "Mes(es)" },
  P3: { id_del_proceso: "P3", duracion: "99", unidad_de_duracion: "día(s)" },
};

function deps(over: Partial<RellenoDeps> = {}): RellenoDeps {
  return {
    ids: (f) => idsDelUniverso(db as never, f),
    fetchFilas: vi.fn(async (_f, ids) =>
      ids.map((i) => filasProcesos[i as keyof typeof filasProcesos]).filter(Boolean)
    ),
    aplicarProcesos: (filas) => aplicarProcesos(db as never, filas),
    aplicarContratos: (filas) => aplicarContratos(db as never, filas),
    tamanoMb: async () => 300,
    vacuum: vi.fn(async () => {}),
    pausa: async () => {},
    ...over,
  };
}

const proc = async (id: string) =>
  (await db.select().from(proceso).where(eq(proceso.secopProcesoId, id)))[0];

describe("universo", () => {
  it("procesos desde 2026, sin borrados ni anteriores; contratos solo de esos procesos", async () => {
    expect(await idsDelUniverso(db as never, "procesos")).toEqual(["P1", "P2", "P3"]);
    expect(await idsDelUniverso(db as never, "contratos")).toEqual(["C1", "C2"]);
  });
});

describe("rellenarLote1 · procesos", () => {
  beforeEach(async () => {
    await db.execute(
      sql`update proceso set duracion_valor = null, duracion_unidad = null where secop_proceso_id in ('P1','P2')`
    );
  });

  it("por defecto es seco: informa y no escribe nada", async () => {
    const d = deps();
    const r = await rellenarLote1("procesos", d, { aplicar: false });
    expect(r.aplicados).toBe(0);
    expect(d.vacuum).not.toHaveBeenCalled();
    expect(r.pedidos).toBe(3);
    expect(r.encontrados).toBe(3);
    expect(r.poblados.duracionValor).toBe(2); // P1 y P3; P2 trae «0»
    expect((await proc("P1")).duracionValor).toBeNull();
  });

  it("aplica solo lo que la fuente trae, sin borrar lo ya rellenado, y es idempotente", async () => {
    const r1 = await rellenarLote1("procesos", deps(), { aplicar: true });
    expect(r1.aplicados).toBeGreaterThan(0);
    expect([(await proc("P1")).duracionValor, (await proc("P1")).duracionUnidad]).toEqual([
      12,
      "meses",
    ]);
    expect((await proc("P2")).duracionValor).toBeNull(); // «0» no es dato
    expect((await proc("P3")).duracionValor).toBe(99); // la fuente manda sobre... lo existente solo si trae dato
    await rellenarLote1("procesos", deps(), { aplicar: true });
    expect([(await proc("P1")).duracionValor, (await proc("P3")).duracionUnidad]).toEqual([
      12,
      "dias",
    ]);
    // un id que la fuente no trae no se toca y se informa
    const sinFuente = await rellenarLote1("procesos", deps({ fetchFilas: async () => [] }), {
      aplicar: true,
    });
    expect(sinFuente.sinFila).toBe(3);
    expect((await proc("P1")).duracionValor).toBe(12);
  });

  it("pide los identificadores en lotes del tamaño indicado", async () => {
    const d = deps();
    await rellenarLote1("procesos", d, { aplicar: false, tamLote: 2 });
    expect((d.fetchFilas as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[1].length)).toEqual([
      2, 1,
    ]);
  });

  it("--max-ids acota el universo", async () => {
    const r = await rellenarLote1("procesos", deps(), { aplicar: false, maxIds: 2 });
    expect(r.pedidos).toBe(2);
  });

  it("aborta sin escribir más cuando la base supera el límite", async () => {
    const d = deps({ tamanoMb: async () => 430 });
    const r = await rellenarLote1("procesos", d, { aplicar: true, limiteMb: 420 });
    expect(r.abortado).toBe(true);
    expect(r.aplicados).toBe(0);
    expect((await proc("P1")).duracionValor).toBeNull();
  });

  it("si el fetch falla propaga el error y no deja escrituras a medias del lote fallido", async () => {
    const d = deps({
      fetchFilas: vi
        .fn()
        .mockResolvedValueOnce([filasProcesos.P1])
        .mockRejectedValueOnce(new Error("SODA 503")),
    });
    await expect(rellenarLote1("procesos", d, { aplicar: true, tamLote: 1 })).rejects.toThrow(
      "SODA 503"
    );
    expect((await proc("P1")).duracionValor).toBe(12); // el lote anterior ya estaba escrito
    expect((await proc("P2")).duracionValor).toBeNull();
  });

  it("filas duplicadas de un mismo id se fusionan: gana el primer dato presente", async () => {
    const d = deps({
      fetchFilas: async () => [
        { id_del_proceso: "P1", duracion: "", unidad_de_duracion: "Mes(es)" },
        { id_del_proceso: "P1", duracion: "8", unidad_de_duracion: "Mes(es)" },
      ],
    });
    await rellenarLote1("procesos", d, { aplicar: true, maxIds: 1 });
    expect((await proc("P1")).duracionValor).toBe(8);
  });
});

describe("rellenarLote1 · contratos", () => {
  const filas = [
    {
      id_contrato: "C1",
      origen_de_los_recursos: "Recursos Propios",
      destino_gasto: "Inversión",
      sistema_general_de_participaciones: "500",
      recursos_propios: "0",
      dias_adicionados: "60",
      liquidaci_n: "No",
    },
    { id_contrato: "C2", dias_adicionados: "0", liquidaci_n: "Si" },
  ];
  it("escribe los cinco campos; no pisa un valor existente con la ausencia", async () => {
    await rellenarLote1("contratos", deps({ fetchFilas: async () => filas }), { aplicar: true });
    const c = async (id: string) =>
      (await db.select().from(contrato).where(eq(contrato.secopContratoId, id)))[0];
    const c1 = await c("C1");
    expect([c1.origenRecursos, c1.destinoGasto, c1.diasAdicionados, c1.liquidado]).toEqual([
      "Recursos Propios",
      "Inversión",
      60,
      false,
    ]);
    expect(c1.fuentesRecursos).toEqual({ sgp: 500 });
    const c2 = await c("C2");
    expect(c2.diasAdicionados).toBe(10); // la fuente trae «0» (= sin dato): se conserva el 10
    expect(c2.liquidado).toBe(true);
    expect(c2.fuentesRecursos).toBeNull();
  });
});

describe("ventana del tick", () => {
  it("11:00–12:30 UTC está vedada para escribir", () => {
    const t = (h: number, m: number) => new Date(Date.UTC(2026, 9, 24, h, m));
    expect(enVentanaDelTick(t(10, 59))).toBe(false);
    expect(enVentanaDelTick(t(11, 0))).toBe(true);
    expect(enVentanaDelTick(t(12, 30))).toBe(true);
    expect(enVentanaDelTick(t(12, 31))).toBe(false);
  });
});

describe("crearFetchFilas", () => {
  it("pide solo el id y los campos del lote, con los ids escapados y un límite holgado", async () => {
    const soda = vi.fn(async () => [{ id_del_proceso: "P1" }]);
    const f = crearFetchFilas({ dataset: async () => "p6dx-8zbt", soda, esperar: async () => {} });
    await f("procesos", ["CO1.REQ.1", "CO1.REQ.2'x"]);
    const [dataset, params] = soda.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(dataset).toBe("p6dx-8zbt");
    expect(params.$select).toBe("id_del_proceso,duracion,unidad_de_duracion");
    expect(params.$where).toBe("id_del_proceso in ('CO1.REQ.1','CO1.REQ.2''x')");
    expect(params.$limit).toBeGreaterThanOrEqual(1000);
  });

  it("contratos: el id es id_contrato y se piden los cinco campos", async () => {
    const soda = vi.fn(async () => []);
    await crearFetchFilas({ dataset: async () => "jbjy-vk9h", soda, esperar: async () => {} })(
      "contratos",
      ["C1"]
    );
    const params = (soda.mock.calls[0] as unknown as [string, Record<string, string>])[1];
    expect(params.$select.split(",")).toEqual(
      expect.arrayContaining(["id_contrato", "dias_adicionados", "liquidaci_n", "destino_gasto"])
    );
    expect(params.$where).toContain("id_contrato in ('C1')");
  });

  it("reintenta con espera creciente y, agotados los intentos, propaga el error", async () => {
    const esperas: number[] = [];
    const soda = vi
      .fn()
      .mockRejectedValueOnce(new Error("503"))
      .mockResolvedValueOnce([{ id_del_proceso: "P1" }]);
    const f = crearFetchFilas({
      dataset: async () => "x",
      soda,
      esperar: async (ms) => void esperas.push(ms),
    });
    expect(await f("procesos", ["P1"])).toHaveLength(1);
    expect(esperas).toEqual([2000]);

    const siempreFalla = vi.fn().mockRejectedValue(new Error("SODA 500"));
    await expect(
      crearFetchFilas({ dataset: async () => "x", soda: siempreFalla, esperar: async () => {} })(
        "procesos",
        ["P1"]
      )
    ).rejects.toThrow("SODA 500");
    expect(siempreFalla).toHaveBeenCalledTimes(3);
  });
});
