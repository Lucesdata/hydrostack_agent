import { drizzle as drizzleNeon, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "./schema";

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
  _aqualicitaPool?: MinimalPool;
  _aqualicitaDb?: NeonDatabase<typeof schema>;
};

/**
 * Tope de conexiones por instancia en el camino `pg` (producción en Supabase).
 * Sin `max`, `pg` abre hasta 10 por instancia; con varias instancias de la
 * función a la vez agotan el pool del pooler de Supabase (plan Free) y todo
 * falla con `ECHECKOUTTIMEOUT`. Configurable con `DB_POOL_MAX`.
 */
export function topePool(valor = process.env.DB_POOL_MAX): number {
  const n = Number(valor);
  return Number.isInteger(n) && n >= 1 && n <= 10 ? n : 3;
}

function build(): { db: NeonDatabase<typeof schema>; pool: MinimalPool } {
  if (process.env.DB_DRIVER === "node") {
    // Driver local node-postgres. Import perezoso: solo se carga si se pide,
    // así el bundle de producción (Neon) no arrastra `pg`.
    const { Pool: PgPool } = require("pg");
    const { drizzle: drizzleNode } = require("drizzle-orm/node-postgres");
    const pool: MinimalPool = new PgPool({
      connectionString: process.env.DATABASE_URL,
      keepAlive: true,
      max: topePool(),
      // Soltar rápido las conexiones ociosas: en modo transacción no hay
      // sesión que conservar y cada una cuenta contra el pooler.
      idleTimeoutMillis: 10_000,
    });
    const db = drizzleNode(pool, { schema }) as unknown as NeonDatabase<typeof schema>;
    return { db, pool };
  }

  neonConfig.webSocketConstructor = ws;
  const pool = new NeonPool({ connectionString: process.env.DATABASE_URL, keepAlive: true });
  const db = drizzleNeon(pool, { schema });
  return { db, pool };
}

const built =
  globalForDb._aqualicitaDb && globalForDb._aqualicitaPool
    ? { db: globalForDb._aqualicitaDb, pool: globalForDb._aqualicitaPool }
    : build();

if (process.env.NODE_ENV !== "production") {
  globalForDb._aqualicitaPool = built.pool;
  globalForDb._aqualicitaDb = built.db;
}

export const db = built.db;
export const pool = built.pool;
export { schema };
