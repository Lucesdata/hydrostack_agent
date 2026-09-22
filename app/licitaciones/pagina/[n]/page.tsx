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
 * Sin esto, cada una de las hasta 3.947 páginas (35.518 abiertos / 9 por
 * página) indexaría con el mismo `<title>` que `/licitaciones`, compitiendo con
 * ella. La canónica apunta a la página 1 y `robots.index: false` saca a las
 * páginas profundas del índice sin dejar de seguir sus enlaces.
 */
export async function generateMetadata({ params }: Props) {
  const { n } = await params;
  return {
    title: `Fichas de procesos · página ${n}`,
    alternates: { canonical: "/licitaciones" },
    robots: { index: false, follow: true },
  };
}

export default async function PaginaAbiertos({ params }: Props) {
  const { n } = await params;
  const pagina = paginaValida(n);
  if (pagina === null) notFound();
  const datos = await procesosDeVitrina("abiertos", pagina);
  if (datos.items.length === 0) notFound();
  return <Vitrina pagina={datos} />;
}
