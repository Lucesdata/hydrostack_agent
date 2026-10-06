import Link from "next/link";
import FichaCard from "../ficha-card/FichaCard";
import { ESTILOS_FICHA_CARD } from "../ficha-card/estilos";
import { ESTILOS_VITRINA } from "./estilos";
import { hrefDeProceso } from "../lista/PaginaFaceta";
import LicitacionesTabs from "../LicitacionesTabs";
import { rutaVitrina, type PaginaDeVitrina, type PestanaVitrina } from "@/src/lib/secop/vitrina";
import {
  ETIQUETA_ETAPA_FILTRO,
  hayFiltros,
  queryDeFiltros,
  SIN_FILTROS,
} from "@/src/lib/secop/filtros-vitrina";
import FiltrosVitrina, { type OpcionDepartamento } from "./FiltrosVitrina";
import { ProveedorEncaje } from "./EncajeVitrina";
import RadarVitrina from "./RadarVitrina";
import { ESTILOS_FICHA } from "../ficha/estilos";
import ProcesosCuenta from "../../mis-procesos/ProcesosCuenta";
import BotonGuardar from "../../mis-procesos/BotonGuardar";
import type { DetalleRadar } from "@/src/lib/secop/radar";

/**
 * La vitrina: cabecera con conteo, pestañas, buscador y filtros (solo en
 * abiertos), rejilla de nueve fichas y paginación.
 *
 * Las pestañas son enlaces, no estado de cliente: cada una tiene su URL, se
 * comparte, se indexa y no obliga a que la página lea `searchParams` —que es lo
 * que la volvería dinámica y facturable en cada visita.
 */

const TABS: { pestana: PestanaVitrina; label: string }[] = [
  { pestana: "abiertos", label: "Abiertos" },
  { pestana: "adjudicados", label: "Adjudicados recientes" },
];

const VACIO: Record<PestanaVitrina, { texto: string; accion: string; href: string }> = {
  abiertos: {
    texto: "No hay procesos abiertos ahora mismo.",
    accion: "Ver adjudicados recientes",
    href: rutaVitrina("adjudicados", 1),
  },
  adjudicados: {
    texto: "No hay adjudicaciones en los últimos 30 días.",
    accion: "Ver procesos abiertos",
    href: rutaVitrina("abiertos", 1),
  },
};

export default function Vitrina({
  pagina,
  departamentos = [],
  detalles = [],
}: {
  pagina: PaginaDeVitrina;
  departamentos?: OpcionDepartamento[];
  /** El panel del Radar; sin detalles (adjudicados, o si su consulta falló), solo la rejilla. */
  detalles?: DetalleRadar[];
}) {
  // Con el filtro de etapa no son oportunidades: sin Radar (su panel invita a
  // ofertar) ni encaje con el perfil.
  const porEtapa = pagina.pestana === "abiertos" && !!pagina.filtros.etapa;
  // Ni el filtro de etapa ni la búsqueda por número (que también encuentra
  // cerrados y contratados) son solo oportunidades: sin Radar ni encaje.
  const sinOportunidades = porEtapa || (pagina.pestana === "abiertos" && !!pagina.filtros.numero);
  const conRadar = pagina.pestana === "abiertos" && detalles.length > 0 && !sinOportunidades;
  const totalPaginas = Math.max(1, Math.ceil(pagina.total / pagina.porPagina));
  const filtrado = pagina.pestana === "abiertos" && hayFiltros(pagina.filtros);
  const numero = pagina.pestana === "abiertos" ? pagina.filtros.numero : null;
  const vacio = numero
    ? {
        texto: `Ningún proceso tiene el número o la referencia «${numero}».`,
        accion: "Volver a todos los abiertos",
        href: `/licitaciones${queryDeFiltros(SIN_FILTROS)}`,
      }
    : filtrado
      ? {
          texto: "Ningún proceso abierto coincide con estos filtros.",
          accion: "Quitar los filtros",
          href: `/licitaciones${queryDeFiltros(SIN_FILTROS)}`,
        }
      : VACIO[pagina.pestana];
  const ruta = (n: number) => rutaVitrina(pagina.pestana, n, pagina.filtros);
  const rejilla = (
    <ul className="vt-rejilla">
      {pagina.items.map((p) => (
        <li key={p.id}>
          <FichaCard proceso={p} href={hrefDeProceso(p)} variante="vitrina" />
          {/* Fuera del enlace de la tarjeta: un botón no puede ir dentro de un <a>.
              El mismo «Guardar» de la ficha (/mis-procesos). */}
          {pagina.pestana === "abiertos" && (
            <span className="vt-guardar">
              <BotonGuardar procesoId={p.secopProcesoId} volver={ruta(pagina.pagina)} />
            </span>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="clr-page">
      <style
        dangerouslySetInnerHTML={{
          // Los de la ficha solo con Radar: su panel aloja el bloque de decisión.
          __html: ESTILOS_VITRINA + ESTILOS_FICHA_CARD + (conRadar ? ESTILOS_FICHA : ""),
        }}
      />
      <div className="clr-container">
        <LicitacionesTabs />
        <header className="vt-cab">
          <h1 className="vt-h1">Fichas de procesos</h1>
          <p className="vt-apoyo">Abra cualquier ficha para ver requisitos, fechas y documentos.</p>
          <p className="vt-conteo">
            {pagina.total.toLocaleString("es-CO")}{" "}
            {numero
              ? `${pagina.total === 1 ? "proceso" : "procesos"} con el número «${numero}» · abiertos y cerrados, los exactos primero`
              : pagina.pestana === "abiertos"
                ? porEtapa
                  ? `${pagina.total === 1 ? "proceso" : "procesos"} de 2026 con contrato firmado · ${ETIQUETA_ETAPA_FILTRO[
                      pagina.filtros.etapa!
                    ].toLowerCase()} según las fechas del contrato`
                  : pagina.total === 1
                    ? `proceso abierto${filtrado ? " con estos filtros" : ""}`
                    : `procesos abiertos${filtrado ? " con estos filtros" : ""}`
                : pagina.total === 1
                  ? "adjudicación en los últimos 30 días"
                  : "adjudicaciones en los últimos 30 días"}
          </p>
        </header>

        <nav className="vt-tabs" aria-label="Pestañas de la vitrina">
          {TABS.map((t) => (
            <Link
              key={t.pestana}
              className="vt-tab"
              href={rutaVitrina(t.pestana, 1)}
              aria-current={t.pestana === pagina.pestana ? "page" : undefined}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {pagina.pestana === "abiertos" && (
          <FiltrosVitrina filtros={pagina.filtros} departamentos={departamentos} />
        )}

        {pagina.items.length === 0 ? (
          <div className="vt-vacio">
            <p style={{ margin: 0 }}>{vacio.texto}</p>
            <Link className="vt-vacio-accion" href={vacio.href}>
              {vacio.accion} →
            </Link>
          </div>
        ) : (
          <ProcesosCuenta ids={pagina.items.map((p) => p.secopProcesoId)}>
            {sinOportunidades ? (
              rejilla
            ) : (
              <ProveedorEncaje ids={pagina.items.map((p) => p.secopProcesoId)}>
                {conRadar ? (
                  <RadarVitrina detalles={detalles} volver={ruta(pagina.pagina)}>
                    {rejilla}
                  </RadarVitrina>
                ) : (
                  rejilla
                )}
              </ProveedorEncaje>
            )}
          </ProcesosCuenta>
        )}

        {totalPaginas > 1 && (
          <nav className="vt-pag" aria-label="Paginación">
            <span className="vt-pag-info">
              Página {pagina.pagina} de {totalPaginas.toLocaleString("es-CO")}
            </span>
            <span style={{ display: "flex", gap: 16 }}>
              {pagina.pagina > 1 && (
                <Link className="vt-pag-link" href={ruta(pagina.pagina - 1)}>
                  ← Anterior
                </Link>
              )}
              {pagina.pagina < totalPaginas && (
                <Link className="vt-pag-link" href={ruta(pagina.pagina + 1)}>
                  Siguiente →
                </Link>
              )}
            </span>
          </nav>
        )}
      </div>
    </div>
  );
}
