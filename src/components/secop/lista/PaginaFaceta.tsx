import Link from "next/link";
import FilaProceso from "./FilaProceso";
import { ESTILOS_LISTA } from "./estilos";
import Semaforo from "../semaforo/Semaforo";
import { ESTILOS_SEMAFORO } from "../semaforo/estilos";
import { compuertasAbsolutas } from "@/src/lib/secop/semaforo";
import { slugDeProceso } from "@/src/lib/secop/ficha";
import type { Faceta, PaginaDeFaceta } from "@/src/lib/secop/facetas";

/**
 * La página de una faceta: cabecera con su nombre y conteo, lista densa y
 * paginación. La comparten las tres familias (`departamento`, `tipo`,
 * `entidad`) porque solo cambian los textos, no la forma.
 */

const NOMBRE_FAMILIA: Record<Faceta["familia"], string> = {
  departamento: "Territorio",
  tipo: "Tipo de proyecto",
  entidad: "Entidad contratante",
};

/**
 * A dónde apunta cada fila: a la ficha pública del proceso.
 *
 * Apuntó al SECOP II mientras `/licitaciones/[slug]` no existía. Ahora existe, y
 * mandar al usuario fuera del sitio desde una lista propia era regalar la visita
 * — la ficha es la única página que puede explicar el proceso con el semáforo
 * delante. El enlace al SECOP II sigue, dentro de la ficha, como cierre.
 */
export function hrefDeProceso(p: { objeto: string | null; secopProcesoId: string }): string {
  return `/licitaciones/${slugDeProceso(p.objeto, p.secopProcesoId)}`;
}

export default function PaginaFaceta({
  faceta,
  pagina,
}: {
  faceta: Faceta;
  pagina: PaginaDeFaceta;
}) {
  const totalPaginas = Math.max(1, Math.ceil(pagina.total / pagina.porPagina));
  const base = `/licitaciones/${faceta.familia}/${faceta.slug}`;

  return (
    <div className="clr-page">
      <style dangerouslySetInnerHTML={{ __html: ESTILOS_LISTA + ESTILOS_SEMAFORO }} />
      <div className="clr-container">
        <header className="lp-cab">
          <nav className="lp-cab-migas" aria-label="Ruta de navegación">
            <Link href="/licitaciones">Fichas de procesos</Link>
            {" · "}
            {NOMBRE_FAMILIA[faceta.familia]}
          </nav>
          <h1 className="lp-cab-h1">{faceta.label}</h1>
          <p className="lp-cab-desc">{faceta.descripcion}</p>
          <p className="lp-cab-conteo">
            {pagina.total.toLocaleString("es-CO")}{" "}
            {pagina.total === 1 ? "proceso abierto" : "procesos abiertos"}
          </p>
        </header>

        {pagina.items.length === 0 ? (
          <p className="lp-vacio">
            No hay procesos abiertos en esta faceta ahora mismo. La ingesta corre a diario.
          </p>
        ) : (
          <ul className="lp-lista">
            {pagina.items.map((p) => (
              <FilaProceso
                key={p.id}
                href={hrefDeProceso(p)}
                objeto={p.objeto}
                entidadNombre={p.entidadNombre}
                fechaPublicacion={p.fechaPublicacion}
                estadoActual={p.estadoActual}
                tipoProyecto={p.tipoProyecto}
                ocultarTipo={faceta.familia === "tipo"}
                /*
                  Lectura ABSOLUTA, no veredicto: estas rutas son la puerta de
                  entrada desde un buscador y quien llega no tiene perfil. El
                  semáforo enuncia lo que el proceso exige en cada eje; la mitad
                  que compara llega al definir perfil.
                */
                semaforo={<Semaforo compuertas={compuertasAbsolutas(p)} />}
              />
            ))}
          </ul>
        )}

        {totalPaginas > 1 && (
          <nav className="lp-pag" aria-label="Paginación">
            <span className="lp-pag-info">
              Página {pagina.pagina} de {totalPaginas.toLocaleString("es-CO")}
            </span>
            <span className="lp-pag-links">
              {pagina.pagina > 1 && (
                <Link
                  className="lp-pag-link"
                  href={pagina.pagina > 2 ? `${base}/pagina/${pagina.pagina - 1}` : base}
                >
                  ← Anterior
                </Link>
              )}
              {pagina.pagina < totalPaginas && (
                <Link className="lp-pag-link" href={`${base}/pagina/${pagina.pagina + 1}`}>
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
