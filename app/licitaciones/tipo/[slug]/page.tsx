import { notFound } from "next/navigation";
import PaginaFaceta from "@/src/components/secop/lista/PaginaFaceta";
import { procesosDeFaceta, resolverFaceta } from "@/src/lib/secop/facetas";
import { metadataDeFaceta } from "@/src/lib/secop/faceta-metadata";
import { procesosPorTipo } from "@/src/lib/secop/agregados";

/**
 * Ruta facetada por tipo — pública e indexable.
 *
 * NO lee `searchParams`. Leerlo marcaría la ruta como dinámica y cada visita
 * sería una invocación de función: en el plan Hobby eso es lo que se paga. Sin
 * él, Next la prerenderiza y la sirve de caché. La paginación vive en el camino (`/pagina/2`), que además es lo que
 * un buscador sabe recorrer — una query string no siempre se indexa.
 */
/**
 * Revalidación cada 6 horas.
 *
 * No es un número a ojo: manda la cadencia real de la ingesta. Medido el
 * 2026-09-15, los datos NO entran a diario — `vercel.json` tiene `"crons": []`,
 * así que nada dispara `/api/cron/ingest` y alguien la ejecuta a mano: las altas
 * llegan a saltos de dos y tres días. Revalidar cada 30 minutos regeneraba la
 * página 48 veces al día para un dato que cambia cada dos o tres.
 *
 * A 6 horas queda como mucho un cuarto de día por detrás de la ingesta
 * —imperceptible a esa cadencia— y el techo de regeneraciones baja de 48 a 4 por
 * página y día. Si el cron llega a programarse de verdad, este número se puede
 * bajar; mientras tanto, bajarlo solo gasta.
 */
export const revalidate = 21600;

/**
 * Vacío a propósito, y no es un olvido.
 *
 * Devolver la lista de facetas haría que CADA build golpeara la base de
 * producción con 43 páginas en paralelo — se probó y las consultas fallaban
 * contra el pooler. Peor aún: ataría cada despliegue a que la base responda.
 *
 * Con la lista vacía, Next no prerrenderiza nada en build pero la ruta sigue
 * siendo de generación estática: la primera visita a cada faceta la renderiza y
 * la deja cacheada, y `revalidate` la refresca cada 30 minutos. El coste se paga
 * una vez por faceta y por ventana, no una vez por visitante.
 */
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const faceta = await resolverFaceta("tipo", slug);
  if (!faceta) return { title: "No encontrado" };
  // La cifra del tipo es un GROUP BY ligero sobre los abiertos y solo corre al
  // regenerar la página (cada 6 h). Si la base no responde, sale sin cifra.
  let abiertos: number | null = null;
  try {
    abiertos = (await procesosPorTipo()).find((t) => t.slug === faceta.slug)?.n ?? null;
  } catch {
    abiertos = null;
  }
  return metadataDeFaceta({ ...faceta, abiertos });
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const faceta = await resolverFaceta("tipo", slug);
  if (!faceta) notFound();
  return <PaginaFaceta faceta={faceta} pagina={await procesosDeFaceta(faceta, 1)} />;
}
