import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Hero from "@/src/components/marketplace/Hero";
import Oportunidades from "@/src/components/marketplace/Oportunidades";
import { consultarMarketplace } from "@/src/lib/marketplace/consulta";
import { normalizarBusqueda, hrefMarketplace, traeParametrosVacios } from "@/src/lib/marketplace/url";
import { filtrosDesdeParams } from "@/src/lib/secop/filtros-vitrina";
import s from "@/src/components/marketplace/marketplace.module.css";

/**
 * Vista de revisión del marketplace híbrido (Fase 4, SPEC §1). Ruta propuesta
 * para el traspaso, con `noindex`: no compite con la portada ni con la vitrina
 * mientras se revisa. Quitar el enlace de navegación (o esta ruta) la apaga.
 */
export const metadata: Metadata = {
  title: "Marketplace de oportunidades hídricas",
  description:
    "Busca, filtra y explora en el mapa las oportunidades de agua potable, saneamiento y redes publicadas en SECOP II.",
  robots: { index: false, follow: true },
};

/**
 * Se renderiza en cada petición: lee `searchParams` y la base, y el build no
 * tiene base de datos (mismo motivo que `/licitaciones`). La consulta no se
 * ejecuta en el build.
 */
export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = (await searchParams) ?? {};
  const { filtros: crudos, pagina } = filtrosDesdeParams(sp);
  const filtros = normalizarBusqueda({ ...crudos, etapa: null });

  // El formulario GET manda los campos vacíos; la URL canónica no los lleva.
  if (traeParametrosVacios(sp)) redirect(hrefMarketplace(filtros, pagina));

  const datos = await consultarMarketplace(filtros, pagina);

  return (
    // El `<main>` ya lo pone el layout.
    <div className={`${s.pagina} tema-oscuro`}>
      <Hero datos={datos} filtros={filtros} />
      {datos.estado === "no-disponible" ? null : (
        <Oportunidades datos={datos} filtros={filtros} pagina={pagina} />
      )}
    </div>
  );
}
