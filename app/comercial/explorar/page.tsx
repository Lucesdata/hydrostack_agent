import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ExploradorOportunidades from "@/src/components/comercial/ExploradorOportunidades";
import { comercialHabilitado } from "@/src/lib/comercial/habilitado";
import { buscarOportunidades, type ResultadoExplorador } from "@/src/lib/comercial/explorador";
import {
  parametrosDesdeUrl,
  type ParametrosExplorador,
} from "@/src/lib/comercial/explorador-params";

/**
 * Explorador de oportunidades (CI-11c). Detrás de `CI_COMERCIAL_HABILITADO=1`
 * (apagada responde 404) y `noindex`. Lee `searchParams`, así que es dinámica.
 * No toca `/licitaciones`.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explorador de oportunidades",
  robots: { index: false, follow: false },
};

/**
 * El prefiltro de tecnología tarda ≈3 s en la base viva (medido el 2026-11-09) y las
 * combinaciones de filtros son pocas: se guarda 10 minutos por combinación para no
 * repetir el escaneo en cada visita. Los errores no se guardan.
 */
const buscarEnCache = unstable_cache(
  (p: ParametrosExplorador) => buscarOportunidades(p),
  ["comercial-explorar-v1"],
  {
    revalidate: 600,
  }
);

export default async function Page({
  searchParams = {},
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  if (!comercialHabilitado()) notFound();
  const params = parametrosDesdeUrl(searchParams);
  let resultado: ResultadoExplorador | null = null;
  let error = false;
  try {
    resultado = await buscarEnCache(params);
  } catch (e) {
    console.error("[comercial/explorar] fuente no disponible", e);
    error = true;
  }
  return <ExploradorOportunidades params={params} resultado={resultado} error={error} />;
}
