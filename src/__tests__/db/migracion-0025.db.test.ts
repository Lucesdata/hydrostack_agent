/**
 * Migración 0025 (fase 3 de la vitrina): `coincidencia.origen` y
 * `al_filtros_usuario.tipos_proyecto`, contra PGlite con todas las migraciones
 * reales. Lo que se exige es lo que hace segura la migración sobre la base viva:
 * columnas nulas y sin default (las filas existentes no cambian, ninguna
 * consulta actual las nombra), RLS intacto en las dos tablas y que el código
 * de siempre siga insertando sin conocerlas.
 */
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { migrate } from "drizzle-orm/pglite/migrator";
import { sql } from "drizzle-orm";

vi.mock("@/src/lib/db/client", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("@/src/lib/db/schema");
  const client = new PGlite();
  return { db: drizzle(client, { schema }), pool: { end: () => client.close() }, schema };
});

import { db } from "@/src/lib/db/client";
import { alFiltrosUsuario, coincidencia, usuario } from "@/src/lib/db/schema";

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
});

async function columna(tabla: string, nombre: string) {
  const r = await db.execute(sql`
    select is_nullable, column_default, data_type
      from information_schema.columns
     where table_name = ${tabla} and column_name = ${nombre}`);
  return (r as unknown as { rows: Record<string, string | null>[] }).rows[0];
}

describe("migración 0025", () => {
  it("coincidencia.origen es text nulo y sin default", async () => {
    expect(await columna("coincidencia", "origen")).toEqual({
      is_nullable: "YES",
      column_default: null,
      data_type: "text",
    });
  });

  it("al_filtros_usuario.tipos_proyecto es text[] nulo y sin default", async () => {
    expect(await columna("al_filtros_usuario", "tipos_proyecto")).toEqual({
      is_nullable: "YES",
      column_default: null,
      data_type: "ARRAY",
    });
  });

  it("las dos tablas siguen con RLS", async () => {
    const r = await db.execute(sql`
      select relname, relrowsecurity from pg_class
       where relname in ('coincidencia', 'al_filtros_usuario') order by relname`);
    expect((r as unknown as { rows: unknown[] }).rows).toEqual([
      { relname: "al_filtros_usuario", relrowsecurity: true },
      { relname: "coincidencia", relrowsecurity: true },
    ]);
  });

  it("el código de siempre inserta sin conocer las columnas nuevas, y quedan en NULL", async () => {
    await db.insert(usuario).values({ id: "u-0025", email: "u0025@example.com" });
    await db.insert(coincidencia).values({
      usuarioId: "u-0025",
      procesoId: "CO1.REQ.1",
      veredictoOverall: "PASS",
    });
    const [c] = await db.select({ origen: coincidencia.origen }).from(coincidencia);
    expect(c.origen).toBeNull();

    await db.insert(alFiltrosUsuario).values({
      accountId: "u-0025",
      usuarioId: "u-0025",
      nombre: "PTAR",
    });
    const [f] = await db.select({ t: alFiltrosUsuario.tiposProyecto }).from(alFiltrosUsuario);
    expect(f.t).toBeNull();
  });
});
