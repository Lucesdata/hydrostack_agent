import { notFound } from "next/navigation";
import Vitrina from "@/src/components/secop/vitrina/Vitrina";
import { paginaValida, procesosDeVitrina } from "@/src/lib/secop/vitrina";

export const revalidate = 21600;

/** Vacío a propósito: prerrenderizar ataría el build a la base de producción. */
export function generateStaticParams() {
  return [];
}

export default async function PaginaAbiertos({ params }: { params: { n: string } }) {
  const n = paginaValida(params.n);
  if (n === null) notFound();
  const pagina = await procesosDeVitrina("abiertos", n);
  if (pagina.items.length === 0) notFound();
  return <Vitrina pagina={pagina} />;
}
