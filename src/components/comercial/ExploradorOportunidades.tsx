import { DEPARTAMENTOS } from "@/data/dane/divipola";
import { TIPOS_PROYECTO, TIPO_PROYECTO } from "@/src/lib/classify/tipo-proyecto";
import { ETIQUETA_SISTEMA_CORTA, SISTEMAS_AGRUPADOS } from "@/src/lib/secop/busqueda-guiada";
import { fechaLegible } from "@/src/lib/secop/etapa";
import { NODOS_TECNOLOGIA } from "@/src/lib/tecnologia/taxonomia-v1";
import type { Oportunidad, ResultadoExplorador } from "@/src/lib/comercial/explorador";
import { hrefExplorador, type ParametrosExplorador } from "@/src/lib/comercial/explorador-params";
import s from "./explorador.module.css";

const departamentos = (() => {
  const v = new Map<string, string>();
  for (const d of DEPARTAMENTOS) v.set(d.departamentoCodigo, d.departamentoNombre);
  return [...v.entries()].sort((a, b) => a[1].localeCompare(b[1], "es"));
})();

const pesos = (n: number | null) =>
  n === null ? "sin dato" : `$${Math.round(n).toLocaleString("es-CO")}`;

function tipoLabel(t: string | null): string | null {
  return (TIPOS_PROYECTO as readonly string[]).includes(t ?? "")
    ? TIPO_PROYECTO[t as (typeof TIPOS_PROYECTO)[number]].label
    : null;
}

function Tarjeta({ o }: { o: Oportunidad }) {
  const tipo = tipoLabel(o.tipoProyecto);
  const objeto = (o.objeto ?? "Sin objeto publicado").trim();
  return (
    <li className={s.card}>
      <div className={s.chips}>
        {o.tipo === "convocatoria" ? (
          <span className={`${s.chip} ${s.info}`}>▷ Convocatoria · recibe ofertas</span>
        ) : (
          <span className={`${s.chip} ${s.ok}`}>▶ En ejecución</span>
        )}
        {tipo ? <span className={`${s.chip} ${s.neutral}`}>{tipo}</span> : null}
        {o.tecnologias.slice(0, 3).map((t) => (
          <span
            className={`${s.chip} ${s.neutral}`}
            key={t.codigo}
            title={`Detectado en el texto: «${t.cita}»`}
          >
            {t.nombre} (AquaLicita)
          </span>
        ))}
      </div>
      <h3 className={s.cardTitle}>{objeto.length > 240 ? `${objeto.slice(0, 237)}…` : objeto}</h3>
      <p className={s.meta}>
        {o.entidad ?? "Entidad sin dato"}
        {o.sede ? ` · sede de la entidad: ${o.sede}` : ""}
      </p>
      {o.tipo === "convocatoria" ? (
        <div className={s.row}>
          <span>Presupuesto: {pesos(o.valor)}</span>
          <span>
            Cierre de ofertas:{" "}
            <strong>
              {o.diasRestantes === null
                ? "sin fecha"
                : o.diasRestantes <= 0
                  ? "hoy"
                  : `en ${o.diasRestantes} ${o.diasRestantes === 1 ? "día" : "días"}`}
            </strong>
            {o.fechaRecepcion ? ` (${fechaLegible(o.fechaRecepcion)})` : ""}
          </span>
        </div>
      ) : (
        <>
          <div className={s.row}>
            <span>Contratista: {o.contratista}</span>
            <span>Valor actual: {pesos(o.valor)}</span>
            <span>Fin previsto: {fechaLegible(o.fechaFin) ?? "sin dato"}</span>
          </div>
          <p className={s.meta} style={{ marginTop: 6 }}>
            Estado administrativo según SECOP{o.estado ? ` («${o.estado}»)` : ""}; no indica avance
            físico.
          </p>
        </>
      )}
      <div className={s.row}>
        <a className={s.link} href={o.href}>
          {o.tipo === "convocatoria" ? "Ver ficha del proceso" : "Ver ficha comercial"}
        </a>
      </div>
    </li>
  );
}

/**
 * Explorador de oportunidades (CI-11c). Componente de servidor, formulario GET
 * sin JavaScript de cliente. La etapa va siempre a la vista; la tecnología es
 * una clasificación de AquaLicita sobre el texto, y se dice. Prototipo aprobado:
 * docs/commercial-intelligence/prototipos/03-explorador.html
 */
export default function ExploradorOportunidades({
  params,
  resultado,
  error = false,
}: {
  params: ParametrosExplorador;
  resultado: ResultadoExplorador | null;
  error?: boolean;
}) {
  const hayFiltros = Boolean(params.tecnologia || params.tipo || params.departamento);
  const ultima = resultado ? Math.max(1, Math.ceil(resultado.total / resultado.porPagina)) : 1;

  return (
    <div className={s.page}>
      <h1 className={s.title}>Explorador de oportunidades</h1>
      <p className={s.lead}>
        Convocatorias abiertas y contratos en ejecución del sector de agua y saneamiento, con la
        etapa siempre visible y un filtro por tecnología.
      </p>

      <div className={s.layout}>
        <aside>
          <form className={s.filters} method="get" action="/comercial/explorar">
            <details open>
              <summary>Filtros</summary>
              <label className={s.label} htmlFor="f-etapa">
                Etapa
              </label>
              <select className={s.input} id="f-etapa" name="etapa" defaultValue={params.etapa}>
                <option value="convocatoria">Convocatoria (recibe ofertas)</option>
                <option value="ejecucion">En ejecución (contrato firmado)</option>
              </select>

              <label className={s.label} htmlFor="f-tec">
                Tecnología (clasificación AquaLicita)
              </label>
              <select
                className={s.input}
                id="f-tec"
                name="tecnologia"
                defaultValue={params.tecnologia ?? ""}
              >
                <option value="">Todas</option>
                {NODOS_TECNOLOGIA.map((n) => (
                  <option key={n.codigo} value={n.codigo}>
                    {n.padre ? "— " : ""}
                    {n.nombre_es}
                  </option>
                ))}
              </select>

              <label className={s.label} htmlFor="f-tipo">
                Tipo de proyecto
              </label>
              <select className={s.input} id="f-tipo" name="tipo" defaultValue={params.tipo ?? ""}>
                <option value="">Todos</option>
                {SISTEMAS_AGRUPADOS.map((x) => (
                  <option key={x} value={x}>
                    {ETIQUETA_SISTEMA_CORTA[x]}
                  </option>
                ))}
                {TIPOS_PROYECTO.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_PROYECTO[t].label}
                  </option>
                ))}
              </select>

              <label className={s.label} htmlFor="f-dep">
                Departamento (sede de la entidad)
              </label>
              <select
                className={s.input}
                id="f-dep"
                name="departamento"
                defaultValue={params.departamento ?? ""}
              >
                <option value="">Todos</option>
                {departamentos.map(([c, n]) => (
                  <option key={c} value={c}>
                    {n}
                  </option>
                ))}
              </select>

              <button className={s.btn} type="submit">
                Aplicar
              </button>
              {hayFiltros || params.etapa !== "convocatoria" ? (
                <a className={s.clear} href="/comercial/explorar">
                  Quitar filtros
                </a>
              ) : null}
            </details>
          </form>
        </aside>

        <section aria-label="Resultados">
          <p className={s.note}>
            La <strong>tecnología</strong> la detecta AquaLicita a partir del texto del objeto: no
            es un dato oficial y puede equivocarse. Una mención{" "}
            <strong>no demuestra una compra pendiente</strong>. La ubicación es la sede de la
            entidad, no el lugar de la obra.
          </p>

          {error || !resultado ? (
            <div className={s.empty} role="alert">
              No pudimos consultar los registros en este momento. Esta página no muestra cifras
              simuladas.
            </div>
          ) : (
            <>
              <p className={s.summary}>
                {resultado.total.toLocaleString("es-CO")}{" "}
                {params.tecnologia
                  ? "coincidencias de texto"
                  : resultado.total === 1
                    ? "resultado"
                    : "resultados"}
                {" · página "}
                {params.pagina} de {ultima}
                {resultado.descartadasPorContexto > 0
                  ? ` · ${resultado.descartadasPorContexto} de esta página se ocultaron porque el texto niega o excluye la tecnología (por ejemplo «no incluye…»)`
                  : ""}
              </p>
              {resultado.filas.length === 0 ? (
                <div className={s.empty}>
                  No hay resultados con estos filtros.{" "}
                  {hayFiltros ? (
                    <a className={s.link} href="/comercial/explorar">
                      Quitar filtros
                    </a>
                  ) : null}
                </div>
              ) : (
                <ul className={s.list}>
                  {resultado.filas.map((o) => (
                    <Tarjeta key={`${o.tipo}-${o.id}`} o={o} />
                  ))}
                </ul>
              )}
              <nav className={s.pager} aria-label="Paginación">
                {params.pagina > 1 ? (
                  <a className={s.link} href={hrefExplorador(params, params.pagina - 1)} rel="prev">
                    ← Anterior
                  </a>
                ) : (
                  <span className={s.dim}>← Anterior</span>
                )}
                {params.pagina < ultima ? (
                  <a className={s.link} href={hrefExplorador(params, params.pagina + 1)} rel="next">
                    Siguiente →
                  </a>
                ) : (
                  <span className={s.dim}>Siguiente →</span>
                )}
              </nav>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
