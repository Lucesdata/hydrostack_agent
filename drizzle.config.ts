import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// El repo usa .env.local (convención Next); que drizzle-kit lea el mismo
// archivo que los scripts (scripts/_env.ts) y la app, no .env por defecto.
config({ path: ".env.local" });

/**
 * Las migraciones NO van por el modo transacción del pooler.
 *
 * `DATABASE_URL` apunta al pooler de Supabase, y tras el incidente del
 * 2026-09-22 (`PENDIENTES.md` §40) pasa a usar el puerto 6543, el modo
 * transacción: no reserva una conexión por instancia, que es lo que una
 * aplicación serverless necesita. Pero ese modo no da estado de sesión, y hay
 * DDL que lo exige — `CREATE INDEX CONCURRENTLY` no puede correr dentro de una
 * transacción, y los locks de aviso no sobreviven entre sentencias.
 *
 * Por eso drizzle-kit prefiere `DATABASE_URL_SESSION` (puerto 5432) cuando
 * existe. Si no está definida, cae en `DATABASE_URL` y todo sigue como antes:
 * nada se rompe por no declararla, solo se pierde la garantía.
 */
const urlMigraciones = process.env.DATABASE_URL_SESSION ?? process.env.DATABASE_URL!;

export default defineConfig({
  schema: "./src/lib/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: urlMigraciones,
  },
});
