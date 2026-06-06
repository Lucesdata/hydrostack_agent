import {
  drizzle as drizzleNeon,
  type NeonDatabase,
} from 'drizzle-orm/neon-serverless';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from './schema';

/**
 * Cliente de base. Por defecto usa `@neondatabase/serverless` (WebSocket —
 * soporta transacciones, necesarias para la detección de eventos: actualizar la
 * foto + append a contrato_evento atómico).
 *
 * Camino offline (0.3 §1): con `DB_DRIVER=node` usa `pg` (node-postgres) contra
 * un Postgres local/TCP, sin tocar el esquema. Pensado para correr migraciones,
 * seed y transform sin una branch de Neon. Mismo query builder de Drizzle en
 * ambos casos, así que el resto del código no cambia.
 */

interface MinimalPool {
  end(): Promise<void>;
}

// Singleton en dev para no agotar conexiones en cada recarga de HMR.
const globalForDb = globalThis as unknown as {
  _hydrostackPool?: MinimalPool;
  _hydrostackDb?: NeonDatabase<typeof schema>;
};

function build(): { db: NeonDatabase<typeof schema>; pool: MinimalPool } {
  if (process.env.DB_DRIVER === 'node') {
    // Driver local node-postgres. Import perezoso: solo se carga si se pide,
    // así el bundle de producción (Neon) no arrastra `pg`.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool: PgPool } = require('pg');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle: drizzleNode } = require('drizzle-orm/node-postgres');
    const pool: MinimalPool = new PgPool({ connectionString: process.env.DATABASE_URL });
    const db = drizzleNode(pool, { schema }) as unknown as NeonDatabase<typeof schema>;
    return { db, pool };
  }

  neonConfig.webSocketConstructor = ws;
  const pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
  const db = drizzleNeon(pool, { schema });
  return { db, pool };
}

const built =
  globalForDb._hydrostackDb && globalForDb._hydrostackPool
    ? { db: globalForDb._hydrostackDb, pool: globalForDb._hydrostackPool }
    : build();

if (process.env.NODE_ENV !== 'production') {
  globalForDb._hydrostackPool = built.pool;
  globalForDb._hydrostackDb = built.db;
}

export const db = built.db;
export const pool = built.pool;
export { schema };
