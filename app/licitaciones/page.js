import Vitrina from "@/src/components/secop/vitrina/Vitrina";
import { procesosDeVitrina } from "@/src/lib/secop/vitrina";
import { filtrosDesdeParams, hayFiltros } from "@/src/lib/secop/filtros-vitrina";
import { procesosPorDepartamento } from "@/src/lib/secop/agregados";
import { detallesDeRadar } from "@/src/lib/secop/radar";
import { hrefDeProceso } from "@/src/components/secop/lista/PaginaFaceta";

/** El panel del Radar es una mejora: si su consulta falla, la vitrina sale sin él. */
function detallesDe(items) {
  return detallesDeRadar(
    items.map((p) => ({ secopProcesoId: p.secopProcesoId, href: hrefDeProceso(p) }))
  ).catch(() => []);
}

const METADATA = {
  title: "Fichas de procesos · agua y saneamiento en SECOP II",
  description:
    "Busca y filtra los procesos de agua y saneamiento publicados en SECOP II: cuantía, zona, plazo y quién puede participar.",
};

/**
 * Una búsqueda filtrada no se indexa: hay infinitas combinaciones y todas
 * competirían con esta página. Las combinaciones que sí merecen índice ya
 * tienen ruta propia (`/licitaciones/tipo/…`, `/licitaciones/departamento/…`).
 */
export async function generateMetadata({ searchParams }) {
  const { filtros, pagina } = filtrosDesdeParams((await searchParams) ?? {});
  if (!hayFiltros(filtros) && pagina === 1) return METADATA;
  return {
    ...METADATA,
    alternates: { canonical: "/licitaciones" },
    robots: { index: false, follow: true },
  };
}

/**
 * Se renderiza en cada petición, no en el build.
 *
 * El plan la quería estática con ISR de 6 h, y no se puede: esta ruta no tiene
 * segmento dinámico, así que Next la prerenderiza al construir, y el build no
 * tiene base de datos. `DATABASE_URL` está marcada como secreta en Vercel y las
 * variables sensibles solo se entregan al runtime, así que el build falla con
 * `TypeError: Invalid URL`. Las rutas facetadas nunca lo sufrieron porque son
 * `[slug]` con `generateStaticParams` vacío: no se construyen, se generan en la
 * primera petición.
 *
 * Tolerar el fallo y construir la página vacía sería peor: con revalidación de
 * 6 h, producción serviría una vitrina vacía hasta seis horas.
 *
 * El coste es una invocación por visita en dos rutas —no en las 43 facetadas ni
 * en las 2.000 fichas—, y a cambio el dato siempre está fresco. Si el tráfico
 * crece, la salida es exponer `DATABASE_URL` al build y volver a ISR.
 */
export const dynamic = "force-dynamic";

/**
 * Desde el 2026-10-04 esta página es también el buscador: «Explorar» y
 * «Descubrir» redirigen aquí (308, `next.config.js`) y sus filtros llegan en la
 * query (`src/lib/secop/filtros-vitrina.ts`).
 *
 * La lista de departamentos alimenta el `<select>` y resuelve el slug a su
 * código. Sin filtro de departamento va en paralelo con la página; con él, va
 * antes. Si falla, la vitrina sale sin ese selector, no rota.
 */
export default async function LicitacionesPage({ searchParams }) {
  const { filtros, pagina } = filtrosDesdeParams((await searchParams) ?? {});
  const departamentosP = procesosPorDepartamento().catch(() => []);

  let datos;
  let departamentos;
  if (filtros.departamento) {
    departamentos = await departamentosP;
    const dep = departamentos.find((d) => d.slug === filtros.departamento);
    datos = await procesosDeVitrina("abiertos", pagina, {
      filtros: dep ? filtros : { ...filtros, departamento: null },
      departamentoCodigo: dep?.clave ?? null,
    });
  } else {
    [datos, departamentos] = await Promise.all([
      procesosDeVitrina("abiertos", pagina, { filtros }),
      departamentosP,
    ]);
  }

  const detalles = await detallesDe(datos.items);

  return (
    <Vitrina
      pagina={datos}
      departamentos={departamentos.map((d) => ({
        slug: d.slug,
        clave: d.clave,
        label: d.label,
        n: d.n,
      }))}
      detalles={detalles}
    />
  );
}
