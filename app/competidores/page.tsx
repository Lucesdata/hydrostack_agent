/**
 * Competidores del sector (SDD módulo 2) — listado y buscador.
 *
 * Server component puro, como `/mis-coincidencias`. Responde la primera mitad de
 * "contra quién compito": quién se presenta, cuánto gana y por cuánto. La ficha
 * de cada uno vive en `/competidores/[key]`.
 *
 * La llave de la URL es `proveedor_key`, no el NIT: **solo el 49% de las
 * adjudicaciones publica NIT**, y usar el NIT como identificador dejaría fuera a
 * la mitad de los competidores. `proveedor_key` es `nit:<nit>` cuando lo hay y
 * `nom:<nombre normalizado>` cuando no.
 */

import Link from "next/link";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { nivelDe, puede } from "@/src/lib/acceso/politica";
import { topCompetidores } from "@/src/lib/al/consulta/competidor";
import { getCifrasSector } from "@/src/lib/landing/cifras";
import S4Competidores from "@/src/components/landing/S4Competidores";
import { formatCopCompact, formatShortDate } from "@/src/components/secop/format";
import { STYLE } from "./estilos";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Competidores",
  description: "Quién compite en agua y saneamiento, cuánto gana y a qué precio.",
};

type Props = { searchParams: Promise<{ q?: string }> };

export default async function CompetidoresPage({ searchParams }: Props) {
  const user = await getSessionUser();
  const autorizado = puede(nivelDe(user, null), "competidores");

  /**
   * Sin sesión ya NO se redirige a /login: se muestra el argumento y la puerta.
   *
   * La sección "Inteligencia de mercado" bajó aquí desde la portada, y este
   * redirect la habría dejado invisible para cualquier visitante anónimo — lo
   * contrario de lo que se busca al sacarla de la portada, que era darle una
   * página propia y no enterrarla.
   *
   * Los DATOS siguen pidiendo cuenta: lo que se abre es el argumento de por qué
   * existen, no el listado. Es el mismo criterio que ya usa el veredicto, donde
   * el anónimo ve el semáforo y la explicación pide cuenta.
   */
  const { q } = await searchParams;
  const [filas, cifras] = await Promise.all([
    autorizado ? topCompetidores({ q, limit: 60 }) : Promise.resolve([]),
    getCifrasSector(),
  ]);

  if (!autorizado) {
    return (
      <main className="clr-cmp">
        <style dangerouslySetInnerHTML={{ __html: STYLE }} />
        <S4Competidores
          oferentesHistoricos={cifras.oferentesHistoricos}
          sanciones={cifras.sanciones}
          mostrarCta={false}
        />
        <div className="clr-cmp-inner">
          <p className="clr-cmp-sub">
            El listado de competidores —quién se presenta, cuántas gana y por cuánto— pide una
            cuenta gratuita.
          </p>
          <p className="clr-cmp-sub">
            La otra mitad, quién compra, se ve sin cuenta:{" "}
            <Link href="/licitaciones/entidades">las entidades con más procesos abiertos</Link>.
          </p>
          <p>
            <Link className="clr-cmp-btn" href="/registro?next=/competidores">
              Crear cuenta gratuita
            </Link>{" "}
            <Link className="clr-cmp-btn" href="/login?next=/competidores">
              Ya tengo cuenta
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="clr-cmp">
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <div className="clr-cmp-inner">
        <h1 className="clr-cmp-title">Competidores</h1>
        <p className="clr-cmp-sub">
          Quién se presenta a licitaciones de agua y saneamiento, cuántas gana y por cuánto.
          Construido sobre adjudicaciones y proponentes publicados desde 2016. La otra mitad,{" "}
          <Link href="/licitaciones/entidades">quién compra</Link>, está en su propia página.
        </p>

        <form className="clr-cmp-buscar" action="/competidores" method="get">
          <input
            className="clr-cmp-input"
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por razón social o NIT…"
            aria-label="Buscar competidor"
          />
          <button className="clr-cmp-btn" type="submit">
            Buscar
          </button>
        </form>

        {filas.length === 0 ? (
          <p className="clr-cmp-vacio">
            {q
              ? `Ningún competidor coincide con “${q}”. La fuente escribe la misma razón social de varias formas: prueba con una palabra suelta.`
              : "Todavía no hay histórico cargado."}
          </p>
        ) : (
          <div className="clr-cmp-scroll">
            <table className="clr-cmp-tabla">
              <thead>
                <tr>
                  <th scope="col">Proveedor</th>
                  <th scope="col" style={{ textAlign: "right" }}>
                    Ganadas
                  </th>
                  <th scope="col" style={{ textAlign: "right" }}>
                    Se presentó
                  </th>
                  <th scope="col" style={{ textAlign: "right" }}>
                    Valor ganado
                  </th>
                  <th scope="col" style={{ textAlign: "right" }}>
                    Última
                  </th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.proveedorKey}>
                    <td>
                      <Link
                        className="clr-cmp-nombre"
                        href={`/competidores/${encodeURIComponent(f.proveedorKey)}`}
                      >
                        {f.nombre ?? "(sin nombre)"}
                      </Link>
                      <span className="clr-cmp-nit">
                        {f.nitCanonico ? `NIT ${f.nitCanonico}` : "sin NIT publicado"}
                      </span>
                    </td>
                    <td className="clr-cmp-num">{f.adjudicaciones.toLocaleString("es-CO")}</td>
                    <td className="clr-cmp-num">{f.participaciones.toLocaleString("es-CO")}</td>
                    <td className="clr-cmp-num">
                      {formatCopCompact(f.valorGanado ? Number(f.valorGanado) : null)}
                    </td>
                    <td className="clr-cmp-num">{formatShortDate(f.ultimaFecha)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="clr-cmp-nota">
          “Se presentó” cuenta las veces que el proveedor aparece como proponente en un proceso.
          Solo las modalidades con pluralidad de oferentes publican esa lista: en contratación
          directa no existe, así que ahí solo consta quien ganó. El valor es el adjudicado; la
          fuente no publica lo que ofertó quien perdió.
        </p>
      </div>
    </main>
  );
}
