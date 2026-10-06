import { formatCopFull } from "@/src/components/secop/format";
import { subirPliegoDesdeFichaAction } from "@/src/lib/secop/pliego-actions";
import type { OrigenCampo, PliegoFicha as Pliego } from "@/src/lib/secop/pliego-ficha";
import { CUOTA_PLIEGOS, VENTANA_HORAS } from "@/src/lib/pliego/cuota-limites";
import { fechaInstanteColombia } from "@/src/lib/secop/fecha-instante";
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

/**
 * Sin pliego: «Lo que desbloquea el pliego». Junta lo que antes se repartía entre
 * tres casillas «está en el pliego», las filas grises de «Análisis de oferta» y
 * este párrafo (paso 3 del plan `2026-09-28-ficha-bloque-decision`). Sigue
 * diciendo que falta, pero como algo que el usuario puede conseguir.
 *
 * La lista es exactamente lo que el extractor saca (`PliegoFicha` en
 * `pliego-ficha.ts`): ni anticipo ni plazo de ejecución, que no extrae, ni el
 * rango de la oferta ganadora o la probabilidad de adjudicación, que no se
 * calculan para ningún proceso.
 */
function SinPliego({ urlSecop }: { urlSecop: string | null }) {
  return (
    <div className="fi-desbloquea">
      <p className="fi-desbloquea-titulo">
        <strong>Todavía no hay pliego procesado para este proceso.</strong> Esto es lo que se
        desbloquea al subirlo:
      </p>
      <ul className="fi-desbloquea-lista">
        <li>
          <strong>Requisitos habilitantes</strong>: experiencia e indicadores financieros exigidos,
          y cuáles se pueden subsanar. Revisa los requisitos extraídos y comprueba cómo se acreditan
          en el pliego vigente.
        </li>
        <li>
          <strong>Presupuesto oficial y por capítulo</strong>, con aviso si no cuadra ítem a ítem.
        </li>
        <li>
          <strong>Causales de rechazo</strong> sobre el presupuesto.
        </li>
        <li>
          <strong>El cronograma completo</strong>, no solo la fecha de cierre.
        </li>
        <li>
          <strong>Lo que el propio pliego deja abierto</strong>, para preguntarlo a tiempo.
        </li>
      </ul>
      <p className="fi-desbloquea-nota">
        Los datos abiertos del SECOP no traen nada de esto: está en el pliego.{" "}
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
    </div>
  );
}

function Extraccion({ pliego }: { pliego: Pliego }) {
  return (
    <div className="fi-panel fi-pl">
      <p className="fi-pl-meta">
        Pliego «{pliego.nombreArchivo}», procesado el{" "}
        {fechaInstanteColombia(pliego.actualizado) ?? "fecha por verificar"} · confianza{" "}
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
