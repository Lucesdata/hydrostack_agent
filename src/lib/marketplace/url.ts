/**
 * La URL de `/marketplace`: la misma query que la vitrina (`filtros-vitrina.ts`),
 * así que el estado confirmado vive en la URL y Atrás/Adelante/recarga lo
 * reconstruyen. Puro.
 */

import { queryDeFiltros, SIN_FILTROS, type FiltrosVitrina } from "../secop/filtros-vitrina";

export const RUTA_MARKETPLACE = "/marketplace";

/** El marketplace no usa el filtro de etapa: ese universo no son oportunidades. */
export function sinEtapa(f: FiltrosVitrina): FiltrosVitrina {
  return { ...f, etapa: null };
}

export function hrefMarketplace(f: FiltrosVitrina = SIN_FILTROS, pagina = 1): string {
  return `${RUTA_MARKETPLACE}${queryDeFiltros(sinEtapa(f), pagina)}`;
}

/** Cambiar un filtro vuelve a la página uno (SPEC §5). */
export function conTipo(f: FiltrosVitrina, tipo: FiltrosVitrina["tipo"]): FiltrosVitrina {
  return { ...f, tipo };
}

/** Elegir o quitar territorio conserva texto y familia. */
export function conDepartamento(f: FiltrosVitrina, slug: string | null): FiltrosVitrina {
  return { ...f, departamento: slug };
}

/** «Ver todas las oportunidades»: la vitrina con los mismos filtros. */
export function hrefVitrina(f: FiltrosVitrina): string {
  return `/licitaciones${queryDeFiltros(sinEtapa(f))}`;
}

/** Ids de SECOP II (`CO1.REQ.123`, `CO1.NTC.456`, `CO1.BDOS.789`). */
const ID_SECOP = /^CO1\.[A-Z]+\.\d+$/i;

/**
 * Quien pega un número de proceso en el buscador principal espera encontrarlo:
 * si el texto es un id de SECOP II, se busca como número (que además alcanza a
 * los cerrados). El campo explícito de filtros avanzados cubre las referencias
 * propias de cada entidad.
 */
export function normalizarBusqueda(f: FiltrosVitrina): FiltrosVitrina {
  if (!f.numero && f.q && ID_SECOP.test(f.q.trim())) return { ...f, q: null, numero: f.q.trim() };
  return f;
}

/** ¿Algún parámetro llegó vacío? El formulario GET los manda; la URL canónica no. */
export function traeParametrosVacios(
  sp: Record<string, string | string[] | undefined>
): boolean {
  return Object.values(sp).some((v) => (Array.isArray(v) ? v[0] : v)?.trim() === "");
}
