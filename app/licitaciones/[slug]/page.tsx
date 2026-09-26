import Link from "next/link";
import { notFound } from "next/navigation";
import SemaforoConPerfil from "@/src/components/secop/ficha/SemaforoConPerfil";
import CierreFicha from "@/src/components/secop/ficha/CierreFicha";
import { ESTILOS_SEMAFORO } from "@/src/components/secop/semaforo/estilos";
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

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const p = await procesoPorSlug(slug);
  if (!p) return { title: "Proceso no encontrado" };

  const lugar = [p.municipio, p.departamento].filter(Boolean).join(", ");
  const tipo = p.tipoProyecto ? TIPO_PROYECTO[p.tipoProyecto].label : "Agua y saneamiento";
  const objeto = (p.objeto ?? "Proceso de contratación").slice(0, 90);
  const valor = montoConDato(p.valorEstimado);

  return {
    // Objeto + municipio + tipo, como pide el spec: es lo que alguien teclea.
    title: `${objeto}${lugar ? ` · ${lugar}` : ""} · ${tipo}`,
    description: [
      `${p.entidadNombre ?? "Entidad estatal"} abrió este proceso de ${tipo.toLowerCase()}${lugar ? ` en ${lugar}` : ""}.`,
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
  const competidores = await competidoresComparables(p);
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
    areaServed: lugar || undefined,
    serviceOperator: { "@type": "Organization", name: "SECOP II" },
    url: `https://aqualicita.com/licitaciones/${canonico}`,
  };

  return (
    <div className="clr-page">
      <style dangerouslySetInnerHTML={{ __html: ESTILOS_FICHA + ESTILOS_SEMAFORO }} />
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

        <p className="fi-entidad">{p.entidadNombre ?? "Entidad sin resolver"}</p>
        <h1 className="fi-h1">{p.objeto ?? p.secopProcesoId}</h1>

        <div className="fi-chips">
          {/* El tipo va primero y con su color de familia, siempre con el nombre
              escrito: color = tipo de obra, nunca estado. Ver tipo-color.ts. */}
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
          {p.tipoContrato && <span className="fi-chip">{p.tipoContrato}</span>}
          {p.unspsc && <span className="fi-chip">UNSPSC {p.unspsc.replace(/^V\d+\./i, "")}</span>}
          <span className="fi-chip">{p.secopProcesoId}</span>
          {lugar && <span className="fi-chip">{lugar}</span>}
        </div>

        {/* 2 — Cómo te queda a ti */}
        <section className="fi-sec">
          <h2 className="fi-h2">Cómo te queda a ti</h2>
          <div className="fi-panel">
            {/*
              El servidor pinta la lectura ABSOLUTA —lo que el proceso exige—, que
              es la que se cachea, la que indexa un buscador y la que ve quien
              llega sin nada. La isla de cliente la sustituye por la relativa si
              encuentra perfil. Ver SemaforoConPerfil para el porqué de que no se
              calcule aquí.
            */}
            <SemaforoConPerfil
              proceso={aSecopProceso(p)}
              absolutas={compuertasAbsolutas(p)}
              nota="Estas cinco son lecturas del proceso, no un dictamen de elegibilidad: quien decide si calificas es el pliego. Con un perfil definido, cada compuerta pasa de decir qué exige el proceso a decir cómo te queda a ti."
            />
          </div>
        </section>

        {/* 3 — Cifras */}
        <section className="fi-sec">
          <h2 className="fi-h2">Cifras</h2>
          <div className="fi-panel fi-cifras">
            <div>
              <div className="fi-cifra-v">{formatCopFull(valor)}</div>
              <div className="fi-cifra-l">Presupuesto oficial</div>
            </div>
            <div>
              <div className="fi-cifra-v">{fecha(p.fechaPublicacion) ?? "—"}</div>
              <div className="fi-cifra-l">Publicado</div>
            </div>
            {/*
              Anticipo, plazo de ejecución y parámetro técnico los pedía el spec y
              NO están en el dataset de Procesos del SECOP: viven en el pliego, y
              `pliego_proceso` está vacía. Se declaran como pendientes en vez de
              omitirse, para que se vea qué falta y no parezca que el proceso no
              lo tiene.
            */}
            {["Anticipo", "Plazo de ejecución", "Parámetro técnico"].map((l) => (
              <div key={l} className="fi-cifra--falta">
                <div className="fi-cifra-v">está en el pliego</div>
                <div className="fi-cifra-l">{l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 4 — Qué exige el pliego */}
        <section className="fi-sec">
          <h2 className="fi-h2">Qué exige el pliego</h2>
          <p className="fi-vacio">
            <strong>Todavía no hay requisitos extraídos para este proceso.</strong> Los requisitos
            habilitantes —y si cada uno es subsanable o no— están en el pliego, no en los datos
            abiertos del SECOP. El extractor existe y funciona; lo que falta es que el pliego de
            este proceso se haya publicado y procesado.
          </p>
        </section>

        {/* 5 — Cronograma */}
        <section className="fi-sec">
          <h2 className="fi-h2">Cronograma</h2>
          <p className="fi-vacio">
            {p.fechaRecepcion ? (
              <>
                Recepción de ofertas hasta el <strong>{fecha(p.fechaRecepcion)}</strong>. El resto
                de hitos vive en el cronograma del pliego, que aún no se ha procesado para este
                proceso.
              </>
            ) : (
              <>
                <strong>El SECOP no publica la fecha de cierre en este dataset.</strong> La ventana
                de apertura es lo único que llega ({p.estadoApertura ?? "sin dato"}); el cronograma
                completo está en el pliego.
              </>
            )}
          </p>
        </section>

        {/* 6 — Documentos */}
        <section className="fi-sec">
          <h2 className="fi-h2">Documentos</h2>
          <p className="fi-vacio">
            Estado de acceso: <strong>{p.documentAccess ?? "sin evaluar"}</strong>.{" "}
            {p.url ? (
              <>
                Los documentos se consultan en el expediente del SECOP II; todavía no se replican
                aquí.
              </>
            ) : (
              <>Este proceso no publicó una URL de expediente.</>
            )}
          </p>
        </section>

        {/* 7 — Quién suele competir aquí */}
        <section className="fi-sec">
          <h2 className="fi-h2">Quién suele competir aquí</h2>
          {competidores.length > 0 ? (
            <div className="fi-panel">
              <table className="fi-tabla">
                <thead>
                  <tr>
                    <th>Oferente</th>
                    <th className="num" style={{ textAlign: "right" }}>
                      Presentados
                    </th>
                    <th className="num" style={{ textAlign: "right" }}>
                      Ganados
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {competidores.map((c) => (
                    <tr key={c.nombre ?? Math.random()}>
                      <td>{c.nombre ?? "Sin nombre"}</td>
                      <td className="num">{c.presentados}</td>
                      <td className="num">{c.ganados}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="fi-n2-nota">
                Histórico de procesos comparables: mismo tipo de proyecto y mismo departamento, ya
                cerrados. No son los oferentes de este proceso — todavía no se sabe quién se
                presentará.
              </p>
            </div>
          ) : (
            <p className="fi-vacio">
              No hay histórico de oferentes para procesos comparables a este. Hace falta que el
              proceso tenga tipo y departamento resueltos, y que existan procesos cerrados del mismo
              perfil.
            </p>
          )}
        </section>

        {/* 8 — Nivel 2, desenfocado y no oculto */}
        <section className="fi-sec">
          <h2 className="fi-h2">Análisis de oferta</h2>
          <div className="fi-panel fi-n2">
            {[
              "Presupuesto desagregado por capítulo",
              "Rango probable de la oferta ganadora",
              "Probabilidad de adjudicación",
            ].map((l) => (
              <div key={l} className="fi-n2-fila">
                <span className="fi-n2-label">{l}</span>
                {/* Barra gris difuminada, NO una cifra falsa debajo: se ve que
                      la fila existe y qué mide, y no hay nada que descifrar. */}
                <span className="fi-n2-oculto" aria-hidden="true" />
                <span className="sr-only">Disponible en el nivel de análisis de pliego</span>
              </div>
            ))}
            <p className="fi-n2-nota">
              Estas tres salen del pliego procesado, no de los datos abiertos. Se muestran sin
              valores porque para este proceso todavía no existen — no es un muro de pago sobre algo
              ya calculado.
            </p>
          </div>
        </section>

        {/* 9 — Cierre */}
        <section className="fi-sec">
          <CierreFicha urlSecop={p.url} />
        </section>
      </article>
    </div>
  );
}
