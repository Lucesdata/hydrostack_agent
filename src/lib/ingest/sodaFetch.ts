/**
 * Adaptador de red: una página SODA cruda.
 *
 * A diferencia del cliente de consulta (lib/secop/client.ts), aquí NO
 * normalizamos ni recortamos los VALORES: la ingesta aterriza el registro tal
 * cual (ELT) y sin caché (queremos el snapshot fresco, no uno revalidado de
 * Next). Lo que sí se recorta desde 2026-09-12 son las COLUMNAS: `$select`
 * (derivado en ingest/campos.ts) pide solo los campos que el transform
 * consume, no los 61 del dataset — antes no se mandaba y llegaban todos. El
 * app token sube el rate limit del backfill/incremental (0.2 §1).
 */

import { SOCRATA_DOMAIN } from "@/src/lib/secop/config";
import type { SodaPageParams } from "./pagination";

export async function sodaFetchPage(
  dataset: string,
  params: SodaPageParams
): Promise<Record<string, unknown>[]> {
  const url = new URL(`${SOCRATA_DOMAIN}/resource/${dataset}.json`);
  url.searchParams.set("$order", params.$order);
  url.searchParams.set("$limit", String(params.$limit));
  if (params.$where) url.searchParams.set("$where", params.$where);
  if (params.$select) url.searchParams.set("$select", params.$select);

  const headers: Record<string, string> = { Accept: "application/json" };
  if (process.env.SECOP_APP_TOKEN) {
    headers["X-App-Token"] = process.env.SECOP_APP_TOKEN;
  }

  const res = await fetch(url.toString(), { headers, cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`SODA ${dataset} ${res.status}: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as Record<string, unknown>[];
}
