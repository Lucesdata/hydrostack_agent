import Link from "next/link";
import type { FiltrosVitrina } from "@/src/lib/secop/filtros-vitrina";
import { FONDO_HERO } from "@/src/lib/marketplace/familias";
import type { ConsultaMarketplace } from "@/src/lib/marketplace/tipos";
import { opcionesTerritorio, destinosPorCodigo } from "@/src/lib/marketplace/territorios";
import Buscador from "./Buscador";
import EscenaTerritorial from "./EscenaTerritorial";
import Familias from "./Familias";
import Mapa2D from "./Mapa2D";
import MetricasHero from "./Metricas";
import Territorio from "./Territorio";
import s from "./marketplace.module.css";

/**
 * El hero (SPEC §2): un solo escenario continuo. El fondo es una imagen
 * decorativa (`alt=""`, una variante por viewport) y encima, a la izquierda, el
 * mensaje; a la derecha, el mapa sin recuadro. Texto, controles y estados son
 * HTML; el orden del DOM es el del móvil (búsqueda, familias, indicadores,
 * territorio), y en escritorio la rejilla los reparte 44/56.
 */
export default function Hero({
  datos,
  filtros,
}: {
  datos: ConsultaMarketplace;
  filtros: FiltrosVitrina;
}) {
  const disponible = datos.estado === "no-disponible" ? null : datos;
  const territorios = opcionesTerritorio(disponible?.porDepartamento ?? []);
  const destinos = destinosPorCodigo(territorios, filtros);

  return (
    <section className={s.hero} aria-labelledby="mk-titulo">
      <picture className={s.fondo}>
        <source media="(max-width: 767px)" srcSet={FONDO_HERO.movil} />
        {/* WebP ya dimensionados por viewport (inventario ASSETS.md): `next/image` no añade nada. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={FONDO_HERO.escritorio}
          alt=""
          width={1600}
          height={900}
          fetchPriority="high"
          decoding="async"
        />
      </picture>
      <div className={s.velo} aria-hidden="true" />

      <div className={s.heroInterior}>
        <div className={s.mensaje}>
          <p className={s.eyebrow}>Mercado de contratación pública</p>
          <h1 id="mk-titulo">
            Oportunidades de infraestructura hídrica <span>en Colombia</span>
          </h1>
          <p className={s.lead}>
            Explora, analiza y haz seguimiento a procesos de agua potable, saneamiento y redes, con
            datos de SECOP II.
          </p>

          <Buscador filtros={filtros} territorios={territorios} />
          <Familias filtros={filtros} />

          {disponible ? (
            <MetricasHero
              metricas={disponible.metricas}
              motivoAusencia={
                filtros.numero
                  ? "Con un número de proceso no se muestran indicadores: esa búsqueda incluye cerrados."
                  : undefined
              }
            />
          ) : null}
        </div>

        <div className={s.territorio}>
          {disponible ? (
            <>
              <EscenaTerritorial
                regiones={disponible.porDepartamento}
                seleccionCodigo={disponible.departamentoSeleccionado?.codigo ?? null}
                destinos={destinos}
                mapa2d={
                  <Mapa2D
                    regiones={disponible.porDepartamento}
                    seleccionCodigo={disponible.departamentoSeleccionado?.codigo ?? null}
                    destinos={destinos}
                  />
                }
              />
              <Territorio datos={disponible} filtros={filtros} territorios={territorios} />
            </>
          ) : (
            <div className={s.sinDatos} role="alert">
              <h2>No pudimos consultar las oportunidades</h2>
              <p>
                La fuente de datos no respondió. La navegación del sitio sigue disponible y puedes
                intentarlo de nuevo.
              </p>
              <p>
                <Link href="/marketplace" className={s.botonSecundario} prefetch={false}>
                  Reintentar
                </Link>{" "}
                <Link href="/licitaciones" className={s.botonSecundario}>
                  Ir a la vitrina
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
