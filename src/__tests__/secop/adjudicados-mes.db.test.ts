/**
 * `adjudicadosDelMes` contra PGlite con las migraciones reales: los bordes del
 * mes, los tipos que cuentan, el orden por valor adjudicado y la regla de no
 * nombrar personas naturales son SQL + la proyección pura.
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
import { entidad, geografia, proceso, proveedor } from "@/src/lib/db/schema";
import { adjudicadosDelMes } from "@/src/lib/secop/adjudicados-mes";

const mes = { desde: "2026-10-01", hasta: "2026-11-01", etiqueta: "octubre de 2026" };
let n = 0;

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
  await db.insert(geografia).values({
    codigoDivipola: "76001",
    departamentoCodigo: "76",
    departamentoNombre: "Valle del Cauca",
    municipioCodigo: "001",
    municipioNombre: "Cali",
  });
  const [e] = await db
    .insert(entidad)
    .values({ nitCanonico: "890399011", nombre: "MUNICIPIO DE CALI" })
    .returning({ id: entidad.id });
  await db.insert(proveedor).values([
    { nitCanonico: "900123456", tipoDocumento: "NIT", razonSocial: "CONSORCIO AGUAS DEL VALLE" },
    { nitCanonico: "16789012", tipoDocumento: "CC", razonSocial: "JUAN PEREZ" },
  ]);
  const p = (extra: Partial<typeof proceso.$inferInsert>) => ({
    secopProcesoId: `CO1.REQ.${++n}`,
    entidadId: e.id,
    geografiaId: "76001",
    adjudicado: true,
    fechaAdjudicacion: "2026-10-15",
    tipoProyecto: "acueducto",
    ...extra,
  });
  await db.insert(proceso).values([
    p({
      objeto: "Optimización PTAR Cañaveralejo",
      tipoProyecto: "ptar",
      valorAdjudicacion: "9000000000",
      valorEstimado: "10000000000",
      nitAdjudicatario: "900.123.456-7",
      adjudicatario: "Consorcio Aguas del Valle",
      fechaAdjudicacion: "2026-10-31",
    }),
    p({ objeto: "Redes de acueducto", valorAdjudicacion: "8000000000", fechaAdjudicacion: "2026-10-01" }),
    p({
      objeto: "Alcantarillado sanitario",
      tipoProyecto: "alcantarillado",
      valorAdjudicacion: "7000000000",
      nitAdjudicatario: "16789012",
      adjudicatario: "Juan Perez",
    }),
    p({ objeto: "PTAP rural", tipoProyecto: "ptap", valorAdjudicacion: "6000000000" }),
    p({ objeto: "Conducción", valorAdjudicacion: "5000000000" }),
    p({ objeto: "Sexto: no entra en el top", valorAdjudicacion: "4000000000" }),
    // Fuera: tipo otros, sin valor, no adjudicado, fuera del mes.
    p({ objeto: "Facturación", tipoProyecto: "otros", valorAdjudicacion: "99000000000" }),
    p({ objeto: "Sin valor", valorAdjudicacion: "0" }),
    p({ objeto: "No adjudicado", adjudicado: false, valorAdjudicacion: "99000000000" }),
    p({ objeto: "Septiembre", fechaAdjudicacion: "2026-09-30", valorAdjudicacion: "99000000000" }),
    p({ objeto: "Noviembre", fechaAdjudicacion: "2026-11-01", valorAdjudicacion: "99000000000" }),
  ]);
});

describe("adjudicadosDelMes (SQL real)", () => {
  it("devuelve los cinco de mayor valor adjudicado del mes, con sus bordes", async () => {
    const { items } = await adjudicadosDelMes(mes);
    expect(items.map((i) => i.objeto)).toEqual([
      "Optimización PTAR Cañaveralejo",
      "Redes de acueducto",
      "Alcantarillado sanitario",
      "PTAP rural",
      "Conducción",
    ]);
  });

  it("nombra a la persona jurídica con NIT y calcula lo adjudicado frente al presupuesto", async () => {
    const [primero] = (await adjudicadosDelMes(mes)).items;
    expect(primero.adjudicatario).toBe("CONSORCIO AGUAS DEL VALLE");
    expect(primero.frentePresupuesto).toBe(90);
    expect(primero.fechaAdjudicacion).toBe("2026-10-31");
    expect(primero.departamento).toBe("Valle del Cauca");
    expect(primero.hrefFicha).toMatch(/^\/licitaciones\/.+/);
  });

  it("no nombra a la persona natural ni al adjudicatario sin NIT resuelto", async () => {
    const { items } = await adjudicadosDelMes(mes);
    expect(items[1].adjudicatario).toBeNull();
    expect(items[2].adjudicatario).toBeNull();
    expect(items[1].frentePresupuesto).toBeNull();
  });
});
