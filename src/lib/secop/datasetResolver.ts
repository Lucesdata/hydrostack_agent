/**
 * Resolución dinámica del id de dataset Socrata (PLAN §4 / §9.2).
 *
 * Los datasets SECOP II pueden re-publicarse por vigencia fiscal con un nuevo id
 * 4x4 (p. ej. `p6dx-8zbt`), pero su NOMBRE en el catálogo es estable. Por eso la
 * fuente de verdad es el catálogo: se busca por nombre y se toma el id vigente.
 * El id hardcodeado en `config.DATASETS` queda SOLO como red de emergencia.
 *
 * Garantía: `resolveDatasetId` nunca lanza ni detiene la ingesta. Ante cualquier
 * fallo (red caída, sin match, id con formato inválido) cae al fallback y avisa
 * con un warning. Si el id resuelto difiere del fallback, también avisa: es la
 * señal de que el id rotó y conviene actualizar `config.DATASETS`.
 *
 * Dos capas, como el resto de la ingesta:
 *   · núcleo PURO (`pickDatasetId`): elige el id desde una lista de resultados.
 *   · IO (`resolveDatasetId`): consulta el catálogo (fetch inyectable) y memoiza.
 */

import {
  DATASETS,
  DATASET_NAMES,
  SOCRATA_CATALOG_DOMAIN,
  type DatasetKey,
} from './config';

/** Discovery API del catálogo Socrata (cross-domain, host fijo de Socrata). */
const CATALOG_URL = 'https://api.us.socrata.com/api/catalog/v1';

/** Formato canónico de un id de recurso Socrata: `xxxx-xxxx`. */
const FOUR_BY_FOUR = /^[a-z0-9]{4}-[a-z0-9]{4}$/;

/** TTL del memo: el cron diario resuelve 1 vez; la UI no golpea el catálogo en
 *  cada query. 6h equilibra frescura ante una rotación y evitar tráfico inútil. */
const TTL_MS = 6 * 60 * 60 * 1000;

/** Forma mínima de un resultado del catálogo que nos interesa. */
export interface CatalogResult {
  resource?: { id?: string; name?: string };
}

interface Descriptor {
  name: string;
  fallbackId: string;
}

const DESCRIPTORS: Record<DatasetKey, Descriptor> = {
  procesos: { name: DATASET_NAMES.procesos, fallbackId: DATASETS.procesos },
  contratos: { name: DATASET_NAMES.contratos, fallbackId: DATASETS.contratos },
};

/**
 * Núcleo puro: del listado del catálogo, elige el id del recurso cuyo `name`
 * coincide EXACTO con el descriptor y cuyo id tiene formato 4x4 válido. Si no
 * hay match válido, devuelve el fallback con `resolved=false`.
 */
export function pickDatasetId(
  results: CatalogResult[],
  descriptor: Descriptor,
): { id: string; resolved: boolean } {
  const match = results.find(
    (r) => r.resource?.name === descriptor.name && FOUR_BY_FOUR.test(r.resource?.id ?? ''),
  );
  if (match?.resource?.id) return { id: match.resource.id, resolved: true };
  return { id: descriptor.fallbackId, resolved: false };
}

/** Trae los resultados del catálogo para un nombre de dataset. */
export type CatalogFetcher = (name: string) => Promise<CatalogResult[]>;

async function defaultFetchCatalog(name: string): Promise<CatalogResult[]> {
  const url = new URL(CATALOG_URL);
  url.searchParams.set('domains', SOCRATA_CATALOG_DOMAIN);
  url.searchParams.set('q', name);
  url.searchParams.set('only', 'dataset');
  url.searchParams.set('limit', '20');

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (process.env.SECOP_APP_TOKEN) headers['X-App-Token'] = process.env.SECOP_APP_TOKEN;

  const res = await fetch(url.toString(), { headers, cache: 'no-store' });
  if (!res.ok) throw new Error(`catalog ${res.status}`);
  const body = (await res.json()) as { results?: CatalogResult[] };
  return body.results ?? [];
}

interface CacheEntry {
  id: string;
  expiresAt: number;
}

const cache = new Map<DatasetKey, CacheEntry>();

/** Vacía el memo. Solo para tests. */
export function clearDatasetIdCache(): void {
  cache.clear();
}

export interface ResolveDeps {
  fetchCatalog?: CatalogFetcher;
  now?: () => number;
}

/**
 * Devuelve el id 4x4 vigente del dataset. Memoiza el resultado resuelto por TTL.
 * Nunca lanza: ante cualquier problema usa el fallback de `config.DATASETS`.
 */
export async function resolveDatasetId(
  key: DatasetKey,
  deps: ResolveDeps = {},
): Promise<string> {
  const now = deps.now ?? Date.now;
  const fetchCatalog = deps.fetchCatalog ?? defaultFetchCatalog;
  const descriptor = DESCRIPTORS[key];

  const hit = cache.get(key);
  if (hit && hit.expiresAt > now()) return hit.id;

  try {
    const results = await fetchCatalog(descriptor.name);
    const { id, resolved } = pickDatasetId(results, descriptor);
    if (!resolved) {
      // No cacheamos el fallback: queremos reintentar el catálogo en la próxima.
      console.warn(
        `[datasetResolver] ${key}: sin match en catálogo, usando fallback ${descriptor.fallbackId}`,
      );
      return descriptor.fallbackId;
    }
    if (id !== descriptor.fallbackId) {
      console.warn(
        `[datasetResolver] ${key}: el id rotó ${descriptor.fallbackId} → ${id}. ` +
          `Actualiza config.DATASETS.${key}.`,
      );
    }
    cache.set(key, { id, expiresAt: now() + TTL_MS });
    return id;
  } catch (e) {
    console.warn(
      `[datasetResolver] ${key}: catálogo no disponible (${
        e instanceof Error ? e.message : String(e)
      }), usando fallback ${descriptor.fallbackId}`,
    );
    return descriptor.fallbackId;
  }
}
