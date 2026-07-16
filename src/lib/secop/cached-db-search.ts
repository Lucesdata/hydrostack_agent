/**
 * Memoización en memoria de `searchProcesosDb`/`countProcesosDb`, por
 * combinación de filtros — Fase 3.
 *
 * El filtro "solo sector agua" hace ILIKE sobre texto extraído de JSON crudo
 * (clasificacion_sectorial aún vacía — ver db-search.ts) y escanea sin
 * índice: caro en Postgres (~10s medido en dev sin caché). `unstable_cache`
 * de Next no sirve aquí — revienta fuera del contexto de request de Next,
 * incluyendo tests.
 *
 * Los Map viven en `globalThis` (mismo truco que el pool singleton de
 * `db/client.ts`): en dev, Next.js reevalúa el módulo en cada HMR/recarga, así
 * que un Map de módulo normal se reinicia todo el tiempo y nunca cachea nada.
 * En prod sobrevive entre invocaciones calientes; se degrada solo (recalcula)
 * si la instancia es fría.
 *
 * `resetSecopSearchCache()` existe SOLO para tests: limpia el estado entre
 * casos que reusan la misma query (mismo cache key).
 */

import { searchProcesosDb, countProcesosDb } from './db-search';
import { REVALIDATE_SEARCH, REVALIDATE_COUNT } from './config';
import type { SecopProceso, SecopQuery, SecopResult } from './types';

interface CacheEntry<R> {
  value: R;
  expires: number;
}

function memoize<A, R>(fn: (arg: A) => Promise<R>, ttlMs: number, store: Map<string, CacheEntry<R>>) {
  const memoized = (arg: A): Promise<R> => {
    const key = JSON.stringify(arg);
    const hit = store.get(key);
    if (hit && hit.expires > Date.now()) return Promise.resolve(hit.value);
    return fn(arg).then((value) => {
      store.set(key, { value, expires: Date.now() + ttlMs });
      return value;
    });
  };
  memoized.clear = () => store.clear();
  return memoized;
}

const globalForCache = globalThis as unknown as {
  _secopSearchCache?: Map<string, CacheEntry<SecopResult<SecopProceso>>>;
  _secopCountCache?: Map<string, CacheEntry<number>>;
};

const searchStore = globalForCache._secopSearchCache ?? new Map<string, CacheEntry<SecopResult<SecopProceso>>>();
const countStore = globalForCache._secopCountCache ?? new Map<string, CacheEntry<number>>();
if (process.env.NODE_ENV !== 'production') {
  globalForCache._secopSearchCache = searchStore;
  globalForCache._secopCountCache = countStore;
}

const cachedSearch = memoize(searchProcesosDb, REVALIDATE_SEARCH * 1000, searchStore);
const cachedCount = memoize(countProcesosDb, REVALIDATE_COUNT * 1000, countStore);

export function searchProcesosDbCached(query: SecopQuery): Promise<SecopResult<SecopProceso>> {
  return cachedSearch(query);
}

export function countProcesosDbCached(query: SecopQuery): Promise<number> {
  return cachedCount(query);
}

/** Solo para tests. */
export function resetSecopSearchCache(): void {
  cachedSearch.clear();
  cachedCount.clear();
}
