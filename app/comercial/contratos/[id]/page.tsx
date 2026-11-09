import { notFound } from "next/navigation";
import type { Metadata } from "next";
import FichaComercial from "@/src/components/comercial/FichaComercial";
import { comercialHabilitado } from "@/src/lib/comercial/habilitado";
import { fichaComercialDeContrato, PATRON_ID_CONTRATO } from "@/src/lib/comercial/ficha-contrato";

/**
 * Ficha comercial de contrato (CI-11a). Detrás de `CI_COMERCIAL_HABILITADO=1`:
 * apagada, la ruta responde 404. `noindex` mientras sea un producto en piloto.
 * Se regenera cada 6 h y se genera bajo demanda (sin `generateStaticParams`).
 */
export const revalidate = 21600;

export const metadata: Metadata = {
  title: "Ficha comercial de contrato",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: { id: string } }) {
  if (!comercialHabilitado()) notFound();
  const id = decodeURIComponent(params.id);
  if (!PATRON_ID_CONTRATO.test(id)) notFound();
  const ficha = await fichaComercialDeContrato(id);
  if (!ficha) notFound();
  return <FichaComercial ficha={ficha} />;
}
