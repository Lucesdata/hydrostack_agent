/**
 * `informeDelMes` contra PGlite con las migraciones reales: los límites del
 * mes, los agrupamientos y el presupuesto publicado son SQL.
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
import { informeDelMes } from "@/src/lib/secop/informe";

const mes = { desde: "2026-08-01", hasta: "2026-09-01", etiqueta: "agosto de 2026" };
let n = 0;

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
      { nitCanonico: "1", nombre: "EPM" },
      { nitCanonico: "2", nombre: "Triple A" },
    ])
    .returning({ id: entidad.id });
  const p = (fecha: string, extra: Partial<typeof proceso.$inferInsert>) => ({
    secopProcesoId: `CO1.REQ.${++n}`,
    fechaPublicacion: fecha,
    ...extra,
  });
  await db.insert(proceso).values([
    p("2026-08-01", {
      entidadId: a.id,
      geografiaId: "05000",
      valorEstimado: "1000",
      tipoProyecto: "ptar",
    }),
    p("2026-08-15", {
      entidadId: a.id,
      geografiaId: "05000",
      valorEstimado: "0",
      tipoProyecto: "acueducto",
    }),
    // Cerrado: cuenta igual, el informe es de lo publicado.
    p("2026-08-31", {
      entidadId: b.id,
      geografiaId: "08000",
      valorEstimado: "500",
      tipoProyecto: "ptar",
      estadoApertura: "Cerrado",
      estadoActual: "Adjudicado",
    }),
    // Fuera del mes: no cuentan.
    p("2026-07-31", { entidadId: a.id, geografiaId: "05000", valorEstimado: "99" }),
    p("2026-09-01", { entidadId: b.id, geografiaId: "08000", valorEstimado: "99" }),
  ]);
});

describe("informeDelMes (SQL real)", () => {
  it("cuenta lo publicado dentro del mes, con sus dos bordes, abierto o no", async () => {
    const i = await informeDelMes(mes);
    expect(i.publicados).toBe(3);
    expect(i.montoPublicado).toBe(1500);
    expect(i.nConMonto).toBe(2);
  });

  it("reparte por tipo, con cero en los que no aparecen", async () => {
    const { porTipo } = await informeDelMes(mes);
    expect(porTipo).toEqual({ acueducto: 1, alcantarillado: 0, ptap: 0, ptar: 2, otros: 0 });
  });

  it("ordena departamentos y entidades por publicados", async () => {
    const i = await informeDelMes(mes);
    expect(i.departamentos.map((d) => [d.nombre, d.n, d.monto])).toEqual([
      ["Antioquia", 2, 1000],
      ["Atlántico", 1, 500],
    ]);
    expect(i.entidades.map((e) => [e.nombre, e.n])).toEqual([
      ["EPM", 2],
      ["Triple A", 1],
    ]);
  });
});
