/**
 * Ficha de un competidor (SDD módulo 2 + módulo 3).
 *
 * Junta el histórico y el historial sancionatorio porque son una sola pregunta:
 * contra quién compito y con quién estoy tratando. `historialCompetidor` ya
 * devuelve las dos cosas.
 *
 * Dos cosas que la pantalla dice explícitamente porque los datos obligan:
 *
 *  1. **Las sanciones directas y las inferidas se pintan distinto.** Una cuelga
 *     del documento del proveedor; la otra, de un proceso que ganó — probable,
 *     no cierto. Mezclarlas presentaría una inferencia como un hecho.
 *  2. **Sin NIT no se puede afirmar que esté limpio.** `cruzablePorDocumento:
 *     false` significa "no lo sabemos", y así se redacta.
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { nivelDe, puede } from "@/src/lib/acceso/politica";
import { historialCompetidor } from "@/src/lib/al/consulta/competidor";
import { formatCopCompact, formatShortDate } from "@/src/components/secop/format";
import { STYLE } from "../estilos";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ key: string }> };

function pct(v: number | null): string {
  return v === null || !Number.isFinite(v) ? "—" : `${(v * 100).toFixed(0)} %`;
}

function Cifra({ v, l }: { v: string; l: string }) {
  return (
    <div className="clr-cmp-cifra">
      <p className="clr-cmp-cifra-v">{v}</p>
      <p className="clr-cmp-cifra-l">{l}</p>
    </div>
  );
}

export default async function CompetidorPage({ params }: Props) {
  const user = await getSessionUser();
  const { key } = await params;
  if (!puede(nivelDe(user, null), "competidores")) {
    redirect(`/login?next=/competidores/${encodeURIComponent(key)}`);
  }

  const h = await historialCompetidor(decodeURIComponent(key));
  if (!h || h.participaciones === 0) notFound();

  const { sanciones } = h;

  return (
    <main className="clr-cmp">
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <div className="clr-cmp-inner">
        <Link className="clr-cmp-back" href="/competidores">
          ← Competidores
        </Link>

        <h1 className="clr-cmp-title">{h.proveedor.nombre ?? "(sin nombre)"}</h1>
        <p className="clr-cmp-sub">
          {h.proveedor.nitCanonico ? `NIT ${h.proveedor.nitCanonico}` : "Sin NIT publicado"} · agua
          y saneamiento
        </p>

        <div className="clr-cmp-cifras">
          <Cifra v={h.adjudicaciones.toLocaleString("es-CO")} l="Licitaciones ganadas" />
          <Cifra v={pct(h.tasaExito)} l="Tasa de éxito" />
          <Cifra
            v={formatCopCompact(h.valorTotalAdjudicado ? Number(h.valorTotalAdjudicado) : null)}
            l="Valor total adjudicado"
          />
          <Cifra v={pct(h.ratioAdjudicadoSobreEstimado)} l="Mediana adjudicado / presupuesto" />
        </div>

        {/* ── Sanciones ─────────────────────────────────────────────────── */}
        <h2 className="clr-cmp-h2">Historial sancionatorio</h2>

        {sanciones.directas.length === 0 && sanciones.porProceso.length === 0 ? (
          <div className="clr-cmp-limpio">
            {sanciones.cobertura.cruzablePorDocumento ? (
              <>Sin multas registradas a nombre de este NIT en las fuentes consultadas.</>
            ) : (
              <>
                <strong>No se puede verificar.</strong> Este proveedor no tiene NIT publicado en las
                adjudicaciones, así que no hay documento con el que cruzarlo contra las fuentes de
                sanciones. Esto <em>no</em> significa que esté limpio: significa que no lo sabemos.
              </>
            )}
          </div>
        ) : (
          <>
            {sanciones.directas.map((s, i) => (
              <div className="clr-cmp-sancion" key={`d${i}`}>
                <p className="clr-cmp-sancion-top">
                  {s.tipo ?? "Sanción"}
                  {s.valorSancion ? ` · ${formatCopCompact(Number(s.valorSancion))}` : ""}
                </p>
                <p className="clr-cmp-sancion-meta">
                  {s.entidadNombre ?? "—"} · {formatShortDate(s.fechaFirmeza)} ·{" "}
                  {s.numeroActo ?? "sin número de acto"}
                </p>
              </div>
            ))}

            {sanciones.porProceso.map((s, i) => (
              <div className="clr-cmp-sancion clr-cmp-sancion--inferida" key={`p${i}`}>
                <p className="clr-cmp-sancion-top">
                  {s.tipo ?? "Sanción"}
                  {s.valorSancion ? ` · ${formatCopCompact(Number(s.valorSancion))}` : ""}{" "}
                  <span style={{ fontWeight: 400, fontSize: 12 }}>— atribución probable</span>
                </p>
                <p className="clr-cmp-sancion-meta">
                  Recae sobre un proceso que este proveedor ganó ({s.secopProcesoId}), no sobre su
                  documento. El sancionado podría ser otro interviniente.
                </p>
              </div>
            ))}
          </>
        )}

        <p className="clr-cmp-aviso">
          Son <strong>multas contractuales</strong> de SECOP, no inhabilidades. Un hallazgo es una
          señal para verificar en la fuente oficial, nunca una afirmación de que una empresa esté
          inhabilitada para contratar: la homonimia de documento y los desfases de publicación son
          reales. Fuera de cobertura: {sanciones.cobertura.fuentesNoDisponibles.join("; ")}.
        </p>

        {/* ── Rivales ───────────────────────────────────────────────────── */}
        {h.rivalesFrecuentes.length > 0 && (
          <>
            <h2 className="clr-cmp-h2">Contra quién se cruza más</h2>
            <div className="clr-cmp-scroll">
              <table className="clr-cmp-tabla">
                <thead>
                  <tr>
                    <th scope="col">Rival</th>
                    <th scope="col" style={{ textAlign: "right" }}>
                      Se cruzaron
                    </th>
                    <th scope="col" style={{ textAlign: "right" }}>
                      Ganó el rival
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {h.rivalesFrecuentes.map((r) => (
                    <tr key={r.proveedorKey}>
                      <td>
                        <Link
                          className="clr-cmp-nombre"
                          href={`/competidores/${encodeURIComponent(r.proveedorKey)}`}
                        >
                          {r.nombre}
                        </Link>
                      </td>
                      <td className="clr-cmp-num">{r.encuentros}</td>
                      <td className="clr-cmp-num">{r.ganadosPorElRival}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Entidades ─────────────────────────────────────────────────── */}
        {h.porEntidad.length > 0 && (
          <>
            <h2 className="clr-cmp-h2">Con qué entidades contrata</h2>
            <div className="clr-cmp-scroll">
              <table className="clr-cmp-tabla">
                <thead>
                  <tr>
                    <th scope="col">Entidad</th>
                    <th scope="col" style={{ textAlign: "right" }}>
                      Ganadas
                    </th>
                    <th scope="col" style={{ textAlign: "right" }}>
                      Se presentó
                    </th>
                    <th scope="col" style={{ textAlign: "right" }}>
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {h.porEntidad.map((e, i) => (
                    <tr key={`${e.entidadNit ?? i}`}>
                      <td>{e.entidad ?? "—"}</td>
                      <td className="clr-cmp-num">{e.ganadas}</td>
                      <td className="clr-cmp-num">{e.participaciones}</td>
                      <td className="clr-cmp-num">
                        {formatCopCompact(e.valorGanado ? Number(e.valorGanado) : null)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Serie anual ───────────────────────────────────────────────── */}
        {h.porAnio.length > 0 && (
          <>
            <h2 className="clr-cmp-h2">Actividad por año</h2>
            <div className="clr-cmp-scroll">
              <table className="clr-cmp-tabla">
                <thead>
                  <tr>
                    <th scope="col">Año</th>
                    <th scope="col" style={{ textAlign: "right" }}>
                      Ganadas
                    </th>
                    <th scope="col" style={{ textAlign: "right" }}>
                      Se presentó
                    </th>
                    <th scope="col" style={{ textAlign: "right" }}>
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {h.porAnio.map((a) => (
                    <tr key={a.anio}>
                      <td className="clr-cmp-num" style={{ textAlign: "left" }}>
                        {a.anio}
                      </td>
                      <td className="clr-cmp-num">{a.ganadas}</td>
                      <td className="clr-cmp-num">{a.participaciones}</td>
                      <td className="clr-cmp-num">
                        {formatCopCompact(a.valorGanado ? Number(a.valorGanado) : null)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <p className="clr-cmp-nota">
          La base solo contiene actividad de <strong>agua y saneamiento</strong>: el filtro
          sectorial se aplica en la ingesta, así que esta ficha no dice nada de lo que este
          proveedor contrate en otros sectores. La mediana adjudicado/presupuesto por debajo del 100
          % significa que gana bajando el precio de referencia.
        </p>
      </div>
    </main>
  );
}
