import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// El repo usa .env.local (convención Next); que drizzle-kit lea el mismo
// archivo que los scripts (scripts/_env.ts) y la app, no .env por defecto.
config({ path: '.env.local' });

export default defineConfig({
  schema: './src/lib/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
