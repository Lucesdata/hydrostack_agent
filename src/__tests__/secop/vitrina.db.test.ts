/**
 * El orden de la vitrina contra un Postgres de verdad (PGlite con las
 * migraciones reales): el `case` de relevancia, el día en Colombia y que el
 * total no cambie. Mismo patrón que `muestra-portada.db.test.ts`.
 */
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { migrate } from "drizzle-orm/pglite/migrator";

vi.mock("@/src/lib/db/client", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("@/src/lib/db/schema");
  const client = new PGlite();
  return { db: drizzle(client, { schema }), pool: { end: () => client.close() }, schema };
});

import { db } from "@/src/lib/db/client";
import { entidad, geografia, proceso } from "@/src/lib/db/schema";
import { SIN_FILTROS } from "@/src/lib/secop/filtros-vitrina";
import { procesosDeVitrina } from "@/src/lib/secop/vitrina";

function dia(offset: number): string {
  return new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
}

async function unProceso(
  id: string,
  v: {
    tipo: string | null;
    publicado: string;
    recepcion?: string;
    objeto?: string;
    geo?: string;
    valor?: string;
    entidadId?: string;
  }
) {
  await db.insert(proceso).values({
    secopProcesoId: id,
    objeto: v.objeto ?? `Obra ${id}`,
    geografiaId: v.geo ?? null,
    valorEstimado: v.valor ?? null,
    entidadId: v.entidadId ?? null,
    estadoApertura: "Abierto",
    estadoActual: "Publicado",
    tipoProyecto: v.tipo,
    fechaPublicacion: v.publicado,
    fechaRecepcion: v.recepcion ?? null,
  });
}

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
  await db.insert(geografia).values([
    {
      codigoDivipola: "05001",
      departamentoCodigo: "05",
      departamentoNombre: "Antioquia",
      municipioCodigo: "001",
      municipioNombre: "Medellín",
    },
    {
      codigoDivipola: "15215",
      departamentoCodigo: "15",
      departamentoNombre: "Boyacá",
      municipioCodigo: "215",
      municipioNombre: "Covarachía",
    },
  ]);
  const [ent] = await db
    .insert(entidad)
    .values({ nitCanonico: "9", nombre: "EMPRESAS PUBLICAS DE MEDELLIN" })
    .returning({ id: entidad.id });
  // El más reciente de todos es «otros»; el siguiente, de agua pero vencido.
  await unProceso("CO1.REQ.OTROS", {
    tipo: "otros",
    publicado: dia(0),
    geo: "05001",
    entidadId: ent.id,
    valor: "413000000",
  });
  await unProceso("CO1.REQ.VENCIDO", { tipo: "ptar", publicado: dia(0), recepcion: dia(-10) });
  await unProceso("CO1.REQ.SINTIPO", {
    tipo: null,
    publicado: dia(-1),
    objeto: "Compra de 100% insumos",
  });
  await unProceso("CO1.REQ.ACUEDUCTO", {
    tipo: "acueducto",
    publicado: dia(-3),
    geo: "15215",
    valor: "260000000",
  });
  await unProceso("CO1.REQ.PTAR", {
    tipo: "ptar",
    publicado: dia(-2),
    recepcion: dia(20),
    valor: "1200000000",
  });
});

describe("el orden de los abiertos", () => {
  it("agua que recibe ofertas, luego sin subsistema, al final la recepción vencida", async () => {
    const p = await procesosDeVitrina("abiertos", 1);
    expect(p.items.map((i) => i.secopProcesoId)).toEqual([
      "CO1.REQ.PTAR",
      "CO1.REQ.ACUEDUCTO",
      "CO1.REQ.OTROS",
      "CO1.REQ.SINTIPO",
      "CO1.REQ.VENCIDO",
    ]);
  });

  it("ordena, no filtra: el total sigue siendo el de condicionAbierto()", async () => {
    expect((await procesosDeVitrina("abiertos", 1)).total).toBe(5);
  });
});

describe("los filtros", () => {
  const ids = async (f: Partial<typeof SIN_FILTROS>, departamentoCodigo: string | null = null) =>
    (
      await procesosDeVitrina("abiertos", 1, {
        filtros: { ...SIN_FILTROS, ...f },
        departamentoCodigo,
      })
    ).items.map((i) => i.secopProcesoId);

  it("por tipo", async () => {
    expect(await ids({ tipo: "ptar" })).toEqual(["CO1.REQ.PTAR", "CO1.REQ.VENCIDO"]);
  });

  it("por departamento, con el código ya resuelto", async () => {
    expect(await ids({ departamento: "boyaca" }, "15")).toEqual(["CO1.REQ.ACUEDUCTO"]);
  });

  it("por presupuesto mínimo en millones", async () => {
    expect(await ids({ presupuestoMin: 500 })).toEqual(["CO1.REQ.PTAR"]);
  });

  it("la búsqueda mira objeto, entidad y municipio", async () => {
    expect(await ids({ q: "medellin" })).toEqual(["CO1.REQ.OTROS"]);
    expect(await ids({ q: "covarach" })).toEqual(["CO1.REQ.ACUEDUCTO"]);
    expect(await ids({ q: "Obra CO1.REQ.PTAR" })).toEqual(["CO1.REQ.PTAR"]);
  });

  it("un % del usuario es literal, no comodín", async () => {
    expect(await ids({ q: "100%" })).toEqual(["CO1.REQ.SINTIPO"]);
    expect(await ids({ q: "%" })).toEqual(["CO1.REQ.SINTIPO"]);
  });

  it("el total cuenta con los mismos filtros, joins incluidos", async () => {
    const p = await procesosDeVitrina("abiertos", 1, {
      filtros: { ...SIN_FILTROS, q: "medellin" },
    });
    expect(p.total).toBe(1);
  });

  it("orden por presupuesto: los sin presupuesto al final", async () => {
    expect(await ids({ orden: "valor" })).toEqual([
      "CO1.REQ.PTAR",
      "CO1.REQ.OTROS",
      "CO1.REQ.ACUEDUCTO",
      expect.any(String),
      expect.any(String),
    ]);
  });

  it("los adjudicados ignoran los filtros", async () => {
    const p = await procesosDeVitrina("adjudicados", 1, {
      filtros: { ...SIN_FILTROS, tipo: "ptar" },
    });
    expect(p.filtros).toEqual(SIN_FILTROS);
  });
});
