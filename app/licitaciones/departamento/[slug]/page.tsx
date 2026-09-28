import { notFound } from "next/navigation";
import PaginaFaceta from "@/src/components/secop/lista/PaginaFaceta";
import { procesosDeFaceta, resolverFaceta } from "@/src/lib/secop/facetas";
import { metadataDeFaceta } from "@/src/lib/secop/faceta-metadata";

/**
 * Ruta facetada por departamento — pública e indexable.
 *
 * NO lee `searchParams`. Leerlo marcaría la ruta como dinámica y cada visita
 * sería una invocación de función: en el plan Hobby eso es lo que se paga. Sin
 * él, Next la prerenderiza y la sirve de caché. La paginación vive en el camino (`/pagina/2`), que además es lo que
 * un buscador sabe recorrer — una query string no siempre se indexa.
 */
/**
 * Revalidación cada 6 horas. `vercel.json` programa `/api/cron/tick`
 * diariamente a las 11:00 UTC; la caché de esta faceta puede tardar hasta
 * seis horas adicionales en reflejar una ingesta correcta.
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
 * la deja cacheada, y `revalidate` la refresca cada 6 horas. El coste se paga
 * una vez por faceta y por ventana, no una vez por visitante.
 */
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const faceta = await resolverFaceta("departamento", slug);
  if (!faceta) return { title: "No encontrado" };
  // El departamento trae su cifra de abiertos al resolverse: sin consulta extra.
  return metadataDeFaceta(faceta);
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const faceta = await resolverFaceta("departamento", slug);
  if (!faceta) notFound();
  return <PaginaFaceta faceta={faceta} pagina={await procesosDeFaceta(faceta, 1)} />;
}
