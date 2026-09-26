import { ESTILOS_INFORME } from "./estilos";
import BotonImprimir from "./BotonImprimir";
import { formatConteo, formatCopEscala } from "@/src/components/secop/format";
import { titulo } from "@/src/components/landing/texto";
import { colorDeTipo } from "@/src/lib/classify/tipo-color";
import { TIPOS_PROYECTO, TIPO_PROYECTO } from "@/src/lib/classify/tipo-proyecto";
import type { Informe, MesInforme } from "@/src/lib/secop/informe";

/**
 * El informe pintado. Sin consultas: la página las hace y le pasa el
 * resultado, así se puede probar y previsualizar con datos de ejemplo.
 */

const pct = (n: number, total: number) =>
  total > 0
    ? `${((100 * n) / total).toLocaleString("es-CO", { maximumFractionDigits: 1 })} %`
    : "—";

export default function InformeVista({
  informe,
  abiertosHoy,
  mes,
  generado,
}: {
  informe: Informe | null;
  abiertosHoy: number | null;
  mes: MesInforme;
  generado: string;
}) {
  return (
    // clr-page da el fondo claro: el <body> del sitio es oscuro y sin él el
    // texto del informe quedaba oscuro sobre oscuro en pantalla.
    <div className="clr-page">
      <article className="inf">
        <style dangerouslySetInnerHTML={{ __html: ESTILOS_INFORME }} />
        <p className="inf-eyebrow">INFORME MENSUAL · AQUALICITA</p>
        <h1>El mercado del agua en Colombia</h1>
        <p className="inf-sub">
          {titulo(mes.etiqueta)} · procesos de agua y saneamiento publicados en el SECOP II.
        </p>
        <div className="inf-acciones">
          <BotonImprimir />
          <span className="inf-generado">Datos del SECOP II · generado el {generado}</span>
        </div>

        {!informe ? (
          <p className="inf-vacio">El informe no está disponible en este momento · —</p>
        ) : (
          <>
            <div className="inf-cifras">
              <p className="inf-cifra">
                <strong>{formatConteo(informe.publicados)}</strong>
                <span>procesos publicados en {mes.etiqueta}</span>
              </p>
              <p className="inf-cifra">
                <strong>
                  {informe.nConMonto > 0 ? formatCopEscala(informe.montoPublicado) : "—"}
                </strong>
                <span>
                  de presupuesto publicado · {formatConteo(informe.nConMonto)} de{" "}
                  {formatConteo(informe.publicados)} lo publican
                </span>
              </p>
              <p className="inf-cifra">
                <strong>{formatConteo(abiertosHoy)}</strong>
                <span>procesos abiertos a {generado}</span>
              </p>
            </div>

            <h2>Por tipo de obra</h2>
            <table>
              <thead>
                <tr>
                  <th scope="col">Tipo</th>
                  <th scope="col" className="num">
                    Procesos
                  </th>
                  <th scope="col" className="num">
                    Del mes
                  </th>
                </tr>
              </thead>
              <tbody>
                {TIPOS_PROYECTO.map((t) => {
                  const color = colorDeTipo(t)!;
                  return (
                    <tr key={t}>
                      <th scope="row">
                        <span
                          className={`inf-tipo${color.familia === "otros" ? " inf-tipo--otros" : ""}`}
                          style={{ "--tipo": color.claro } as React.CSSProperties}
                        >
                          <i aria-hidden="true" />
                          {TIPO_PROYECTO[t].label}
                        </span>
                      </th>
                      <td className="num">{formatConteo(informe.porTipo[t])}</td>
                      <td className="num">{pct(informe.porTipo[t], informe.publicados)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="inf-nota">No suman el total: hay procesos sin clasificar.</p>

            <Ranking titulo2="Departamentos con más procesos" filas={informe.departamentos} />
            <Ranking titulo2="Entidades que más contrataron" filas={informe.entidades} />
          </>
        )}

        <section className="inf-metodo" aria-label="Cómo se calcula">
          <h2>Cómo se calcula</h2>
          <ul>
            <li>
              Es el último mes completo, en hora de Colombia. Cuenta todo lo publicado ese mes, esté
              abierto o ya cerrado.
            </li>
            <li>
              El presupuesto suma solo los procesos que lo publican; el SECOP II marca con 0 los que
              no.
            </li>
            <li>El departamento es el de la sede de la entidad que contrata.</li>
            <li>
              El tipo de obra se clasifica por el texto del proceso. Fuente: datos abiertos del
              SECOP II (datos.gov.co).
            </li>
          </ul>
        </section>
      </article>
    </div>
  );
}

function Ranking({
  titulo2,
  filas,
}: {
  titulo2: string;
  filas: { nombre: string; n: number; monto: number }[];
}) {
  return (
    <>
      <h2>{titulo2}</h2>
      {filas.length === 0 ? (
        <p className="inf-nota">Sin procesos este mes.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Nombre</th>
              <th scope="col" className="num">
                Procesos
              </th>
              <th scope="col" className="num">
                Presupuesto publicado
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={f.nombre + i}>
                <td>{i + 1}</td>
                <th scope="row">{titulo(f.nombre)}</th>
                <td className="num">{formatConteo(f.n)}</td>
                <td className="num">{f.monto > 0 ? formatCopEscala(f.monto) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
