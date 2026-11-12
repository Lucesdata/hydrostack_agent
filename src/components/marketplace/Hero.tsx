import Link from "next/link";
import type { FiltrosVitrina } from "@/src/lib/secop/filtros-vitrina";
import { FONDO_HERO } from "@/src/lib/marketplace/familias";
import type { ConsultaMarketplace } from "@/src/lib/marketplace/tipos";
import { opcionesTerritorio, destinosPorCodigo } from "@/src/lib/marketplace/territorios";
import Buscador, { CamposFiltro } from "./Buscador";
import PanelFiltros from "./PanelFiltros";
import EscenaTerritorial from "./EscenaTerritorial";
import Familias from "./Familias";
import Mapa2D from "./Mapa2D";
import { hrefMarketplace } from "@/src/lib/marketplace/url";
import MetricasHero from "./Metricas";
import Territorio from "./Territorio";
import s from "./marketplace.module.css";

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
    <>
      <section className={s.hero} aria-labelledby="mk-titulo">
        <div className={s.franja}>
          <picture className={s.fondo}>
            <source media="(max-width: 767px)" srcSet={FONDO_HERO.movil} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={FONDO_HERO.escritorio} alt="" width={1600} height={900} decoding="async" />
          </picture>
          <div className={s.velo} aria-hidden="true" />
          <div className={s.mensaje}>
            <p className={s.eyebrow}>Mercado de contratación pública</p>
            <h1 id="mk-titulo">
              Oportunidades de infraestructura hídrica <span>en Colombia</span>
            </h1>
            <p className={s.lead}>Licitaciones de agua potable, saneamiento y redes · SECOP II</p>
          </div>
          <div className={s.herramientas}>
            <Buscador filtros={filtros} />
            {disponible ? (
              <MetricasHero
                metricas={disponible.metricas}
                motivoAusencia={
                  filtros.numero ? "La búsqueda por número incluye cerrados." : undefined
                }
              />
            ) : null}
          </div>
        </div>
        <div className={s.navegacion}>
          <Familias filtros={filtros} />
          {disponible ? (
            <details className={s.vistaMapa}>
              <summary>Ver mapa</summary>
              <div className={s.territorio}>
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
              </div>
            </details>
          ) : null}
        </div>
        {disponible?.departamentoInvalido ? (
          <p className={s.aviso}>
            El departamento indicado no existe.{" "}
            <Link href={hrefMarketplace({ ...filtros, departamento: null })}>
              Retirar el filtro
            </Link>
          </p>
        ) : null}
        {!disponible ? (
          <div className={s.sinDatos} role="alert">
            <h2>No pudimos consultar las oportunidades</h2>
            <p>La fuente de datos no respondió. Puedes volver a intentarlo.</p>
            <Link href={hrefMarketplace(filtros)} className={s.botonSecundario} prefetch={false}>
              Reintentar
            </Link>{" "}
            <Link href="/licitaciones" className={s.botonSecundario} prefetch={false}>
              Ir a la vitrina
            </Link>
          </div>
        ) : null}
      </section>
      <aside className={s.lateral} aria-label="Explorar mercado">
        <h2>Explorar mercado</h2>
        <Familias filtros={filtros} lateral />
        <PanelFiltros>
          <CamposFiltro filtros={filtros} territorios={territorios} />
        </PanelFiltros>
      </aside>
    </>
  );
}
