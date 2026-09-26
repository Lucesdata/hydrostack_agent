import Link from "next/link";
import { ESTILOS_LISTA } from "@/src/components/secop/lista/estilos";
import ListaCompradores, {
  ESTILOS_COMPRADORES,
} from "@/src/components/secop/compradores/ListaCompradores";
import { formatConteo } from "@/src/components/secop/format";
import { entidadesCompradoras, type Compradores } from "@/src/lib/secop/compradores";

/**
 * Quién compra: las entidades con más procesos abiertos. Pública, sin cuenta,
 * como las facetas. No lee `searchParams` (ver las rutas facetadas): es
 * estática y se revalida con la misma cadencia de 6 h.
 */
export const revalidate = 21600;

export const metadata = {
  title: "Quién compra · Entidades con más procesos de agua abiertos",
  description:
    "Las entidades públicas con más procesos abiertos de agua y saneamiento en el SECOP II: cuántos tienen, cuánto presupuesto publican y dónde está su sede.",
  alternates: { canonical: "/licitaciones/entidades" },
};

export default async function Page() {
  let datos: Compradores | null = null;
  try {
    datos = await entidadesCompradoras();
  } catch (error) {
    // Sin base (p. ej. en el build), la página sale sin listado en vez de caerse.
    console.error("[licitaciones/entidades] no disponible:", error);
  }

  return (
    <div className="clr-page">
      <style dangerouslySetInnerHTML={{ __html: ESTILOS_LISTA + ESTILOS_COMPRADORES }} />
      <div className="clr-container">
        <header className="lp-cab">
          <nav className="lp-cab-migas" aria-label="Ruta de navegación">
            <Link href="/licitaciones">Fichas de procesos</Link>
            {" · "}Quién compra
          </nav>
          <h1 className="lp-cab-h1">Quién compra</h1>
          <p className="lp-cab-desc">
            Las entidades con más procesos abiertos de agua y saneamiento en el SECOP II. El
            departamento es el de la sede de la entidad. Quién se presenta y gana está en{" "}
            <Link href="/competidores">Competidores</Link>.
          </p>
          {datos && datos.totalEntidades > 0 ? (
            <p className="lp-cab-conteo">
              {datos.entidades.length < datos.totalEntidades
                ? `Las ${formatConteo(datos.entidades.length)} primeras de ${formatConteo(datos.totalEntidades)} entidades con procesos abiertos`
                : `${formatConteo(datos.totalEntidades)} entidades con procesos abiertos`}
            </p>
          ) : null}
        </header>
        <ListaCompradores datos={datos} />
      </div>
    </div>
  );
}
