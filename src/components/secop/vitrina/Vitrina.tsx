import Link from "next/link";
import FichaCard from "../ficha-card/FichaCard";
import { ESTILOS_FICHA_CARD } from "../ficha-card/estilos";
import { ESTILOS_SEMAFORO } from "../semaforo/estilos";
import { ESTILOS_VITRINA } from "./estilos";
import { hrefDeProceso } from "../lista/PaginaFaceta";
import LicitacionesTabs from "../LicitacionesTabs";
import { rutaVitrina, type PaginaDeVitrina, type PestanaVitrina } from "@/src/lib/secop/vitrina";

/**
 * La vitrina: cabecera con conteo, pestañas, rejilla de nueve fichas y
 * paginación por camino.
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

export default function Vitrina({ pagina }: { pagina: PaginaDeVitrina }) {
  const totalPaginas = Math.max(1, Math.ceil(pagina.total / pagina.porPagina));
  const vacio = VACIO[pagina.pestana];

  return (
    <div className="clr-page">
      <style
        dangerouslySetInnerHTML={{
          __html: ESTILOS_VITRINA + ESTILOS_FICHA_CARD + ESTILOS_SEMAFORO,
        }}
      />
      <div className="clr-container">
        <LicitacionesTabs />
        <header className="vt-cab">
          <h1 className="vt-h1">Fichas de procesos</h1>
          <p className="vt-apoyo">Abra cualquier ficha para ver requisitos, fechas y documentos.</p>
          <p className="vt-conteo">
            {pagina.total.toLocaleString("es-CO")}{" "}
            {pagina.pestana === "abiertos"
              ? pagina.total === 1
                ? "proceso abierto"
                : "procesos abiertos"
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

        {pagina.items.length === 0 ? (
          <div className="vt-vacio">
            <p style={{ margin: 0 }}>{vacio.texto}</p>
            <Link className="vt-vacio-accion" href={vacio.href}>
              {vacio.accion} →
            </Link>
          </div>
        ) : (
          <ul className="vt-rejilla">
            {pagina.items.map((p) => (
              <li key={p.id}>
                <FichaCard proceso={p} href={hrefDeProceso(p)} variante="vitrina" />
              </li>
            ))}
          </ul>
        )}

        {totalPaginas > 1 && (
          <nav className="vt-pag" aria-label="Paginación">
            <span className="vt-pag-info">
              Página {pagina.pagina} de {totalPaginas.toLocaleString("es-CO")}
            </span>
            <span style={{ display: "flex", gap: 16 }}>
              {pagina.pagina > 1 && (
                <Link className="vt-pag-link" href={rutaVitrina(pagina.pestana, pagina.pagina - 1)}>
                  ← Anterior
                </Link>
              )}
              {pagina.pagina < totalPaginas && (
                <Link className="vt-pag-link" href={rutaVitrina(pagina.pestana, pagina.pagina + 1)}>
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
