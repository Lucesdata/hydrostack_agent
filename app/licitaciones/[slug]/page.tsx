import Link from "next/link";
import { notFound } from "next/navigation";
import BloqueDecision from "@/src/components/secop/ficha/BloqueDecision";
import CopiarNumero from "@/src/components/secop/ficha/CopiarNumero";
import CierreFicha from "@/src/components/secop/ficha/CierreFicha";
import PliegoFicha from "@/src/components/secop/ficha/PliegoFicha";
import RivalesFicha from "@/src/components/secop/ficha/RivalesFicha";
import { pliegoDeProceso } from "@/src/lib/secop/pliego-ficha";
import { ESTILOS_FICHA } from "@/src/components/secop/ficha/estilos";
import { compuertasAbsolutas } from "@/src/lib/secop/semaforo";
import {
  aSecopProceso,
  competidoresComparables,
  procesoPorSlug,
  slugDeProceso,
} from "@/src/lib/secop/ficha";
import { TIPO_PROYECTO } from "@/src/lib/classify/tipo-proyecto";
import { COLOR_TIPO } from "@/src/lib/classify/tipo-color";
import { formatCopFull } from "@/src/components/secop/format";
import { montoConDato } from "@/src/lib/secop/monto";

/**
 * Ficha pública de un proceso — PÚBLICA E INDEXABLE.
 *
 * Es la única página del producto que un buscador puede traer tráfico hacia:
 * hasta ahora el detalle vivía dentro de un componente de cliente sin URL.
 *
 * ISR de 1 hora y `generateStaticParams` VACÍO, por lo mismo que las rutas
 * facetadas: prerrenderizar miles de fichas en build ataría cada despliegue a
 * la base de producción. Con la lista vacía, la primera visita a cada ficha la
 * genera y la deja cacheada; el coste es una invocación por ficha y por hora,
 * no una por visitante.
 */
/**
 * Revalidación cada 12 horas: el doble que las facetas porque una ficha cambia
 * menos. Su objeto, su presupuesto y su entidad no se mueven una vez publicado
 * el proceso; lo único que cambia es el estado, y lo cambia la ingesta, que no
 * corre a diario (`vercel.json` tiene `"crons": []` — ver la nota de las rutas
 * facetadas).
 */
export const revalidate = 43200;

export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

const fecha = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })
    : null;

/** «14 oct 2026». En hora de Colombia, fijo: el servidor no debe depender de su huso. */
const fechaCorta = (iso: string | null) =>
  iso
    ? new Date(iso)
        .toLocaleDateString("es-CO", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "America/Bogota",
        })
        .replace(/\./g, "")
        .replace(/ de /g, " ")
    : null;

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const p = await procesoPorSlug(slug);
  if (!p) return { title: "Proceso no encontrado" };

  const lugar = [p.municipio, p.departamento].filter(Boolean).join(", ");
  const tipo = p.tipoProyecto ? TIPO_PROYECTO[p.tipoProyecto].label : "Agua y saneamiento";
  const objeto = (p.objeto ?? "Proceso de contratación").slice(0, 90);
  const valor = montoConDato(p.valorEstimado);

  return {
    // La geografía disponible es de la entidad, no del sitio de la obra.
    title: `${objeto}${lugar ? ` · Entidad en ${lugar}` : ""} · ${tipo}`,
    description: [
      `${p.entidadNombre ?? "Entidad estatal"} abrió este proceso de ${tipo.toLowerCase()}.${lugar ? ` Entidad ubicada en ${lugar}; lugar de ejecución sin confirmar.` : ""}`,
      valor !== null ? `Presupuesto oficial ${formatCopFull(valor)}.` : null,
      p.estadoActual ? `Estado: ${p.estadoActual}.` : null,
    ]
      .filter(Boolean)
      .join(" "),
    alternates: { canonical: `/licitaciones/${slug}` },
  };
}

export default async function FichaPage({ params }: Props) {
  const { slug } = await params;
  const p = await procesoPorSlug(slug);
  if (!p) notFound();

  // El slug canónico se deriva del proceso: si alguien llega con el texto
  // cambiado pero el id correcto, la página responde y la canónica de arriba
  // apunta al slug bueno. No se redirige para no pagar una invocación extra.
  const canonico = slugDeProceso(p.objeto, p.secopProcesoId);
  const [competidores, pliego] = await Promise.all([
    competidoresComparables(p),
    pliegoDeProceso(p.secopProcesoId),
  ]);
  const lugar = [p.municipio, p.departamento].filter(Boolean).join(", ");
  const valor = montoConDato(p.valorEstimado);

  const schema = {
    "@context": "https://schema.org",
    "@type": "GovernmentService",
    name: p.objeto ?? p.secopProcesoId,
    serviceType: p.tipoProyecto ? TIPO_PROYECTO[p.tipoProyecto].label : undefined,
    provider: p.entidadNombre
      ? { "@type": "GovernmentOrganization", name: p.entidadNombre }
      : undefined,
    // La geografía disponible ubica a la entidad, no demuestra el área de la obra.
    serviceOperator: { "@type": "Organization", name: "SECOP II" },
    url: `https://aqualicita.com/licitaciones/${canonico}`,
  };

  return (
    <div className="clr-page">
      <style dangerouslySetInnerHTML={{ __html: ESTILOS_FICHA }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <article className="fi">
        {/* 1 — Cabecera */}
        <nav className="fi-migas">
          <Link href="/licitaciones">Fichas de procesos</Link>
          {p.tipoProyecto && (
            <>
              {" · "}
              <Link href={`/licitaciones/tipo/${TIPO_PROYECTO[p.tipoProyecto].slug}`}>
                {TIPO_PROYECTO[p.tipoProyecto].label}
              </Link>
            </>
          )}
        </nav>

        <p className="fi-entidad">
          {p.entidadNombre ?? "Entidad sin resolver"}
          {lugar && <span className="fi-entidad-lugar"> · entidad en {lugar}</span>}
        </p>
        <h1 className="fi-h1">{p.objeto ?? p.secopProcesoId}</h1>

        <div className="fi-chips">
          {/* El tipo va primero y con su color de familia, siempre con el nombre
              escrito: color = tipo de obra, nunca estado. Ver tipo-color.ts.
              Solo tres chips: UNSPSC y tipo de contrato bajan al detalle. */}
          {p.tipoProyecto && (
            <span
              className={`fi-chip fi-chip--tipo fi-chip--${COLOR_TIPO[p.tipoProyecto].familia}`}
              style={{ ["--tipo" as string]: COLOR_TIPO[p.tipoProyecto].claro }}
            >
              <span className="fi-chip-punto" aria-hidden="true" />
              {TIPO_PROYECTO[p.tipoProyecto].label} · {COLOR_TIPO[p.tipoProyecto].familiaLabel}
            </span>
          )}
          {p.estadoActual && <span className="fi-chip fi-chip--estado">{p.estadoActual}</span>}
          {p.modalidad && <span className="fi-chip">{p.modalidad}</span>}
        </div>

        {/* Para el experto: el número a un clic y el expediente a otro. La ficha
            acompaña al SECOP II, no lo sustituye. */}
        <div className="fi-expediente">
          <CopiarNumero numero={p.secopProcesoId} />
          {p.url && (
            <a className="fi-btn" href={p.url} target="_blank" rel="noopener noreferrer">
              Abrir en SECOP II ↗
            </a>
          )}
        </div>

        {/* 2 — El bloque de decisión: veredicto, tres datos, las cinco compuertas
            y un único siguiente paso. Sustituye a «Cómo te queda a ti» y a
            «Cifras». Spec: docs/superpowers/specs/2026-09-28-ficha-bloque-decision.md */}
        <BloqueDecision
          proceso={aSecopProceso(p)}
          absolutas={compuertasAbsolutas(p)}
          conPliego={pliego !== null}
          urlSecop={p.url}
          presupuesto={valor !== null ? formatCopFull(valor) : "Sin presupuesto publicado"}
          conPresupuesto={valor !== null}
          fechaPublicacion={p.fechaPublicacion}
          fechaRecepcion={p.fechaRecepcion}
          fechaPublicacionTexto={fechaCorta(p.fechaPublicacion)}
          fechaRecepcionTexto={fechaCorta(p.fechaRecepcion)}
          estadoApertura={p.estadoApertura}
          modalidad={p.modalidad}
          hrefExplorar={
            p.tipoProyecto
              ? `/licitaciones/tipo/${TIPO_PROYECTO[p.tipoProyecto].slug}`
              : "/licitaciones/explorar"
          }
        />

        {/* 3 — Qué exige el pliego. El `id` es el ancla a la que vuelve la subida. */}
        <section className="fi-sec" id="pliego">
          <h2 className="fi-h2">Qué te exige el pliego</h2>
          <PliegoFicha pliego={pliego} slug={canonico} urlSecop={p.url} />
        </section>

        {/* 4 — Quién suele competir aquí */}
        <section className="fi-sec">
          <h2 className="fi-h2">Quién suele competir aquí</h2>
          {competidores.length > 0 ? (
            <RivalesFicha rivales={competidores} procesoId={p.secopProcesoId} slug={canonico} />
          ) : (
            <p className="fi-vacio">
              No hay histórico de oferentes para procesos comparables a este. Hace falta que el
              proceso tenga tipo y departamento resueltos, y que existan procesos cerrados del mismo
              perfil.
            </p>
          )}
        </section>

        {/* 5 — Fechas */}
        <section className="fi-sec">
          <h2 className="fi-h2">Fechas</h2>
          {pliego && pliego.cronograma.length > 0 ? (
            <div className="fi-panel">
              <table className="fi-tabla">
                <thead>
                  <tr>
                    <th>Hito</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {pliego.cronograma.map((h, i) => (
                    <tr key={i}>
                      <td>{h.hito}</td>
                      <td>{h.fecha ?? "Sin fecha en el pliego"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="fi-n2-nota">
                Del cronograma del pliego procesado, en «Qué te exige el pliego».
              </p>
            </div>
          ) : (
            <p className="fi-vacio">
              {p.fechaRecepcion ? (
                <>
                  Recepción de ofertas hasta el <strong>{fecha(p.fechaRecepcion)}</strong>. El resto
                  de hitos vive en el cronograma del pliego, que aún no se ha procesado para este
                  proceso.
                </>
              ) : (
                <>
                  <strong>El SECOP no publica la fecha de cierre en este dataset.</strong> La
                  ventana de apertura es lo único que llega ({p.estadoApertura ?? "sin dato"}); el
                  cronograma completo está en el pliego.
                </>
              )}
            </p>
          )}
        </section>

        {/* 6 — Detalle del proceso, plegado: lo que el experto consulta y el
            novato no necesita para decidir. */}
        <section className="fi-sec">
          <details className="fi-detalle">
            <summary className="fi-h2">Detalle del proceso</summary>
            <dl className="fi-pl-dl">
              {p.tipoContrato && (
                <div>
                  <dt>Tipo de contrato</dt>
                  <dd>{p.tipoContrato}</dd>
                </div>
              )}
              {p.unspsc && (
                <div>
                  <dt>Código UNSPSC</dt>
                  <dd>{p.unspsc.replace(/^V\d+\./i, "")}</dd>
                </div>
              )}
              <div>
                <dt>Acceso a documentos</dt>
                <dd>
                  {p.documentAccess === "UNKNOWN" || !p.documentAccess
                    ? "No verificado"
                    : p.documentAccess}
                  .{" "}
                  {p.url
                    ? "Comprueba en el expediente del SECOP II qué documentos están disponibles; todavía no se replican aquí."
                    : "Este proceso no publicó una URL de expediente."}
                </dd>
              </div>
            </dl>
          </details>
        </section>

        {/* 7 — Cierre */}
        <section className="fi-sec">
          <CierreFicha urlSecop={p.url} estadoApertura={p.estadoApertura} />
        </section>
      </article>
    </div>
  );
}
