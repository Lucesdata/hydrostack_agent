/**
 * Cliente SODA (Socrata) para SECOP.
 *
 * Se ejecuta SIEMPRE en servidor (route handler / agent tool) para:
 *   - evitar CORS,
 *   - ocultar el app token,
 *   - poder cachear.
 *
 * App token opcional → sube el rate limit. Ponlo en .env.local:
 *   SECOP_APP_TOKEN=xxxxxxxxxxxxx
 */

import {
  SOCRATA_DOMAIN,
  DATASETS,
  FIELDS_PROCESOS,
  FIELDS_CONTRATOS,
  KEYWORDS_AGUA,
  PAGE_SIZE_DEFAULT,
  PAGE_SIZE_MAX,
} from "./config";
import type {
  SecopProceso,
  SecopContrato,
  SecopQuery,
  SecopResult,
} from "./types";

const F = FIELDS_PROCESOS;

/** Escapa comillas simples para SoQL (evita romper el $where). */
function soqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** El campo URL de Socrata a veces es objeto { url }, a veces string. */
function extractUrl(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null && "url" in v) {
    return (v as { url?: string }).url ?? null;
  }
  return null;
}

/** Construye la cláusula $where del sector agua (OR de palabras clave). */
function buildAguaWhere(): string {
  // upper(...) like '%PALABRA%' es case-insensitive y portable en SoQL.
  const clauses = KEYWORDS_AGUA.map((kw) => {
    const k = soqlEscape(kw.toUpperCase());
    return `(upper(${F.nombre}) like '%${k}%' OR upper(${F.descripcion}) like '%${k}%')`;
  });
  return `(${clauses.join(" OR ")})`;
}

/** Une condiciones $where con AND, ignorando vacías. */
function andWhere(...parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(" AND ");
}

interface SodaParams {
  $where?: string;
  $q?: string;
  $order?: string;
  $limit: number;
  $offset: number;
}

async function sodaFetch<T>(
  dataset: string,
  params: SodaParams,
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
    // Cache de Next: revalida cada 30 min. Ajusta a gusto.
    next: { revalidate: 1800 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`SECOP/Socrata ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json() as Promise<T[]>;
}

/** Normaliza una fila cruda de PROCESOS al tipo limpio. */
function normalizeProceso(row: Record<string, unknown>): SecopProceso {
  return {
    id: String(row[F.id] ?? ""),
    referencia: String(row[F.referencia] ?? ""),
    nombre: String(row[F.nombre] ?? ""),
    descripcion: String(row[F.descripcion] ?? ""),
    entidad: String(row[F.entidad] ?? ""),
    departamento: String(row[F.departamento] ?? ""),
    ciudad: String(row[F.ciudad] ?? ""),
    estado: String(row[F.estado] ?? ""),
    fase: String(row[F.fase] ?? ""),
    modalidad: String(row[F.modalidad] ?? ""),
    tipoContrato: String(row[F.tipoContrato] ?? ""),
    fechaPublicacion: (row[F.fechaPublicacion] as string) ?? null,
    precioBase: toNumber(row[F.precioBase]),
    adjudicado: String(row[F.adjudicado] ?? "").toLowerCase() === "si",
    valorAdjudicacion: toNumber(row[F.valorAdjudicacion]),
    adjudicatario: (row[F.adjudicatario] as string) ?? null,
    unspsc: (row[F.unspsc] as string) ?? null,
    url: extractUrl(row[F.url]),
  };
}

/**
 * Busca PROCESOS de contratación (licitaciones).
 * Punto de entrada principal de la feature.
 */
export async function searchProcesos(
  query: SecopQuery = {},
): Promise<SecopResult<SecopProceso>> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(query.pageSize ?? PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX);

  const where = andWhere(
    query.soloAgua !== false ? buildAguaWhere() : null, // por defecto, solo agua
    query.departamento
      ? `upper(${F.departamento}) = '${soqlEscape(query.departamento.toUpperCase())}'`
      : null,
    query.estado ? `${F.estado} = '${soqlEscape(query.estado)}'` : null,
    query.valorMin != null ? `${F.precioBase} >= ${query.valorMin}` : null,
    query.desde ? `${F.fechaPublicacion} >= '${soqlEscape(query.desde)}'` : null,
  );

  const rows = await sodaFetch<Record<string, unknown>>(DATASETS.procesos, {
    $where: where || undefined,
    $q: query.q ? soqlEscape(query.q) : undefined,
    $order: `${F.fechaPublicacion} DESC`,
    $limit: pageSize,
    $offset: (page - 1) * pageSize,
  });

  return { items: rows.map(normalizeProceso), page, pageSize };
}

/** Normaliza una fila cruda de CONTRATOS al tipo limpio. */
function normalizeContrato(row: Record<string, unknown>): SecopContrato {
  const C = FIELDS_CONTRATOS;
  return {
    id: String(row[C.id] ?? ""),
    referencia: String(row[C.referencia] ?? ""),
    objeto: String(row[C.objeto] ?? ""),
    entidad: String(row[C.entidad] ?? ""),
    departamento: String(row[C.departamento] ?? ""),
    ciudad: String(row[C.ciudad] ?? ""),
    estado: String(row[C.estado] ?? ""),
    proveedor: (row[C.proveedor] as string) ?? null,
    fechaFirma: (row[C.fechaFirma] as string) ?? null,
    valor: toNumber(row[C.valor]),
    unspsc: (row[C.unspsc] as string) ?? null,
    url: extractUrl(row[C.url]),
  };
}

/** Busca CONTRATOS ya formalizados del sector agua. */
export async function searchContratos(
  query: SecopQuery = {},
): Promise<SecopResult<SecopContrato>> {
  const C = FIELDS_CONTRATOS;
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(query.pageSize ?? PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX);

  const aguaWhere =
    query.soloAgua !== false
      ? `(${KEYWORDS_AGUA.map(
          (kw) => `upper(${C.objeto}) like '%${soqlEscape(kw.toUpperCase())}%'`,
        ).join(" OR ")})`
      : null;

  const where = andWhere(
    aguaWhere,
    query.departamento
      ? `upper(${C.departamento}) = '${soqlEscape(query.departamento.toUpperCase())}'`
      : null,
    query.valorMin != null ? `${C.valor} >= ${query.valorMin}` : null,
  );

  const rows = await sodaFetch<Record<string, unknown>>(DATASETS.contratos, {
    $where: where || undefined,
    $q: query.q ? soqlEscape(query.q) : undefined,
    $limit: pageSize,
    $offset: (page - 1) * pageSize,
  });

  return { items: rows.map(normalizeContrato), page, pageSize };
}
