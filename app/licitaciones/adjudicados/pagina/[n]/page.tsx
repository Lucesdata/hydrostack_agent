import { notFound } from "next/navigation";
import Vitrina from "@/src/components/secop/vitrina/Vitrina";
import { paginaValida, procesosDeVitrina } from "@/src/lib/secop/vitrina";

export const revalidate = 21600;

/** Vacío a propósito: prerrenderizar ataría el build a la base de producción. */
export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ n: string }> };

/**
 * Misma razón que la faceta de abiertos: sin canónica ni `robots.index: false`,
 * cada página profunda de adjudicados compite en el índice con
 * `/licitaciones/adjudicados`, que es la que de verdad importa para SEO.
 */
export async function generateMetadata({ params }: Props) {
  const { n } = await params;
  return {
    title: `Adjudicados recientes · página ${n}`,
    alternates: { canonical: "/licitaciones/adjudicados" },
    robots: { index: false, follow: true },
  };
}

export default async function PaginaAdjudicados({ params }: Props) {
  const { n } = await params;
  const pagina = paginaValida(n);
  if (pagina === null) notFound();
  const datos = await procesosDeVitrina("adjudicados", pagina);
  if (datos.items.length === 0) notFound();
  return <Vitrina pagina={datos} />;
}
