import type { SecopProceso, SecopQuery, SecopResult } from "@/src/lib/secop/types";
import { enlaceBusqueda } from "@/src/lib/secop/busqueda-navegacion";
import { slugDeProceso } from "@/src/lib/secop/slug";
import { formatValorProceso, sentenceCaseTitle } from "./format";
import styles from "../landing/hero-territorial/buscador-guiado.module.css";

/** Presentación pura: el mismo HTML sirve con y sin JavaScript. */
export default function ResultadosBusquedaServidor({
  resultado,
  consulta,
  compacto = false,
  onPagina,
}: {
  resultado: SecopResult<SecopProceso>;
  consulta: SecopQuery;
  compacto?: boolean;
  onPagina?: (pagina: number) => void;
}) {
  if (!resultado.items.length)
    return (
      <p className={styles.aviso}>
        {consulta.modo === "numero"
          ? "No encontramos ese proceso en AquaLicita. Comprueba el número o prueba con una palabra del objeto."
          : "No encontramos procesos para estos filtros. Prueba otro sistema o actividad."}
      </p>
    );
  const totalPaginas =
    resultado.total !== undefined
      ? Math.max(1, Math.ceil(resultado.total / resultado.pageSize))
      : undefined;
  const pagina = (numero: number, label: string) => (
    <a
      href={enlaceBusqueda({ ...consulta, page: numero })}
      onClick={
        onPagina
          ? (event) => {
              event.preventDefault();
              onPagina(numero);
            }
          : undefined
      }
    >
      {label}
    </a>
  );
  return (
    <div className={styles.resultados}>
      <ul
        className={`${styles.lista} ${compacto ? styles.compacta : ""}`}
        aria-label="Resultados de búsqueda"
      >
        {resultado.items.map((p) => (
          <li key={p.id}>
            <article>
              <h2>
                <a href={`/licitaciones/${slugDeProceso(p.nombre, p.id)}`}>
                  {sentenceCaseTitle(p.nombre || p.referencia || p.id)}
                </a>
              </h2>
              <p className={styles.entidad}>{p.entidad || "Entidad no publicada"}</p>
              <p className={styles.referencia}>
                <span translate="no">{p.referencia || p.id}</span>
                {p.coincidencia && <span> · Coincidencia {p.coincidencia}</span>}
              </p>
              <div className={styles.datos}>
                <strong>{formatValorProceso(p)}</strong>
                <span>{p.estadoApertura ?? "Apertura por verificar"}</span>
              </div>
            </article>
          </li>
        ))}
      </ul>
      {compacto ? (
        <a className={styles.todos} href={enlaceBusqueda({ ...consulta, page: 1, pageSize: 25 })}>
          Ver todos los resultados →
        </a>
      ) : (
        <nav className={styles.paginacion} aria-label="Páginas de resultados">
          {resultado.page > 1 ? pagina(resultado.page - 1, "← Anterior") : <span>← Anterior</span>}
          <span>
            Página {resultado.page}
            {totalPaginas ? ` de ${totalPaginas}` : ""}
          </span>
          {(
            totalPaginas
              ? resultado.page < totalPaginas
              : resultado.items.length === resultado.pageSize
          ) ? (
            pagina(resultado.page + 1, "Siguiente →")
          ) : (
            <span>Siguiente →</span>
          )}
        </nav>
      )}
    </div>
  );
}
