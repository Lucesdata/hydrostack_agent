/**
 * Las consultas del resumen por departamento contra un Postgres de verdad
 * (PGlite con las migraciones reales), no contra un mock: lo que se prueba es
 * SQL —aritmética de fechas, `count(distinct)`, orden con NULL— y un mock no
 * ejecuta nada de eso. Mismo patrón que `supabase/sync-usuario.test.ts`.
 */
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
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
import { resumenDepartamento } from "@/src/lib/secop/resumen-departamento";
import { detallePorDepartamento } from "@/src/lib/secop/agregados";

/** Fecha de hace `dias` días, como la escribe la ingesta (date, sin hora). */
const hace = (dias: number) => sql`current_date - ${sql.raw(String(dias))}`;

let n = 0;
async function unProceso(v: {
  dpto?: string;
  diasAtras: number;
  abierto?: boolean;
  valor?: string | null;
  entidadId?: string | null;
  objeto?: string;
}) {
  n += 1;
  await db.insert(proceso).values({
    secopProcesoId: `CO1.REQ.${n}`,
    objeto: v.objeto ?? `Obra ${n}`,
    geografiaId: `${v.dpto ?? "05"}000`,
    entidadId: v.entidadId ?? null,
    valorEstimado: v.valor ?? null,
    fechaPublicacion: hace(v.diasAtras) as unknown as string,
    estadoApertura: v.abierto === false ? "Cerrado" : "Abierto",
    estadoActual: v.abierto === false ? "Adjudicado" : "Publicado",
    tipoProyecto: "ptar",
  });
}

let entA: string;
let entB: string;

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
  await db.insert(geografia).values([
    {
      codigoDivipola: "05000",
      departamentoCodigo: "05",
      departamentoNombre: "Antioquia",
      municipioCodigo: "000",
    },
    {
      codigoDivipola: "08000",
      departamentoCodigo: "08",
      departamentoNombre: "Atlántico",
      municipioCodigo: "000",
    },
  ]);
  const [a, b] = await db
    .insert(entidad)
    .values([
      { nitCanonico: "1", nombre: "Municipio A" },
      { nitCanonico: "2", nombre: "Municipio B" },
    ])
    .returning({ id: entidad.id });
  entA = a.id;
  entB = b.id;

  await unProceso({ diasAtras: 0, valor: "100", entidadId: entA, objeto: "Pequeña" });
  await unProceso({ diasAtras: 3, valor: "900", entidadId: entA, objeto: "Grande" });
  await unProceso({ diasAtras: 8, valor: null, entidadId: entB, objeto: "Sin presupuesto" });
  await unProceso({ diasAtras: 20, valor: "500", entidadId: null, objeto: "Mediana" });
  // Cerrado: no aparece en destacados ni en el detalle de abiertos.
  await unProceso({ diasAtras: 40, abierto: false, valor: "99999", entidadId: entB });
  // Otro departamento: no se mezcla.
  await unProceso({ dpto: "08", diasAtras: 1, valor: "5000" });
});

describe("resumenDepartamento (SQL real)", () => {
  it("destacados: abiertos del departamento, mayor presupuesto primero, sin presupuesto al final", async () => {
    const { destacados } = await resumenDepartamento("05");
    expect(destacados.map((d) => d.objeto)).toEqual(["Grande", "Mediana", "Pequeña"]);
    expect(destacados[0].ficha).toMatch(/^\/licitaciones\/.+CO1\.REQ\.\d+$/);
    expect(destacados[0].tipoProyecto).toBe("ptar");
  });

  it("un departamento sin procesos no devuelve destacados", async () => {
    const r = await resumenDepartamento("99");
    expect(r.destacados).toEqual([]);
  });
});

describe("detallePorDepartamento · nEntidades (SQL real)", () => {
  it("cuenta entidades distintas entre los abiertos, sin el NULL", async () => {
    const filas = await detallePorDepartamento();
    const antioquia = filas.find((f) => f.clave === "05")!;
    // Abiertos de Antioquia: A dos veces, B una, uno sin entidad → 2 distintas.
    expect(antioquia.n).toBe(4);
    expect(antioquia.nEntidades).toBe(2);
  });
});
