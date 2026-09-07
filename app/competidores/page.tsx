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
import { redirect } from "next/navigation";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { nivelDe, puede } from "@/src/lib/acceso/politica";
import { topCompetidores } from "@/src/lib/al/consulta/competidor";
import { formatCopCompact, formatShortDate } from "@/src/components/secop/format";
import { STYLE } from "./estilos";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Competidores · AquaLicita",
  description: "Quién compite en agua y saneamiento, cuánto gana y a qué precio.",
};

type Props = { searchParams: Promise<{ q?: string }> };

export default async function CompetidoresPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!puede(nivelDe(user, null), "competidores")) redirect("/login?next=/competidores");

  const { q } = await searchParams;
  const filas = await topCompetidores({ q, limit: 60 });

  return (
    <main className="clr-cmp">
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <div className="clr-cmp-inner">
        <h1 className="clr-cmp-title">Competidores</h1>
        <p className="clr-cmp-sub">
          Quién se presenta a licitaciones de agua y saneamiento, cuántas gana y por cuánto.
          Construido sobre adjudicaciones y proponentes publicados desde 2016.
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
