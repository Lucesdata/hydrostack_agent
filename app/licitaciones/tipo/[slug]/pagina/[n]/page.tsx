import { notFound } from "next/navigation";
import PaginaFaceta from "@/src/components/secop/lista/PaginaFaceta";
import { procesosDeFaceta, resolverFaceta } from "@/src/lib/secop/facetas";

/**
 * Páginas 2+ de una faceta de tipo.
 *
 * Ruta aparte y no `?pagina=` por dos motivos: mantiene la página 1 —la que
 * importa para SEO— prerrenderizada y barata, y da a cada página una URL propia
 * que un buscador puede seguir. Estas no se prerrenderizan en build: se generan
 * a demanda la primera vez y se cachean.
 */
/** Misma ventana que la página 1 de su faceta. */
export const revalidate = 21600;

type Props = { params: Promise<{ slug: string; n: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug, n } = await params;
  const faceta = await resolverFaceta("tipo", slug);
  if (!faceta) return { title: "No encontrado" };
  return {
    title: `${faceta.label} · página ${n}`,
    description: faceta.descripcion,
    // La canónica apunta a la página 1: las páginas profundas no deben competir
    // con ella en el índice.
    alternates: { canonical: `/licitaciones/tipo/${faceta.slug}` },
    robots: { index: false, follow: true },
  };
}

export default async function Page({ params }: Props) {
  const { slug, n } = await params;
  const faceta = await resolverFaceta("tipo", slug);
  if (!faceta) notFound();
  const pagina = Number(n);
  if (!Number.isInteger(pagina) || pagina < 2) notFound();
  const datos = await procesosDeFaceta(faceta, pagina);
  if (datos.items.length === 0) notFound();
  return <PaginaFaceta faceta={faceta} pagina={datos} />;
}
