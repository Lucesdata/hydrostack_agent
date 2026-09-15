import Link from "next/link";
import { TIPO_PROYECTO, type TipoProyecto } from "@/src/lib/classify/tipo-proyecto";

/**
 * Una fila de proceso en lista densa.
 *
 * En escritorio la lista es densa y no una rejilla de tarjetas: se escana más
 * rápido y cabe más. Toda la fila es el enlace.
 *
 * Es un componente compartido a propósito. Lo usan las rutas facetadas y lo usará
 * la vitrina de la portada; si cada una dibujara su propia fila, el mismo proceso
 * se vería distinto según por dónde se llegue, y la etiqueta de tipo —que es una
 * de las cinco de la taxonomía— acabaría escrita a mano en dos sitios.
 *
 * El semáforo de cinco compuertas va en el hueco `semaforo`, como `ReactNode` y
 * no como lógica interna: en móvil pasa de línea a rejilla, y ese cambio tiene
 * que ser de disposición y no de cálculo.
 *
 * ── Por qué no hay columna de presupuesto ni de lugar ───────────────────────
 * El spec dibujaba cinco columnas: tipo, objeto, semáforo, presupuesto y fecha.
 * Esa fila asume un semáforo CON PERFIL, donde la compuerta de cuantía dice
 * "dentro de tu rango" y no una cifra.
 *
 * Sin perfil —que es como llega cualquiera desde un buscador— la compuerta
 * enuncia el valor, y entonces la fila decía "$350 M" dos veces: una en el
 * semáforo y otra en su columna. Igual con la zona y con el tipo. Se quitaron
 * las columnas duplicadas y no el semáforo, porque el semáforo es lo que
 * distingue al producto de un agregador y la columna era una cifra suelta.
 * Cuando haya perfil, la compuerta pasará a decir el veredicto y la cifra podrá
 * volver sin repetirse.
 */

export interface FilaProcesoProps {
  href: string;
  objeto: string | null;
  entidadNombre: string | null;
  fechaPublicacion: string | null;
  estadoActual: string | null;
  tipoProyecto: TipoProyecto | null;
  /**
   * Oculta la etiqueta de tipo. La usa la faceta de tipo: repetir "PTAR" en las
   * 25 filas de la página de PTAR no informa de nada y le roba sitio al objeto,
   * que es lo que el usuario lee. En una lista mezclada la etiqueta sí trabaja
   * — salvo que haya semáforo, y entonces se oculta sola: su compuerta de
   * Sector dice exactamente lo mismo.
   */
  ocultarTipo?: boolean;
  semaforo?: React.ReactNode;
}

function fecha(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export default function FilaProceso({
  href,
  objeto,
  entidadNombre,
  fechaPublicacion,
  estadoActual,
  tipoProyecto,
  ocultarTipo = false,
  semaforo,
}: FilaProcesoProps) {
  return (
    <li className="lp-fila">
      <Link href={href} className="lp-fila-link">
        <span className="lp-col-estado">
          <span className="lp-estado">{estadoActual ?? "—"}</span>
          {tipoProyecto && !ocultarTipo && !semaforo && (
            <span className="lp-tipo">{TIPO_PROYECTO[tipoProyecto].label}</span>
          )}
        </span>

        <span className="lp-col-objeto">
          <span className="lp-objeto">{objeto ?? "Sin objeto publicado"}</span>
          {/* El lugar no se repite aquí: lo lleva la compuerta de Zona. */}
          <span className="lp-meta">{entidadNombre ?? "Entidad sin resolver"}</span>
        </span>

        {/* El semáforo llega desde fuera; ver la nota de cabecera. */}
        {semaforo ? <span className="lp-col-semaforo">{semaforo}</span> : null}

        <span className="lp-col-fecha">
          <span className="lp-fecha-valor">{fecha(fechaPublicacion)}</span>
          <span className="lp-fecha-label">publicado</span>
        </span>
      </Link>
    </li>
  );
}
