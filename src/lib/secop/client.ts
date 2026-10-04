/**
 * Cliente SODA (Socrata) para SECOP.
 *
 * Se ejecuta SIEMPRE en servidor para no exponer el app token y poder
 * cachear. Lo usan las cifras de la portada (`landingStats.ts`); la búsqueda
 * en vivo contra Socrata salió el 2026-10-04 con `GET /api/secop`, su único
 * consumidor: la vitrina lee de Postgres.
 *
 * App token opcional → sube el rate limit. Ponlo en .env.local:
 *   SECOP_APP_TOKEN=xxxxxxxxxxxxx
 */

import { SOCRATA_DOMAIN, FIELDS_PROCESOS, KEYWORDS_AGUA, REVALIDATE_SEARCH } from "./config";

const F = FIELDS_PROCESOS;

/** Escapa comillas simples para SoQL (evita romper el $where). */
function soqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}

/** Construye la cláusula $where del sector agua (OR de palabras clave). */
export function buildAguaWhere(): string {
  // upper(...) like '%PALABRA%' es case-insensitive y portable en SoQL.
  const clauses = KEYWORDS_AGUA.map((kw) => {
    const k = soqlEscape(kw.toUpperCase());
    return `(upper(${F.nombre}) like '%${k}%' OR upper(${F.descripcion}) like '%${k}%')`;
  });
  return `(${clauses.join(" OR ")})`;
}

interface SodaParams {
  $select?: string;
  $where?: string;
  $q?: string;
  $order?: string;
  $limit: number;
  $offset: number;
}

export async function sodaFetch<T>(
  dataset: string,
  params: SodaParams,
  opts: { signal?: AbortSignal; revalidate?: number } = {}
): Promise<T[]> {
  const url = new URL(`${SOCRATA_DOMAIN}/resource/${dataset}.json`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  });

  const headers: Record<string, string> = { Accept: "application/json" };
  if (process.env.SECOP_APP_TOKEN) {
    headers["X-App-Token"] = process.env.SECOP_APP_TOKEN;
  }

  const res = await fetch(url.toString(), {
    headers,
    signal: opts.signal,
    // Cache de Next: revalida según el llamador (ver REVALIDATE_* en config.ts).
    next: { revalidate: opts.revalidate ?? REVALIDATE_SEARCH },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`SECOP/Socrata ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json() as Promise<T[]>;
}
