import { permanentRedirect } from "next/navigation";
import { desdeExplorar, queryDeFiltros } from "@/src/lib/secop/filtros-vitrina";

/**
 * `/licitaciones/explorar` fue el explorador avanzado y, después, el explorador
 * del buscador guiado (#109). Desde el 2026-10-05 la vitrina es el único
 * buscador: esta ruta traduce los parámetros viejos (`sistema`, `actividad`,
 * `numero`, `q`, `departamento`, `valorMin`, `orden`) a los de la vitrina y
 * redirige con un 308, para que los enlaces guardados sigan llevando a la misma
 * búsqueda. No es un `redirects()` de `next.config.js` porque los parámetros
 * cambian de nombre y de forma.
 */
export const dynamic = "force-dynamic";

export default async function ExplorarLicitacionesPage({ searchParams }) {
  const filtros = desdeExplorar((await searchParams) ?? {});
  permanentRedirect(`/licitaciones${queryDeFiltros(filtros)}`);
}
