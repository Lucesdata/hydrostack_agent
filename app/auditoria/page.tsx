/**
 * Auditoría de descartes (SDD §6.2) — «qué me estoy perdiendo».
 *
 * Es la pantalla que justifica que `al_descartes` exista. Un criterio demasiado
 * estrecho **no produce falsos positivos: produce silencio**, y el silencio no se
 * ve. Aquí se ve.
 *
 * La muestra es aleatoria a propósito: mostrar siempre las primeras 25 llevaría a
 * dejar de leerlas. Refrescar trae otras.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { nivelDe, puede } from "@/src/lib/acceso/politica";
import { cuentaDe } from "@/src/lib/al/cuenta";
import { descartesPorMotivo, muestraDeDescartes } from "@/src/lib/al/matching/consulta-descartes";
import { formatCopCompact } from "@/src/components/secop/format";
import { STYLE } from "./estilos";
import { EXPLICA } from "./explica";

export const dynamic = "force-dynamic";

export const metadata = { title: "Auditoría de descartes · AquaLicita" };

type Props = { searchParams: Promise<{ motivo?: string }> };

export default async function AuditoriaPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!puede(nivelDe(user, null), "filtros")) redirect("/login?next=/auditoria");

  const accountId = cuentaDe(user);
  const { motivo } = await searchParams;
  const [motivos, muestra] = await Promise.all([
    descartesPorMotivo(accountId, 7),
    muestraDeDescartes(accountId, { motivo, limit: 25 }),
  ]);

  const total = motivos.reduce((a, m) => a + m.n, 0);

  return (
    <main className="clr-aud">
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <div className="clr-aud-inner">
        <h1 className="clr-aud-title">Qué se está descartando</h1>
        <p className="clr-aud-sub">
          Un criterio demasiado estrecho no produce falsos positivos: produce{" "}
          <strong>silencio</strong>. Esta pantalla existe para que ese silencio sea revisable.
          Últimos 7 días: <strong>{total.toLocaleString("es-CO")}</strong> descartes.{" "}
          <Link className="clr-aud-link" href="/mis-filtros">
            Ajustar mis filtros
          </Link>
        </p>

        {motivos.length === 0 ? (
          <p className="clr-aud-vacio">
            No hay descartes registrados en los últimos 7 días. Si tampoco tienes coincidencias,
            revisa que tengas algún filtro activo.
          </p>
        ) : (
          <>
            <h2 className="clr-aud-h2">Por motivo</h2>
            <ul className="clr-aud-motivos">
              {motivos.map((m) => (
                <li key={`${m.capa}-${m.motivo}`}>
                  <Link
                    className={`clr-aud-motivo${motivo === m.motivo ? " clr-aud-motivo--on" : ""}`}
                    href={`/auditoria?motivo=${encodeURIComponent(m.motivo)}`}
                  >
                    <span className="clr-aud-motivo-n">{m.n.toLocaleString("es-CO")}</span>
                    <span className="clr-aud-motivo-t">
                      {EXPLICA[m.motivo] ?? m.motivo}
                      <span className="clr-aud-capa">
                        {m.capa === "ingesta" ? "red de ingesta" : "tus filtros"}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        <h2 className="clr-aud-h2">
          Muestra aleatoria{motivo ? ` — ${EXPLICA[motivo] ?? motivo}` : ""}
        </h2>
        <p className="clr-aud-nota">
          Veinticinco al azar, no las primeras: mostrar siempre las mismas llevaría a dejar de
          leerlas. Recarga para ver otras.{" "}
          {motivo && (
            <Link className="clr-aud-link" href="/auditoria">
              Quitar el filtro de motivo
            </Link>
          )}
        </p>

        {muestra.length === 0 ? (
          <p className="clr-aud-vacio">Nada que mostrar con ese motivo.</p>
        ) : (
          <ul className="clr-aud-list">
            {muestra.map((d) => (
              <li className="clr-aud-card" key={`${d.secopProcesoId}-${d.motivo}`}>
                <p className="clr-aud-card-obj">{d.objetoResumen ?? "(sin objeto)"}</p>
                <p className="clr-aud-card-meta">
                  <span className="clr-aud-tag">{EXPLICA[d.motivo] ?? d.motivo}</span>
                  {d.filtroNombre ? ` · filtro “${d.filtroNombre}”` : " · red de ingesta"}
                  {d.unspscObservado ? ` · UNSPSC ${d.unspscObservado}` : " · sin UNSPSC"}
                  {d.valorEstimado ? ` · ${formatCopCompact(Number(d.valorEstimado))}` : ""}
                </p>
                <p className="clr-aud-card-id">
                  {d.secopProcesoId} · red {d.redVersion}
                </p>
              </li>
            ))}
          </ul>
        )}

        <p className="clr-aud-nota">
          <strong>Si al leer esta muestra encuentras licitaciones que sí te interesaban</strong>, el
          problema no es el motor: es la curación. Añade la palabra que falta a tu filtro. Cada
          descarte guarda la versión de la red que lo produjo, para poder distinguir lo que se
          descartó con criterios viejos de lo que se descarta hoy.
        </p>
      </div>
    </main>
  );
}
