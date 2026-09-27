import { formatCopFull } from "@/src/components/secop/format";
import { subirPliegoDesdeFichaAction } from "@/src/lib/secop/pliego-actions";
import type { OrigenCampo, PliegoFicha as Pliego } from "@/src/lib/secop/pliego-ficha";
import { CUOTA_PLIEGOS, VENTANA_HORAS } from "@/src/lib/pliego/cuota-limites";
import AvisoPliego from "./AvisoPliego";

/**
 * §4 de la ficha, «Qué exige el pliego».
 *
 * Con pliego subido: requisitos habilitantes, presupuesto oficial y causales de
 * rechazo, cada bloque con su origen (reglas deterministas o modelo), y lo que
 * el pliego no declara dicho como tal. Sin pliego: qué haría falta y el
 * formulario para subirlo desde aquí mismo.
 *
 * Es un Server Component dentro de una página estática (ISR): no sabe quién
 * mira. El formulario se pinta para todos y la acción de servidor decide —
 * sin sesión manda a /login y vuelve—. Así la ficha no se vuelve dinámica por
 * un formulario. Sustituye a la antigua página /pliego (plan «la ficha como
 * centro», PR 2).
 */

const ORIGEN: Record<OrigenCampo, string> = {
  reglas: "leído con reglas deterministas",
  llm: "leído por el modelo; compruébalo en el pliego",
};

const CONFIANZA: Record<Pliego["confianza"], string> = {
  alta: "alta",
  media: "media",
  baja: "baja",
};

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });

export default function PliegoFicha({
  pliego,
  slug,
  urlSecop,
}: {
  pliego: Pliego | null;
  slug: string;
  urlSecop: string | null;
}) {
  return (
    <>
      <AvisoPliego />
      {pliego ? <Extraccion pliego={pliego} /> : <SinPliego urlSecop={urlSecop} />}
      <Formulario slug={slug} reemplaza={pliego !== null} />
    </>
  );
}

function SinPliego({ urlSecop }: { urlSecop: string | null }) {
  return (
    <p className="fi-vacio">
      <strong>Todavía no hay pliego procesado para este proceso.</strong> Los requisitos
      habilitantes —y si cada uno es subsanable o no— están en el pliego, no en los datos abiertos
      del SECOP.{" "}
      {urlSecop ? (
        <>
          Descarga el Documento Base desde el{" "}
          <a href={urlSecop} target="_blank" rel="noopener noreferrer">
            expediente en SECOP II
          </a>{" "}
          y súbelo aquí: queda disponible para cualquiera que abra esta ficha.
        </>
      ) : (
        <>
          Si tienes el Documento Base, súbelo aquí: queda disponible para cualquiera que abra esta
          ficha.
        </>
      )}
    </p>
  );
}

function Extraccion({ pliego }: { pliego: Pliego }) {
  return (
    <div className="fi-panel fi-pl">
      <p className="fi-pl-meta">
        Pliego «{pliego.nombreArchivo}», procesado el {fecha(pliego.actualizado)} · confianza{" "}
        {CONFIANZA[pliego.confianza]} ·{" "}
        {pliego.consistente ? (
          <span className="fi-pl-ok">el presupuesto cuadra ítem a ítem</span>
        ) : (
          <span className="fi-pl-aviso">el presupuesto no cuadra ítem a ítem: revísalo</span>
        )}
      </p>

      <h3 className="fi-pl-h3">Requisitos habilitantes</h3>
      <p className="fi-pl-origen">{ORIGEN[pliego.origen.requisitos]}</p>
      <dl className="fi-pl-dl">
        {pliego.requisitos.map((r) => (
          <div key={r.clave}>
            <dt>{r.etiqueta}</dt>
            <dd className={r.texto ? undefined : "fi-pl-falta"}>
              {r.texto ?? "El pliego no lo declara."}
            </dd>
          </div>
        ))}
      </dl>

      <h3 className="fi-pl-h3">Presupuesto oficial</h3>
      <p className="fi-pl-cifra">
        {pliego.presupuestoOficialCop !== null ? (
          formatCopFull(pliego.presupuestoOficialCop)
        ) : (
          <span className="fi-pl-falta">El pliego no lo declara.</span>
        )}
      </p>

      <h3 className="fi-pl-h3">Causales de rechazo y techos del presupuesto</h3>
      <p className="fi-pl-origen">{ORIGEN[pliego.origen.causales]}</p>
      {pliego.causales.length > 0 ? (
        <ul className="fi-pl-lista">
          {pliego.causales.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      ) : (
        <p className="fi-pl-falta">
          El pliego no declara causales de rechazo sobre el presupuesto.
        </p>
      )}

      {pliego.lagunas.length > 0 && (
        <>
          <h3 className="fi-pl-h3">Lo que el propio pliego deja abierto</h3>
          <ul className="fi-pl-lista">
            {pliego.lagunas.map((l, i) => (
              <li key={i}>
                <span className="fi-pl-sev">{l.severidad}</span> {l.descripcion}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Formulario({ slug, reemplaza }: { slug: string; reemplaza: boolean }) {
  const campos = (
    <form action={subirPliegoDesdeFichaAction} className="fi-pl-form">
      <input type="hidden" name="slug" value={slug} />
      <label>
        Documento Base (PDF, hasta 20 MB)
        <input type="file" name="file" accept="application/pdf,.pdf" required />
      </label>
      <label>
        Formulario 1 de presupuesto (Excel, opcional)
        <input type="file" name="formulario1" accept=".xls,.xlsx" />
      </label>
      <button type="submit" className="fi-btn fi-btn--primario">
        {reemplaza ? "Procesar y reemplazar" : "Procesar pliego"}
      </button>
      <p className="fi-pl-nota">
        Hace falta una cuenta gratuita, con hasta {CUOTA_PLIEGOS} pliegos cada {VENTANA_HORAS}{" "}
        horas. El proceso tarda entre 10 y 40 segundos; no cierres la pestaña.
      </p>
    </form>
  );

  // Con pliego ya procesado, el formulario se pliega: lo principal es leer.
  return reemplaza ? (
    <details className="fi-pl-reemplazo">
      <summary>¿Hay una versión más reciente del pliego? Súbela</summary>
      {campos}
    </details>
  ) : (
    campos
  );
}
