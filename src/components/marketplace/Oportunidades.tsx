import Link from "next/link";
import { POR_PAGINA_VITRINA } from "@/src/lib/secop/vitrina";
import { hayFiltros, type FiltrosVitrina } from "@/src/lib/secop/filtros-vitrina";
import type { ConsultaDisponible } from "@/src/lib/marketplace/tipos";
import { hrefMarketplace, hrefVitrina, RUTA_MARKETPLACE } from "@/src/lib/marketplace/url";
import { FONDO_HERO } from "@/src/lib/marketplace/familias";
import CarruselOportunidades from "./CarruselOportunidades";
import TarjetaOportunidad from "./TarjetaOportunidad";
import s from "./marketplace.module.css";

const n = (v: number) => v.toLocaleString("es-CO");

/**
 * Bajo el hero: «Oportunidades destacadas» sin filtros, «Resultados» con ellos
 * (SPEC §2). La lista es la de la vitrina —mismo predicado, mismo orden y misma
 * paginación—; el total que se anuncia es el de la consulta completa, nunca el
 * de la página. El estado vive en una región `aria-live="polite"` para que un
 * lector de pantalla oiga el nuevo conteo al cambiar un filtro.
 */
export default function Oportunidades({
  datos,
  filtros,
  pagina,
}: {
  datos: ConsultaDisponible;
  filtros: FiltrosVitrina;
  pagina: number;
}) {
  const conFiltros = hayFiltros(filtros);
  const totalPaginas = Math.max(1, Math.ceil(datos.total / POR_PAGINA_VITRINA));
  const hoy = new Date();

  return (
    <section
      id="resultados"
      className={s.resultados}
      aria-labelledby="mk-resultados"
      style={{ backgroundImage: `url(${FONDO_HERO.transicion})` }}
    >
      <div className={s.contenedor}>
        <header className={s.cabeceraResultados}>
          <div>
            <h2 id="mk-resultados">{conFiltros ? "Resultados" : "Oportunidades destacadas"}</h2>
            <p role="status" aria-live="polite" className={s.conteo}>
              {datos.total === 0
                ? "Ninguna oportunidad coincide con estos filtros."
                : `${n(datos.total)} ${datos.total === 1 ? "oportunidad" : "oportunidades"}${
                    conFiltros ? "" : " abiertas a ofertas"
                  }${totalPaginas > 1 && conFiltros ? ` · página ${n(pagina)} de ${n(totalPaginas)}` : ""}`}
            </p>
          </div>
          <Link href={hrefVitrina(filtros)} className={s.verTodas}>
            Ver todas las oportunidades
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
              <path d="M5 12h14m-5-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </header>

        {datos.items.length === 0 ? (
          <div className={s.vacio}>
            <p>No encontramos procesos con esa combinación. Prueba con menos filtros o con otra palabra.</p>
            <p>
              <a href={RUTA_MARKETPLACE} className={s.botonSecundario}>
                Limpiar filtros
              </a>{" "}
              <Link href="/licitaciones" className={s.botonSecundario}>
                Ir a la vitrina
              </Link>
            </p>
          </div>
        ) : (
          <CarruselOportunidades etiqueta={conFiltros ? "Resultados" : "Oportunidades destacadas"}>
            {datos.items.map((o) => (
              <li key={o.id}>
                <TarjetaOportunidad o={o} hoy={hoy} />
              </li>
            ))}
          </CarruselOportunidades>
        )}

        {conFiltros && totalPaginas > 1 ? (
          <nav className={s.paginacion} aria-label="Páginas de resultados">
            {pagina > 1 ? (
              <Link href={`${hrefMarketplace(filtros, pagina - 1)}#resultados`} rel="prev">
                ← Anterior
              </Link>
            ) : (
              <span aria-disabled="true">← Anterior</span>
            )}
            <span>
              Página {n(pagina)} de {n(totalPaginas)}
            </span>
            {pagina < totalPaginas ? (
              <Link href={`${hrefMarketplace(filtros, pagina + 1)}#resultados`} rel="next">
                Siguiente →
              </Link>
            ) : (
              <span aria-disabled="true">Siguiente →</span>
            )}
          </nav>
        ) : null}

        <p className={s.fuente}>
          Fuente: SECOP II – Procesos de Contratación · Colombia Compra Eficiente / Datos Abiertos (
          <a href="https://www.datos.gov.co/w/p6dx-8zbt" target="_blank" rel="noopener noreferrer">
            conjunto p6dx-8zbt
          </a>
          , licencia{" "}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">
            CC BY-SA 4.0
          </a>
          ). AquaLicita normaliza fechas, cuantías y tipo de proyecto; los documentos oficiales están en SECOP II.
          {datos.actualizadoEn ? ` Última sincronización: ${new Date(datos.actualizadoEn).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "medium", timeStyle: "short" })}.` : ""}{" "}
          Mapa: DANE — Marco Geoestadístico Nacional 2025. Las fotografías son ilustrativas.
        </p>
      </div>
    </section>
  );
}
