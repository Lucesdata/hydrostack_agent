/**
 * Cliente delgado de exploración para la API SODA/Socrata de datos.gov.co.
 *
 * Solo lectura. Sin DB, sin cache de framework, sin normalización de dominio.
 * Pensado para correr a mano desde CLI (sub-fase 0.2) y volcar muestras a disco.
 * El conector de producción vive en src/lib/secop/ — esto no lo reemplaza.
 *
 * App token opcional vía env var:
 *   SOCRATA_APP_TOKEN  (preferido, por convención SODA)
 *   SECOP_APP_TOKEN    (fallback: alias usado por el resto del repo)
 *
 * Sin app token funciona, con rate limit más bajo.
 */

const DOMAIN = "https://www.datos.gov.co";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 4;
const BASE_BACKOFF_MS = 600;

function getAppToken() {
  return process.env.SOCRATA_APP_TOKEN || process.env.SECOP_APP_TOKEN || null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Construye la URL SODA con los params SoQL en un orden estable. */
function buildUrl(dataset, params) {
  const url = new URL(`${DOMAIN}/resource/${dataset}.json`);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  return url;
}

/**
 * Fetch con timeout, retry/backoff exponencial en 429/5xx y errores de red.
 * Devuelve filas como objetos crudos (sin tipar). Socrata omite las claves nulas.
 */
async function fetchOnce(url, { timeoutMs }) {
  const headers = { Accept: "application/json" };
  const token = getAppToken();
  if (token) headers["X-App-Token"] = token;

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: ctl.signal });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const err = new Error(`SODA ${res.status}: ${body.slice(0, 300)}`);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(url, { timeoutMs, maxRetries }) {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchOnce(url, { timeoutMs });
    } catch (err) {
      lastErr = err;
      const status = err.status;
      const retriable =
        status === 429 ||
        status === 503 ||
        status === 502 ||
        status === 504 ||
        err.name === "AbortError" ||
        err.code === "ECONNRESET" ||
        err.code === "ETIMEDOUT";
      if (!retriable || attempt === maxRetries) throw err;
      const backoff = BASE_BACKOFF_MS * 2 ** attempt + Math.floor(Math.random() * 200);
      process.stderr.write(
        `[socrata] reintento ${attempt + 1}/${maxRetries} en ${backoff}ms (status=${status ?? err.code ?? err.name})\n`,
      );
      await sleep(backoff);
    }
  }
  throw lastErr;
}

/**
 * Una página SODA cruda. Tope SODA: 50.000 filas.
 *
 * params: { $where?, $select?, $order?, $limit, $offset, $q? }
 */
export async function fetchPage(dataset, params, opts = {}) {
  const url = buildUrl(dataset, params);
  return fetchWithRetry(url, {
    timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxRetries: opts.maxRetries ?? DEFAULT_MAX_RETRIES,
  });
}

/**
 * Pagina con $limit/$offset hasta `cap` filas, ordenando por `order` (estable).
 * Usa offset por simplicidad de exploración — no es el patrón de producción
 * (producción usa keyset con watermark, ver 0.2-spec-ingesta §6).
 */
export async function paginate(dataset, { where, select, order, pageSize = 1000, cap = 1000 }, opts = {}) {
  if (!order) throw new Error("paginate: 'order' es obligatorio para que la paginación sea estable");
  const rows = [];
  let offset = 0;
  while (rows.length < cap) {
    const limit = Math.min(pageSize, cap - rows.length);
    const page = await fetchPage(
      dataset,
      { $where: where, $select: select, $order: order, $limit: limit, $offset: offset },
      opts,
    );
    if (!Array.isArray(page) || page.length === 0) break;
    rows.push(...page);
    if (page.length < limit) break;
    offset += page.length;
  }
  return rows;
}

/**
 * Metadatos de columnas del dataset (incluye campos que pueden venir nulos en
 * filas individuales — Socrata omite las claves nulas por fila).
 *   GET /api/views/{id}/columns.json
 */
export async function fetchColumns(dataset, opts = {}) {
  const url = new URL(`${DOMAIN}/api/views/${dataset}/columns.json`);
  return fetchWithRetry(url, {
    timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxRetries: opts.maxRetries ?? DEFAULT_MAX_RETRIES,
  });
}

export const SOCRATA_DOMAIN = DOMAIN;
