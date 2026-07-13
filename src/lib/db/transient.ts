/**
 * Reintento ante errores TRANSITORIOS de conexión a la base.
 *
 * El driver `@neondatabase/serverless` (WebSocket) puede perder la conexión a
 * mitad de una corrida larga ("Connection terminated unexpectedly"): el proxy
 * de Neon recicla conexiones, la red parpadea, o el compute se reinicia. Ese
 * error NO trae `code` de Postgres — es de la capa de transporte — y el pool
 * entrega una conexión fresca en el siguiente intento, así que reintentar la
 * operación es la recuperación correcta SIEMPRE que la operación sea
 * idempotente (upserts por clave natural, SELECTs, rebuilds transaccionales).
 *
 * NO reintenta errores SQL reales (constraint, columna inexistente, statement
 * timeout): esos fallan igual en el reintento y deben subir al fail-fast.
 */

/** Códigos de red de Node + clase 08 (connection exception) + shutdown 57P0x. */
const TRANSIENT_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'EPIPE',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETUNREACH',
  '08000',
  '08001',
  '08003',
  '08006',
  '08P01',
  '57P01', // admin_shutdown
  '57P02', // crash_shutdown
  '57P03', // cannot_connect_now
]);

/** Mensajes de la capa de transporte (driver Neon / node-postgres / ws). */
const TRANSIENT_MESSAGE =
  /connection terminated|connection ended|connection closed|socket hang up|websocket/i;

const MAX_CAUSE_DEPTH = 5;

/**
 * `true` si el error (o alguna de sus causas — Drizzle envuelve el error del
 * driver en DrizzleQueryError con `cause`) es un corte transitorio de conexión.
 */
export function isTransientConnectionError(err: unknown): boolean {
  let current: unknown = err;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current instanceof Error; depth++) {
    const code = (current as Error & { code?: unknown }).code;
    if (typeof code === 'string' && TRANSIENT_CODES.has(code)) return true;
    // Un código presente que NO es transitorio (p. ej. 23505, 57014) manda: es
    // un error SQL real aunque el mensaje contenga palabras de conexión.
    if (typeof code === 'string' && code.length > 0) return false;
    if (TRANSIENT_MESSAGE.test(current.message)) return true;
    current = current.cause;
  }
  return false;
}

export interface RetryOptions {
  /** Reintentos ADICIONALES al primer intento. */
  retries?: number;
  baseDelayMs?: number;
  /** Inyectable para tests. */
  sleep?: (ms: number) => Promise<void>;
  /** Aviso por intento fallido (logging del llamador). */
  onRetry?: (err: unknown, attempt: number) => void;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Ejecuta `fn` reintentando SOLO cortes transitorios de conexión, con backoff
 * exponencial. Cualquier otro error sube de inmediato. La operación debe ser
 * idempotente: un corte puede ocurrir DESPUÉS de que el servidor aplicó el
 * cambio, y el reintento la re-ejecuta.
 */
export async function withTransientRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const retries = opts.retries ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  const sleep = opts.sleep ?? defaultSleep;

  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || !isTransientConnectionError(err)) throw err;
      opts.onRetry?.(err, attempt + 1);
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }
}
