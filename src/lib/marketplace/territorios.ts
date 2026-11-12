/**
 * Lo que el selector de territorio necesita: los 33 departamentos con su slug,
 * su conteo en la consulta actual y el destino de cada uno. Puro.
 */

import { DEPARTAMENTOS_DANE } from "./adaptador";
import type { FiltrosVitrina } from "../secop/filtros-vitrina";
import type { Region } from "./tipos";
import { conDepartamento, hrefMarketplace } from "./url";

export interface OpcionTerritorio {
  codigo: string;
  nombre: string;
  slug: string;
  total: number;
}

/**
 * Todos los departamentos, también los que hoy no tienen resultados: una región
 * válida sin coincidencias se puede elegir y muestra cero. Con los datos de la
 * base cuando los hay (su nombre y su slug son los de las facetas del sitio).
 */
export function opcionesTerritorio(regiones: Region[]): OpcionTerritorio[] {
  const porCodigo = new Map(regiones.map((r) => [r.codigo, r]));
  const catalogo = new Set(DEPARTAMENTOS_DANE.map((d) => d.codigo));
  const base = DEPARTAMENTOS_DANE.map((d) => {
    const r = porCodigo.get(d.codigo);
    return {
      codigo: d.codigo,
      nombre: r?.nombre ?? d.nombre,
      slug: r?.slug ?? d.slug,
      total: r?.total ?? 0,
    };
  });
  // Un código de la base que el catálogo DANE no conoce no se pierde.
  for (const r of regiones) {
    if (!catalogo.has(r.codigo)) base.push({ codigo: r.codigo, nombre: r.nombre, slug: r.slug, total: r.total });
  }
  return base.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

/** Código DIVIPOLA → `/marketplace` con ese departamento y los demás filtros. */
export function destinosPorCodigo(
  opciones: OpcionTerritorio[],
  filtros: FiltrosVitrina
): Record<string, string> {
  return Object.fromEntries(
    opciones.map((o) => [o.codigo, hrefMarketplace(conDepartamento(filtros, o.slug))])
  );
}
