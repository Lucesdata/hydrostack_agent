import Link from "next/link";
import { TIPOS_PROYECTO, TIPO_PROYECTO } from "@/src/lib/classify/tipo-proyecto";
import {
  ETIQUETA_ORDEN,
  MAX_Q,
  ORDENES_VITRINA,
  PRESUPUESTOS_MIN,
  SIN_FILTROS,
  etiquetaPresupuesto,
  hayFiltros,
  queryDeFiltros,
  type FiltrosVitrina as Filtros,
} from "@/src/lib/secop/filtros-vitrina";
import {
  ACTIVIDADES_BUSQUEDA,
  ETIQUETA_SISTEMA,
  ETIQUETA_SISTEMA_CORTA,
  SISTEMAS_AGRUPADOS,
  type SistemaBusqueda,
} from "@/src/lib/secop/busqueda-guiada";

function etiquetaTipo(t: SistemaBusqueda): string {
  return t === "potable" || t === "residual" ? ETIQUETA_SISTEMA[t] : TIPO_PROYECTO[t].label;
}
export interface OpcionDepartamento {
  slug: string;
  label: string;
  /** Procesos abiertos del departamento, para la lista. */
  n: number;
}

/**
 * Buscador y filtros de la vitrina, el único buscador del sitio. Lo que antes
 * vivía en «Explorar» (texto, departamento, valor mínimo, orden), en
 * «Descubrir» (la colección «Alto valor» y los atajos por tipo de obra) y en el
 * buscador guiado de #109 (sistema, actividad y número de proceso).
 *
 * Es un `<form method="get">` de servidor, sin JavaScript: se envía con
 * «Buscar» y el resultado es una URL normal. Los chips de debajo son enlaces
 * que ponen o quitan un filtro y conservan los demás.
 */
export default function FiltrosVitrina({
  filtros,
  departamentos,
}: {
  filtros: Filtros;
  departamentos: OpcionDepartamento[];
}) {
  const con = (cambio: Partial<Filtros>) =>
    `/licitaciones${queryDeFiltros({ ...filtros, ...cambio })}`;
  const nombreDpto = departamentos.find((d) => d.slug === filtros.departamento)?.label;

  const activos: { clave: string; label: string; href: string }[] = [];
  if (filtros.q) activos.push({ clave: "q", label: `«${filtros.q}»`, href: con({ q: null }) });
  if (filtros.numero)
    activos.push({
      clave: "numero",
      label: `Número «${filtros.numero}»`,
      href: con({ numero: null }),
    });
  if (filtros.tipo)
    activos.push({ clave: "tipo", label: etiquetaTipo(filtros.tipo), href: con({ tipo: null }) });
  if (filtros.actividad)
    activos.push({
      clave: "actividad",
      label: ACTIVIDADES_BUSQUEDA.find((a) => a.value === filtros.actividad)?.label ?? "",
      href: con({ actividad: null }),
    });
  if (filtros.departamento && nombreDpto)
    activos.push({ clave: "departamento", label: nombreDpto, href: con({ departamento: null }) });
  if (filtros.presupuestoMin)
    activos.push({
      clave: "presupuesto",
      label: `Presupuesto ${etiquetaPresupuesto(filtros.presupuestoMin)}`,
      href: con({ presupuestoMin: null }),
    });
  if (filtros.orden !== "relevancia")
    activos.push({
      clave: "orden",
      label: ETIQUETA_ORDEN[filtros.orden],
      href: con({ orden: "relevancia" }),
    });

  // Atajos: la colección «Alto valor» de Descubrir y los cuatro tipos de agua.
  const atajos = [
    ...TIPOS_PROYECTO.filter((t) => t !== "otros" && t !== filtros.tipo).map((t) => ({
      clave: `tipo-${t}`,
      label: TIPO_PROYECTO[t].label,
      href: con({ tipo: t }),
    })),
    ...(filtros.presupuestoMin
      ? []
      : [
          {
            clave: "alto-valor",
            label: "Alto valor · desde $500 M",
            href: con({ presupuestoMin: 500 }),
          },
        ]),
  ];

  return (
    <section className="vf" aria-label="Buscar y filtrar procesos abiertos">
      <form className="vf-form" method="get" action="/licitaciones" role="search">
        <label className="vf-campo vf-campo--q">
          <span className="vf-etiqueta">Buscar</span>
          <input
            className="clr-input"
            type="search"
            name="q"
            defaultValue={filtros.q ?? ""}
            maxLength={MAX_Q}
            placeholder="Objeto, entidad o municipio"
          />
        </label>
        <label className="vf-campo">
          <span className="vf-etiqueta">Tipo de obra</span>
          <select className="clr-select" name="tipo" defaultValue={filtros.tipo ?? ""}>
            <option value="">Todos los tipos</option>
            {SISTEMAS_AGRUPADOS.map((t) => (
              <option key={t} value={t} title={ETIQUETA_SISTEMA[t]}>
                {ETIQUETA_SISTEMA_CORTA[t]}
              </option>
            ))}
            {TIPOS_PROYECTO.map((t) => (
              <option key={t} value={t}>
                {TIPO_PROYECTO[t].label}
              </option>
            ))}
          </select>
        </label>
        <label className="vf-campo">
          <span className="vf-etiqueta">Actividad</span>
          <select className="clr-select" name="actividad" defaultValue={filtros.actividad ?? ""}>
            <option value="">Todas</option>
            {ACTIVIDADES_BUSQUEDA.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        {departamentos.length > 0 && (
          <label className="vf-campo">
            <span className="vf-etiqueta">Departamento</span>
            <select
              className="clr-select"
              name="departamento"
              defaultValue={nombreDpto ? (filtros.departamento ?? "") : ""}
            >
              <option value="">Todo el país</option>
              {departamentos.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.label} · {d.n.toLocaleString("es-CO")}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="vf-campo">
          <span className="vf-etiqueta">Presupuesto</span>
          <select
            className="clr-select"
            name="presupuesto"
            defaultValue={filtros.presupuestoMin ? String(filtros.presupuestoMin) : ""}
          >
            <option value="">Cualquiera</option>
            {PRESUPUESTOS_MIN.map((m) => (
              <option key={m} value={m}>
                {etiquetaPresupuesto(m)}
              </option>
            ))}
          </select>
        </label>
        <label className="vf-campo">
          <span className="vf-etiqueta">Ordenar</span>
          <select className="clr-select" name="orden" defaultValue={filtros.orden}>
            {ORDENES_VITRINA.map((o) => (
              <option key={o} value={o}>
                {ETIQUETA_ORDEN[o]}
              </option>
            ))}
          </select>
        </label>
        <button className="vf-buscar" type="submit">
          Buscar
        </button>
      </form>

      {/* Otro formulario y no otro campo: el número no se combina con los
          filtros (busca también entre los cerrados). */}
      <details className="vf-numero" open={!!filtros.numero}>
        <summary>¿Tienes el número del proceso?</summary>
        <form className="vf-numero-form" method="get" action="/licitaciones" role="search">
          <label className="vf-campo">
            <span className="vf-etiqueta">Número SECOP II o referencia</span>
            <input
              className="clr-input"
              type="search"
              name="numero"
              required
              defaultValue={filtros.numero ?? ""}
              maxLength={MAX_Q}
              placeholder="CO1.REQ.5720221 o la referencia de la entidad"
              autoComplete="off"
            />
          </label>
          <button className="vf-buscar" type="submit">
            Buscar proceso
          </button>
          <span className="vf-numero-ayuda">Incluye procesos abiertos y cerrados.</span>
        </form>
      </details>

      {(activos.length > 0 || atajos.length > 0) && (
        <div className="vf-chips">
          {activos.map((a) => (
            <Link key={a.clave} className="vf-chip vf-chip--activo" href={a.href}>
              {a.label}
              <span aria-hidden="true"> ✕</span>
              <span className="vf-oculto"> (quitar filtro)</span>
            </Link>
          ))}
          {hayFiltros(filtros) && (
            <Link className="vf-limpiar" href={`/licitaciones${queryDeFiltros(SIN_FILTROS)}`}>
              Quitar todos
            </Link>
          )}
          {atajos.length > 0 && (
            <span className="vf-atajos" aria-label="Atajos">
              {atajos.map((a) => (
                <Link key={a.clave} className="vf-chip" href={a.href}>
                  {a.label}
                </Link>
              ))}
            </span>
          )}
        </div>
      )}
    </section>
  );
}
