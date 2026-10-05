import { notFound } from "next/navigation";
import Vitrina from "@/src/components/secop/vitrina/Vitrina";
import { paginaValida, procesosDeVitrina } from "@/src/lib/secop/vitrina";
import { procesosPorDepartamento } from "@/src/lib/secop/agregados";
import { detallesDeRadar } from "@/src/lib/secop/radar";
import { hrefDeProceso } from "@/src/components/secop/lista/PaginaFaceta";

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
  const [datos, departamentos] = await Promise.all([
    procesosDeVitrina("abiertos", pagina),
    // Para el selector del buscador; sin la lista, el buscador sale sin él.
    procesosPorDepartamento().catch(() => []),
  ]);
  if (datos.items.length === 0) notFound();
  // El panel del Radar es una mejora: si su consulta falla, la página sale sin él.
  const detalles = await detallesDeRadar(
    datos.items.map((p) => ({ secopProcesoId: p.secopProcesoId, href: hrefDeProceso(p) }))
  ).catch(() => []);
  return (
    <Vitrina
      pagina={datos}
      departamentos={departamentos.map((d) => ({ slug: d.slug, label: d.label, n: d.n }))}
      detalles={detalles}
    />
  );
}
