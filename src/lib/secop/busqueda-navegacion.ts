import { parseQuery } from "./parse-query";
import { PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX } from "./config";
import type { SecopQuery } from "./types";

/** Una misma interpretación para servidor, recarga y Atrás. */
export function consultaDesdeParametros(params: URLSearchParams): SecopQuery {
  const query = parseQuery(params);
  if (query.modo === "tema" && !params.has("apertura")) query.apertura = "Abierto";
  return {
    ...query,
    page: query.page ?? 1,
    pageSize: Math.min(query.pageSize ?? PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX),
  };
}

export function parametrosBusqueda(query: SecopQuery): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of [
    "modo",
    "q",
    "sistema",
    "actividad",
    "numero",
    "departamento",
    "estado",
    "valorMin",
    "desde",
    "orden",
    "page",
    "pageSize",
  ] as const) {
    const value = query[key];
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  // La apertura vacía es intencional (todos), distinta del valor por defecto.
  if (query.modo === "tema") params.set("apertura", query.apertura ?? "");
  return params;
}

export function enlaceBusqueda(query: SecopQuery): string {
  return `/licitaciones/explorar?${parametrosBusqueda(query)}`;
}
