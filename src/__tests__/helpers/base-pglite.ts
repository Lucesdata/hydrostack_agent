/**
 * Postgres real en proceso (PGlite) con las migraciones de `drizzle/` aplicadas.
 * Para pruebas cuyo comportamiento depende de la base: índices únicos, FK en
 * cascada, triggers y permisos por rol. Un mock de `db` no tiene nada de eso.
 *
 * Con `conAuth`, antes de migrar se levanta un sustituto mínimo de lo que
 * Supabase pone alrededor de `auth.users`, con lo que importa para las pruebas:
 * - `auth.users` con las dos columnas que lee el código, y como dueño
 *   `supabase_auth_admin`, el rol con el que GoTrue borra cuentas. En la base
 *   viva ese rol no es superusuario ni ignora RLS (verificado el 2026-09-19).
 * - los roles `anon` y `authenticated`, y el privilegio por defecto de Supabase
 *   que les concede EXECUTE sobre toda función nueva de `public`.
 * El `auth.users` real tiene un único parcial sobre `email`; aquí se omite para
 * poder representar dos cuentas vivas con el mismo correo (espejo desfasado o SSO).
 */
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/src/lib/db/schema";

const MIGRACIONES = path.resolve(__dirname, "../../../drizzle");

export async function crearBaseDePrueba({ conAuth = true }: { conAuth?: boolean } = {}) {
  const client = new PGlite();
  const db = drizzle(client, { schema });

  if (conAuth) {
    await client.exec(`
      create role supabase_auth_admin;
      create role anon;
      create role authenticated;
      alter default privileges in schema public grant execute on functions to anon, authenticated;
      create schema auth authorization supabase_auth_admin;
      create table auth.users (id uuid primary key, email text);
      alter table auth.users owner to supabase_auth_admin;
    `);
  }

  await migrate(db, { migrationsFolder: MIGRACIONES });
  return { client, db };
}
