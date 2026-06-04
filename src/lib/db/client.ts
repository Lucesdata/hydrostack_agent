import { drizzle, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from './schema';

// neon-serverless habla por WebSocket (soporta transacciones, necesarias para la
// detección de eventos: actualizar la foto + append a contrato_evento atómico).
neonConfig.webSocketConstructor = ws;

// Singleton en dev para no agotar conexiones en cada recarga de HMR.
const globalForDb = globalThis as unknown as { _hydrostackPool?: Pool };

const pool =
  globalForDb._hydrostackPool ?? new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== 'production') globalForDb._hydrostackPool = pool;

export const db: NeonDatabase<typeof schema> = drizzle(pool, { schema });
export { pool, schema };
