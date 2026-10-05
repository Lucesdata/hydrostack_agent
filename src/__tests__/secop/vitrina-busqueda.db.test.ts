/**
 * Los criterios del buscador guiado (#109) ya en la vitrina, contra Postgres de
 * verdad (PGlite con las migraciones reales). Son los mismos casos que probaban
 * `/api/secop`, que salió el 2026-10-05 al unificar los dos buscadores; aquí,
 * además, «abierto» es `condicionAbierto()`, la definición común.
 */
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { migrate } from "drizzle-orm/pglite/migrator";

vi.mock("@/src/lib/db/client", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("@/src/lib/db/schema");
  const client = new PGlite();
  return { db: drizzle(client, { schema }), pool: { end: () => client.close() }, schema };
});

import { db, pool } from "@/src/lib/db/client";
import { entidad, proceso } from "@/src/lib/db/schema";
import { procesosDeVitrina } from "@/src/lib/secop/vitrina";
import { SIN_FILTROS, type FiltrosVitrina } from "@/src/lib/secop/filtros-vitrina";

const buscar = async (f: Partial<FiltrosVitrina>, pagina = 1) =>
  procesosDeVitrina("abiertos", pagina, { filtros: { ...SIN_FILTROS, ...f } });
const ids = (r: { items: { secopProcesoId: string }[] }) => r.items.map((p) => p.secopProcesoId);

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
  const compradores = await db
    .insert(entidad)
    .values([
      { nitCanonico: "100", nombre: "Entidad A" },
      { nitCanonico: "200", nombre: "Entidad B" },
    ])
    .returning();
  const base = {
    fechaPublicacion: "2026-09-01",
    estadoApertura: "Abierto",
    estadoActual: "Publicado",
    // Abierto = recibe ofertas: hace falta una recepción vigente (condicionAbierto).
    fechaRecepcion: "2099-12-31",
  };
  const cerrado = { estadoApertura: "Cerrado", estadoActual: "Seleccionado" };
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
      ...cerrado,
      secopProcesoId: "PTAR-CERRADO",
      objeto: "CONSULTORIA DE PTAR",
      tipoProyecto: "ptar",
    },
    {
      ...base,
      ...cerrado,
      secopProcesoId: "CO1.REQ.42",
      referencia: "OBR-081-2023",
      objeto: "Título abreviado",
      entidadId: compradores[0].id,
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
      objeto: "Retirado",
      deletedAt: new Date(),
    },
    { ...base, secopProcesoId: "LITERAL", referencia: "A%_B\\C", objeto: "Referencia literal" },
    { ...base, secopProcesoId: "COMODIN", referencia: "AXXB\\C", objeto: "Referencia parecida" },
  ]);
});

afterAll(() => pool.end());

describe("tipo agrupado y actividad en la vitrina", () => {
  it("combina PTAR y consultoría sin obras, PTAP ni cerrados", async () => {
    const r = await buscar({ tipo: "ptar", actividad: "consultoria" });
    expect(ids(r)).toEqual(["PTAR-CONSULTORIA"]);
    expect(r.total).toBe(1);
  });

  it("potable agrupa acueducto y PTAP, aunque el objeto no diga «agua»", async () => {
    expect(ids(await buscar({ tipo: "potable", actividad: "consultoria" })).sort()).toEqual([
      "POTABLE-SIN-KEYWORD",
      "PTAP-CONSULTORIA",
    ]);
  });

  it("residual agrupa alcantarillado y PTAR, solo abiertos", async () => {
    const r = await buscar({ tipo: "residual" });
    expect(ids(r).sort()).toEqual([
      "MUESTREO-DESCRIPCION",
      "PTAR-CONSULTORIA",
      "PTAR-OBRA",
      "REDES",
    ]);
    expect(r.total).toBe(4);
  });

  it("la actividad se busca también en la descripción", async () => {
    expect(ids(await buscar({ actividad: "muestreo" }))).toEqual(["MUESTREO-DESCRIPCION"]);
  });

  it("operación incluye mantenimiento sin confundirlo con cooperación", async () => {
    expect(ids(await buscar({ actividad: "operacion" })).sort()).toEqual([
      "MUESTREO-DESCRIPCION",
      "OPERACION",
    ]);
  });
});

describe("búsqueda por número en la vitrina", () => {
  it("encuentra cerrados y pone primero la coincidencia exacta", async () => {
    const r = await buscar({ numero: "co1.req.42" });
    expect(ids(r)).toEqual(["CO1.REQ.42", "CO1.REQ.420"]);
    expect(r.items[0].estadoApertura).toBe("Cerrado");
    expect(r.total).toBe(2);
  });

  it("dos entidades con la misma referencia van antes de las parciales; los retirados no", async () => {
    const r = await buscar({ numero: "obr-081-2023" });
    expect(ids(r).slice(0, 2).sort()).toEqual(["CO1.REQ.42", "REF-B"]);
    expect(ids(r)[2]).toBe("REF-PARCIAL");
    expect(r.total).toBe(3);
  });

  it("manda sobre los demás filtros", async () => {
    expect(ids(await buscar({ numero: "CO1.REQ.42", tipo: "ptap", q: "nada" }))).toEqual([
      "CO1.REQ.42",
      "CO1.REQ.420",
    ]);
  });

  it("busca %, _ y barra inversa como caracteres", async () => {
    expect(ids(await buscar({ numero: "A%_B\\C" }))).toEqual(["LITERAL"]);
    expect(ids(await buscar({ numero: "%_" }))).toEqual(["LITERAL"]);
  });

  it("una referencia inexistente es un vacío real", async () => {
    const r = await buscar({ numero: "NO-EXISTE" });
    expect(r.items).toEqual([]);
    expect(r.total).toBe(0);
  });
});
