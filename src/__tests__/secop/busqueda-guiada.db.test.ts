import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { migrate } from "drizzle-orm/pglite/migrator";

// Solo se sustituye la conexión externa; esquema, migraciones y SQL son reales.
vi.mock("@/src/lib/db/client", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("@/src/lib/db/schema");
  const client = new PGlite();
  return { db: drizzle(client, { schema }), pool: { end: () => client.close() }, schema };
});

import { db, pool } from "@/src/lib/db/client";
import { entidad, proceso } from "@/src/lib/db/schema";
import { countProcesosDb, searchProcesosDb } from "@/src/lib/secop/db-search";
import {
  countProcesosDbCached,
  resetSecopSearchCache,
  searchProcesosDbCached,
} from "@/src/lib/secop/cached-db-search";
import type { SecopQuery } from "@/src/lib/secop/types";

const ids = (result: { items: { id: string }[] }) => result.items.map((p) => p.id);

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
  const compradores = await db
    .insert(entidad)
    .values([
      { nitCanonico: "100", nombre: "Entidad A" },
      { nitCanonico: "200", nombre: "Entidad B" },
    ])
    .returning();
  const base = { fechaPublicacion: "2026-09-01", estadoApertura: "Abierto" };
  await db.insert(proceso).values([
    {
      ...base,
      secopProcesoId: "PTAR-CONSULTORIA",
      objeto: "CONSULTORÍA Y DISEÑOS DE LA PTAR",
      tipoProyecto: "ptar",
    },
    {
      ...base,
      secopProcesoId: "PTAR-OBRA",
      objeto: "CONSTRUCCIÓN DE LA PTAR",
      tipoProyecto: "ptar",
    },
    {
      ...base,
      secopProcesoId: "PTAP-CONSULTORIA",
      objeto: "ESTUDIOS DE ACUEDUCTO Y PTAP",
      tipoProyecto: "ptap",
    },
    {
      ...base,
      secopProcesoId: "POTABLE-SIN-KEYWORD",
      objeto: "DISEÑOS DEL SISTEMA",
      tipoProyecto: "acueducto",
    },
    {
      ...base,
      secopProcesoId: "REDES",
      objeto: "REHABILITACIÓN DEL ALCANTARILLADO",
      tipoProyecto: "alcantarillado",
    },
    // Fragmento real: CO1.REQ.11142911; el id de prueba no es un proceso vivo.
    {
      ...base,
      secopProcesoId: "MUESTREO-REAL",
      objeto: "Muestreo aguas residuales",
      descripcion:
        "Contratar el muestreo y caracterización de aguas residuales en la Planta de Tratamiento de Aguas Residuales",
      tipoProyecto: "ptar",
    },
    // Fragmento real: CO1.REQ.11145242, título abreviado y descripción significativa.
    {
      ...base,
      secopProcesoId: "MUESTREO-DESCRIPCION",
      objeto: "UNIVERSIDAD MARIANA",
      descripcion:
        "SERVICIO DE MANTENIMIENTO RUTINARIO DE LAS PLANTAS DE TRATAMIENTO DE AGUAS RESIDUALES MEDIANTE MUESTREO Y ANALISIS",
      tipoProyecto: "ptar",
    },
    {
      ...base,
      secopProcesoId: "OPERACION",
      objeto: "OPERACIÓN DEL ACUEDUCTO",
      tipoProyecto: "acueducto",
    },
    {
      ...base,
      secopProcesoId: "COOPERACION",
      objeto: "COOPERACIÓN POR EL AGUA",
      tipoProyecto: "otros",
    },
    {
      ...base,
      secopProcesoId: "INTERVENTORIA",
      objeto: "INTERVENTORÍA A LA CONSTRUCCIÓN DEL ACUEDUCTO",
      tipoProyecto: "acueducto",
    },
    {
      ...base,
      secopProcesoId: "SUMINISTRO",
      objeto: "ADQUISICIÓN DE TUBERÍAS DE ACUEDUCTO",
      tipoProyecto: "acueducto",
    },
    {
      ...base,
      secopProcesoId: "PTAR-CERRADO",
      objeto: "CONSULTORIA DE PTAR",
      tipoProyecto: "ptar",
      estadoApertura: "Cerrado",
    },
    {
      ...base,
      secopProcesoId: "CO1.REQ.42",
      referencia: "OBR-081-2023",
      objeto: "Título abreviado",
      entidadId: compradores[0].id,
      estadoApertura: "Cerrado",
      fechaPublicacion: "2020-01-01",
    },
    {
      ...base,
      secopProcesoId: "CO1.REQ.420",
      referencia: "OTRA-REFERENCIA",
      objeto: "Título abreviado",
    },
    {
      ...base,
      secopProcesoId: "REF-B",
      referencia: "OBR-081-2023",
      objeto: "Otro título abreviado",
      entidadId: compradores[1].id,
    },
    {
      ...base,
      secopProcesoId: "REF-PARCIAL",
      referencia: "X-OBR-081-2023-AMPLIACION",
      objeto: "Título parcial",
      fechaPublicacion: "2026-10-01",
    },
    {
      ...base,
      secopProcesoId: "RETIRADO",
      referencia: "OBR-081-2023",
      objeto: "Registro retirado",
      deletedAt: new Date(),
    },
    { ...base, secopProcesoId: "LITERAL", referencia: "A%_B\\C", objeto: "Referencia literal" },
    { ...base, secopProcesoId: "COMODIN", referencia: "AXXB\\C", objeto: "Referencia parecida" },
    { ...base, secopProcesoId: "NULOS", objeto: null, referencia: null, descripcion: null },
  ]);
});

beforeEach(resetSecopSearchCache);
afterAll(async () => {
  resetSecopSearchCache();
  await pool.end();
});

describe("búsqueda guiada contra Postgres", () => {
  it("combina PTAR y consultoría sin incluir obras, PTAP ni cerrados", async () => {
    const query: SecopQuery = {
      modo: "tema",
      sistema: "ptar",
      actividad: "consultoria",
      apertura: "Abierto",
    };
    expect(ids(await searchProcesosDb(query))).toEqual(["PTAR-CONSULTORIA"]);
    expect(await countProcesosDb(query)).toBe(1);
  });

  it("Todos conserva únicamente la actividad", async () => {
    const query: SecopQuery = { modo: "tema", actividad: "consultoria", apertura: "Abierto" };
    expect(ids(await searchProcesosDb(query)).sort()).toEqual([
      "POTABLE-SIN-KEYWORD",
      "PTAP-CONSULTORIA",
      "PTAR-CONSULTORIA",
    ]);
    expect(await countProcesosDb(query)).toBe(3);
  });

  it("potable agrupa acueducto y PTAP incluso sin palabras sectoriales", async () => {
    expect(
      ids(
        await searchProcesosDb({ modo: "tema", sistema: "potable", actividad: "consultoria" })
      ).sort()
    ).toEqual(["POTABLE-SIN-KEYWORD", "PTAP-CONSULTORIA"]);
  });

  it("residual agrupa alcantarillado y PTAR", async () => {
    const result = await searchProcesosDb({
      modo: "tema",
      sistema: "residual",
      apertura: "Abierto",
    });
    expect(ids(result).sort()).toEqual([
      "MUESTREO-DESCRIPCION",
      "MUESTREO-REAL",
      "PTAR-CONSULTORIA",
      "PTAR-OBRA",
      "REDES",
    ]);
    expect(await countProcesosDb({ modo: "tema", sistema: "residual", apertura: "Abierto" })).toBe(
      5
    );
  });

  it("busca muestreo también en la descripción de un título abreviado", async () => {
    expect(ids(await searchProcesosDb({ modo: "tema", actividad: "muestreo" })).sort()).toEqual([
      "MUESTREO-DESCRIPCION",
      "MUESTREO-REAL",
    ]);
  });

  it("operación incluye mantenimiento sin confundirlo con cooperación", async () => {
    expect(ids(await searchProcesosDb({ modo: "tema", actividad: "operacion" })).sort()).toEqual([
      "MUESTREO-DESCRIPCION",
      "OPERACION",
    ]);
  });

  it.each([
    ["interventoria", ["INTERVENTORIA"]],
    ["suministros", ["SUMINISTRO"]],
    ["obras", ["INTERVENTORIA", "PTAR-OBRA", "REDES"]],
  ] as const)("filtra menciones de %s con tildes y mayúsculas", async (actividad, expected) => {
    expect(ids(await searchProcesosDb({ modo: "tema", actividad })).sort()).toEqual([...expected]);
  });

  it("un número completo encuentra cerrados sin exigir palabras sectoriales", async () => {
    const result = await searchProcesosDb({
      modo: "numero",
      numero: "co1.req.42",
      apertura: "Abierto",
    });
    expect(ids(result)).toEqual(["CO1.REQ.42", "CO1.REQ.420"]);
    expect(result.items.map((p) => p.coincidencia)).toEqual(["exacta", "parcial"]);
    expect(result.items[0].estadoApertura).toBe("Cerrado");
    expect(await countProcesosDb({ modo: "numero", numero: "co1.req.42" })).toBe(2);
  });

  it("presenta dos entidades con la misma referencia antes de las parciales", async () => {
    const result = await searchProcesosDb({
      modo: "numero",
      numero: "obr-081-2023",
      orden: "valor",
    });
    expect(ids(result)).toEqual(["CO1.REQ.42", "REF-B", "REF-PARCIAL"]);
    expect(result.items.map((p) => p.coincidencia)).toEqual(["exacta", "exacta", "parcial"]);
    expect(result.items.slice(0, 2).map((p) => p.entidad)).toEqual(["Entidad A", "Entidad B"]);
    expect(await countProcesosDb({ modo: "numero", numero: "obr-081-2023" })).toBe(3);
  });

  it("pagina las coincidencias con orden estable y conserva el total", async () => {
    const query: SecopQuery = { modo: "numero", numero: "OBR-081-2023", pageSize: 1 };
    expect(ids(await searchProcesosDb(query))).toEqual(["CO1.REQ.42"]);
    expect(ids(await searchProcesosDb({ ...query, page: 2 }))).toEqual(["REF-B"]);
    expect(ids(await searchProcesosDb({ ...query, page: 3 }))).toEqual(["REF-PARCIAL"]);
    expect(await countProcesosDb({ ...query, page: 2 })).toBe(3);
  });

  it("busca %, _ y barra inversa como caracteres literales", async () => {
    expect(ids(await searchProcesosDb({ modo: "numero", numero: "A%_B\\C" }))).toEqual(["LITERAL"]);
    expect(await countProcesosDb({ modo: "numero", numero: "A%_B\\C" })).toBe(1);
    expect(ids(await searchProcesosDb({ modo: "numero", numero: "%_" }))).toEqual(["LITERAL"]);
  });

  it("una referencia inexistente es un vacío real", async () => {
    expect(ids(await searchProcesosDb({ modo: "numero", numero: "NO-EXISTE" }))).toEqual([]);
    expect(await countProcesosDb({ modo: "numero", numero: "NO-EXISTE" })).toBe(0);
  });

  it("no ejecuta consultas guiadas con número vacío o filtros desconocidos", async () => {
    await expect(searchProcesosDb({ modo: "numero", numero: "" })).rejects.toThrow();
    await expect(countProcesosDb({ modo: "numero", numero: "" })).rejects.toThrow();
    await expect(searchProcesosDb({ modo: "tema", actividad: "hack" as never })).rejects.toThrow();
  });

  it("separa en caché sistema, actividad y modo", async () => {
    const q: SecopQuery = {
      modo: "tema",
      sistema: "ptar",
      actividad: "consultoria",
      apertura: "Abierto",
    };
    expect(ids(await searchProcesosDbCached(q))).toEqual(["PTAR-CONSULTORIA"]);
    expect(await countProcesosDbCached(q)).toBe(1);
    const obra: SecopQuery = { ...q, actividad: "obras" };
    expect(ids(await searchProcesosDbCached(obra))).toEqual(["PTAR-OBRA"]);
    expect(await countProcesosDbCached(obra)).toBe(1);
    const potable: SecopQuery = { ...q, sistema: "potable" };
    expect(ids(await searchProcesosDbCached(potable)).sort()).toEqual([
      "POTABLE-SIN-KEYWORD",
      "PTAP-CONSULTORIA",
    ]);
    expect(await countProcesosDbCached(potable)).toBe(2);
    const numero: SecopQuery = { modo: "numero", numero: "OBR-081-2023" };
    expect(ids(await searchProcesosDbCached(numero))).toEqual([
      "CO1.REQ.42",
      "REF-B",
      "REF-PARCIAL",
    ]);
    expect(await countProcesosDbCached(numero)).toBe(3);
  });
});
