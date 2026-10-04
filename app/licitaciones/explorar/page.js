import SecopExplorer from "@/src/components/secop/SecopExplorer";
import { createElement } from "react";
import { consultaDesdeParametros } from "@/src/lib/secop/busqueda-navegacion";
import { ConsultaGuiadaInvalida } from "@/src/lib/secop/busqueda-guiada";
import { searchProcesosDbCached, countProcesosDbCached } from "@/src/lib/secop/cached-db-search";

// Solo el explorador lee criterios de URL. La portada y facetas siguen estáticas.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Búsqueda avanzada de licitaciones",
  description:
    "Explorador avanzado de licitaciones y contratos públicos del sector agua y saneamiento básico en Colombia (SECOP II), con filtros y elegibilidad.",
};

export default async function ExplorarLicitacionesPage({ searchParams = {} } = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") params.set(key, value);
    else if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
  }
  let consultaInicial;
  try {
    consultaInicial = consultaDesdeParametros(params);
    if (!consultaInicial.modo) return createElement(SecopExplorer);
    const [result, total] = await Promise.all([
      searchProcesosDbCached(consultaInicial),
      countProcesosDbCached(consultaInicial),
    ]);
    return createElement(SecopExplorer, {
      consultaInicial,
      resultadoInicial: { ...result, total },
    });
  } catch (error) {
    if (!(error instanceof ConsultaGuiadaInvalida))
      console.error("[explorador] No se pudo cargar la búsqueda guiada", error);
    return createElement(SecopExplorer, {
      consultaInicial: consultaInicial ?? {
        modo: "tema",
        apertura: "Abierto",
        page: 1,
        pageSize: 25,
      },
      errorInicial:
        error instanceof ConsultaGuiadaInvalida
          ? error.message
          : "No pudimos cargar los resultados. Inténtalo de nuevo.",
    });
  }
}
