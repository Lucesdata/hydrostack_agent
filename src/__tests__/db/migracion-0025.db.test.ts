/**
 * Migración 0025 (fase 3 de la vitrina): `al_filtros_usuario.tipos_proyecto`,
 * contra PGlite con todas las migraciones reales. Lo que se exige es lo que hace
 * segura la migración sobre la base viva: columna nula y sin default (las filas
 * existentes no cambian), RLS intacto y que el código de siempre siga
 * insertando sin conocerla. `coincidencia.origen` salió con «Seguir» el
 * 2026-10-05: «Guardar» usa `senal_usuario` y no necesita columna.
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
import { alFiltrosUsuario, usuario } from "@/src/lib/db/schema";

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
  it("al_filtros_usuario.tipos_proyecto es text[] nulo y sin default", async () => {
    expect(await columna("al_filtros_usuario", "tipos_proyecto")).toEqual({
      is_nullable: "YES",
      column_default: null,
      data_type: "ARRAY",
    });
  });

  it("la tabla sigue con RLS, y coincidencia no gana columna", async () => {
    const r = await db.execute(sql`
      select relname, relrowsecurity from pg_class
       where relname = 'al_filtros_usuario'`);
    expect((r as unknown as { rows: unknown[] }).rows).toEqual([
      { relname: "al_filtros_usuario", relrowsecurity: true },
    ]);
    expect(await columna("coincidencia", "origen")).toBeUndefined();
  });

  it("el código de siempre inserta sin conocer la columna nueva, y queda en NULL", async () => {
    await db.insert(usuario).values({ id: "u-0025", email: "u0025@example.com" });
    await db.insert(alFiltrosUsuario).values({
      accountId: "u-0025",
      usuarioId: "u-0025",
      nombre: "PTAR",
    });
    const [f] = await db.select({ t: alFiltrosUsuario.tiposProyecto }).from(alFiltrosUsuario);
    expect(f.t).toBeNull();
  });
});
