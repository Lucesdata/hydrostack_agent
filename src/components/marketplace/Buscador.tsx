import {
  ETIQUETA_ORDEN,
  MAX_Q,
  ORDENES_VITRINA,
  PRESUPUESTOS_MIN,
  etiquetaPresupuesto,
  hayFiltros,
  type FiltrosVitrina,
} from "@/src/lib/secop/filtros-vitrina";
import { ETIQUETA_SISTEMA_CORTA, SISTEMAS_AGRUPADOS } from "@/src/lib/secop/busqueda-guiada";
import { TIPOS_PROYECTO, TIPO_PROYECTO } from "@/src/lib/classify/tipo-proyecto";
import type { OpcionTerritorio } from "@/src/lib/marketplace/territorios";
import { RUTA_MARKETPLACE } from "@/src/lib/marketplace/url";
import s from "./marketplace.module.css";

/**
 * El buscador: un formulario GET sin JavaScript (SPEC §5). Los parámetros son
 * los de la vitrina (`q`, `numero`, `tipo`, `departamento`, `presupuesto`,
 * `orden`), así que la URL es el estado y Atrás/recarga lo reconstruyen. Cambiar
 * un filtro vuelve a la página uno porque el formulario no envía `pagina`.
 */
export default function Buscador({
  filtros,
  territorios,
}: {
  filtros: FiltrosVitrina;
  territorios: OpcionTerritorio[];
}) {
  const avanzadoActivo = !!(
    filtros.numero ||
    filtros.departamento ||
    filtros.presupuestoMin ||
    filtros.orden !== "relevancia" ||
    (filtros.tipo && !(SISTEMAS_AGRUPADOS as readonly string[]).includes(filtros.tipo))
  );

  return (
    <form method="get" action={RUTA_MARKETPLACE} role="search" className={s.buscador}>
      <label htmlFor="mk-q" className={s.etiquetaBuscador}>
        Buscar por proceso, entidad o proyecto
      </label>
      <div className={s.campoBusqueda}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          key={filtros.q ?? ""}
          id="mk-q"
          name="q"
          type="search"
          defaultValue={filtros.q ?? ""}
          maxLength={MAX_Q}
          placeholder="Proceso, entidad o proyecto…"
          autoComplete="off"
        />
        <button type="submit" className={s.botonBuscar}>
          <span>Buscar</span>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
            <path d="M5 12h14m-5-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Se conservan los filtros que el formulario no edita. */}
      {filtros.tipo && (SISTEMAS_AGRUPADOS as readonly string[]).includes(filtros.tipo) ? (
        <input type="hidden" name="tipo" value={filtros.tipo} />
      ) : null}

      <details key={String(avanzadoActivo)} className={s.avanzados} open={avanzadoActivo || undefined}>
        <summary>Filtros avanzados</summary>
        <div className={s.rejillaFiltros}>
          <label>
            <span>Número de proceso</span>
            <input
              key={filtros.numero ?? ""}
              name="numero"
              type="text"
              defaultValue={filtros.numero ?? ""}
              maxLength={MAX_Q}
              placeholder="CO1.REQ.… o referencia"
              autoComplete="off"
            />
          </label>
          <label>
            <span>Departamento</span>
            {/* `key`: los campos no controlados no releen `defaultValue` cuando el mapa
                cambia la URL sin recargar; con la clave se vuelven a montar. */}
            <select key={filtros.departamento ?? ""} name="departamento" defaultValue={filtros.departamento ?? ""}>
              <option value="">Todos</option>
              {territorios.map((t) => (
                <option key={t.codigo} value={t.slug}>
                  {t.nombre} ({t.total.toLocaleString("es-CO")})
                </option>
              ))}
            </select>
          </label>
          {!filtros.tipo || !(SISTEMAS_AGRUPADOS as readonly string[]).includes(filtros.tipo) ? (
            <label>
              <span>Tipo de proyecto</span>
              <select key={filtros.tipo ?? ""} name="tipo" defaultValue={filtros.tipo ?? ""}>
                <option value="">Todos</option>
                {SISTEMAS_AGRUPADOS.map((v) => (
                  <option key={v} value={v}>
                    {ETIQUETA_SISTEMA_CORTA[v]}
                  </option>
                ))}
                {TIPOS_PROYECTO.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_PROYECTO[t].label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            <span>Presupuesto</span>
            <select key={filtros.presupuestoMin ?? ""} name="presupuesto" defaultValue={filtros.presupuestoMin ?? ""}>
              <option value="">Cualquiera</option>
              {PRESUPUESTOS_MIN.map((m) => (
                <option key={m} value={m}>
                  {etiquetaPresupuesto(m)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Orden</span>
            <select key={filtros.orden} name="orden" defaultValue={filtros.orden}>
              {ORDENES_VITRINA.map((o) => (
                <option key={o} value={o}>
                  {ETIQUETA_ORDEN[o]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className={s.notaFiltros}>
          Con un número de proceso se busca también entre los cerrados y se ignoran los demás filtros.
        </p>
      </details>

      {hayFiltros(filtros) ? (
        <a className={s.limpiar} href={RUTA_MARKETPLACE}>
          Limpiar filtros
        </a>
      ) : null}
    </form>
  );
}
