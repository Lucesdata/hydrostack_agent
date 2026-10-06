import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import BloqueDecision from "@/src/components/secop/ficha/BloqueDecision";
import ExploradorFicha from "@/src/components/secop/ficha/ExploradorFicha";
import ProcesosCuenta from "@/src/components/mis-procesos/ProcesosCuenta";
import BotonGuardar from "@/src/components/mis-procesos/BotonGuardar";
import RegistroVisita from "@/src/components/mis-procesos/RegistroVisita";
import PliegoFicha from "@/src/components/secop/ficha/PliegoFicha";
import RivalesFicha from "@/src/components/secop/ficha/RivalesFicha";
import { pliegoDeProceso } from "@/src/lib/secop/pliego-ficha";
import { datosDecisionDe, urlSecopDe } from "@/src/lib/secop/datos-decision";
import { ESTILOS_FICHA } from "@/src/components/secop/ficha/estilos";
import {
  competidoresComparables,
  contratosDeProceso,
  procesoPorSlug,
  slugDeProceso,
} from "@/src/lib/secop/ficha";
import { etapaDeProceso, fechaLegible, sinFasePegada } from "@/src/lib/secop/etapa";
import { comoSeContrato } from "@/src/lib/secop/como-se-contrato";
import { explicacionModalidad } from "@/src/lib/secop/semaforo";
import { GLOSARIO, terminosDeFicha } from "@/src/lib/secop/glosario";
import { TIPO_PROYECTO } from "@/src/lib/classify/tipo-proyecto";
import { COLOR_TIPO } from "@/src/lib/classify/tipo-color";
import { formatCopFull, sentenceCaseTitle } from "@/src/components/secop/format";
import { montoConDato } from "@/src/lib/secop/monto";
import { jsonLdSeguro } from "@/src/lib/landing/dataset-jsonld";

// La navegación es local: misma URL pública, consultas y caché que la ficha anterior.
export const revalidate = 43200;
export async function generateStaticParams() {
  return [];
}
type Props = { params: Promise<{ slug: string }> };

const fecha = (iso: string | null) => {
  if (!iso) return null;
  const valor = new Date(iso);
  if (Number.isNaN(valor.getTime())) return null;
  return valor.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    // Son columnas DATE, no instantes: no trasladar medianoche al día anterior.
    timeZone: "UTC",
  });
};

function Fuente({ children, url }: { children: ReactNode; url: string | null }) {
  return (
    <details className="fi-fuente">
      <summary>¿De dónde sale esta información?</summary>
      <p>{children}</p>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer">
          Consultar expediente en SECOP II ↗
        </a>
      )}
    </details>
  );
}
/** `def`: la palabra explicada en una línea, junto al dato (regla R7 del spec). */
function Dato({ nombre, children, def }: { nombre: string; children: ReactNode; def?: string }) {
  return (
    <div className="fi-dato">
      <dt>{nombre}</dt>
      <dd>
        {children}
        {def && <span className="fi-def">{def}</span>}
      </dd>
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const p = await procesoPorSlug(slug);
  if (!p) return { title: "Proceso no encontrado" };
  const lugar = [p.municipio, p.departamento].filter(Boolean).join(", ");
  const tipo = p.tipoProyecto ? TIPO_PROYECTO[p.tipoProyecto].label : "Agua y saneamiento";
  const objeto = (p.objeto ?? "Proceso de contratación").slice(0, 90);
  const valor = montoConDato(p.valorEstimado);
  return {
    title: `${objeto}${lugar ? ` · Entidad en ${lugar}` : ""} · ${tipo}`,
    description: [
      `${p.entidadNombre ?? "Entidad estatal"} abrió este proceso de ${tipo.toLowerCase()}.${lugar ? ` Entidad ubicada en ${lugar}; lugar de ejecución sin confirmar.` : ""}`,
      valor !== null ? `Presupuesto oficial ${formatCopFull(valor)}.` : null,
      p.estadoActual ? `Estado: ${p.estadoActual}.` : null,
    ]
      .filter(Boolean)
      .join(" "),
    alternates: { canonical: `/licitaciones/${slugDeProceso(p.objeto, p.secopProcesoId)}` },
  };
}

export default async function FichaPage({ params }: Props) {
  const { slug } = await params;
  const p = await procesoPorSlug(slug);
  if (!p) notFound();
  const canonico = slugDeProceso(p.objeto, p.secopProcesoId);
  const [competidores, pliego, contratos] = await Promise.all([
    competidoresComparables(p),
    pliegoDeProceso(p.secopProcesoId),
    contratosDeProceso(p.id),
  ]);
  // Una sola respuesta a «¿en qué va?» (spec 2026-10-05-ficha-viva-ciclo-de-vida):
  // la regla manda sobre el estado del SECOP, que a veces se contradice.
  const etapa = etapaDeProceso({ ...p, contratos });
  const recibeOfertas = etapa.etapa === "recibe_ofertas";
  const contrato = etapa.contrato;
  // «Cómo se contrató» (PR 3): solo 2026, solo contratistas con NIT.
  const contratacion = comoSeContrato(p.fechaPublicacion, etapa.etapa, contratos);
  // C4: el valor publicado del contrato es un error de captura; no se pinta como dato.
  const cifraDudosa = etapa.contradicciones.some((c) => c.codigo === "C4");
  const modalidadExplicada = explicacionModalidad(p.modalidad);
  const glosario = terminosDeFicha({
    modalidad: p.modalidad,
    tieneUnspsc: !!p.unspsc,
    tieneNit: !!p.entidadNit,
    conPliego: pliego !== null,
    adjudicado: ["adjudicado", "contratado", "en_ejecucion", "plazo_cumplido"].includes(
      etapa.etapa
    ),
    conAdicion: !!contratacion?.contratos.some((c) => c.adicion !== null),
    conProrroga: !!contratacion?.contratos.some((c) => c.prorrogaDias !== null),
  });
  const lugar = [p.municipio, p.departamento].filter(Boolean).join(", ");
  const valor = montoConDato(p.valorEstimado);
  const capitulos = (pliego?.capitulos ?? []).filter((c) => c.items > 0);
  const titulo = sentenceCaseTitle(sinFasePegada(p.objeto ?? p.secopProcesoId));
  // Solo se acorta la presentación; el objeto oficial completo sigue accesible.
  const tituloCorto = titulo.length > 180 ? `${titulo.slice(0, 177).trimEnd()}…` : titulo;
  const urlSecop = urlSecopDe(p.url);
  const schema = {
    "@context": "https://schema.org",
    "@type": "GovernmentService",
    name: p.objeto ?? p.secopProcesoId,
    serviceType: p.tipoProyecto ? TIPO_PROYECTO[p.tipoProyecto].label : undefined,
    provider: p.entidadNombre
      ? { "@type": "GovernmentOrganization", name: p.entidadNombre }
      : undefined,
    // La ubicación de la entidad no demuestra el área de ejecución de la obra.
    serviceOperator: { "@type": "Organization", name: "SECOP II" },
    url: `https://aqualicita.com/licitaciones/${canonico}`,
  };
  const fuenteDatos = (
    <>
      Datos abiertos de SECOP II: objeto, entidad, presupuesto, fechas y estado registrados. Pueden
      cambiar; confirma la versión vigente en el expediente.
    </>
  );
  const fuentePliego = pliego ? (
    <>
      Pliego «{pliego.nombreArchivo}», procesado el {fecha(pliego.actualizado)}. Comprueba las
      fechas, las cifras y las adendas en el documento original.
    </>
  ) : (
    <>
      Todavía no hay un pliego procesado en esta ficha. Consulta los estudios previos y el pliego en
      el expediente; su ausencia aquí no significa que no existan.
    </>
  );

  const secciones = [
    {
      id: "resumen",
      etiqueta: "Resumen",
      contenido: (
        <>
          <p className="fi-sobretitulo">Lo esencial del proceso</p>
          <h2 className={`fi-presupuesto${valor === null ? " fi-presupuesto--falta" : ""}`}>
            {valor === null ? "Presupuesto por confirmar" : formatCopFull(valor)}
          </h2>
          <p className="fi-presupuesto-nota">Presupuesto oficial · Pesos colombianos</p>
          <dl className="fi-datos">
            <Dato nombre="Publicado">{fecha(p.fechaPublicacion) ?? "Sin fecha verificada"}</Dato>
            <Dato nombre="Cierre de ofertas">
              {pliego?.fechaCierre ?? fecha(p.fechaRecepcion) ?? "Por confirmar en SECOP II"}
            </Dato>
            <Dato nombre="Cómo se contrata">{p.modalidad ?? "Modalidad no informada"}</Dato>
          </dl>
          <Fuente url={urlSecop}>
            {fuenteDatos}
            {pliego?.fechaCierre && <> La fecha de cierre se tomó de «{pliego.nombreArchivo}».</>}
          </Fuente>
        </>
      ),
    },
    {
      id: "proposito",
      etiqueta: "¿Para qué?",
      contenido: (
        <>
          <p className="fi-sobretitulo">El propósito</p>
          <h2 className="fi-titulo-panel">¿Qué se quiere contratar?</h2>
          <p className="fi-texto">
            {sentenceCaseTitle(
              p.descripcion?.trim() ||
                p.objeto ||
                "La entidad no informó una descripción en los datos disponibles."
            )}
          </p>
          <div className="fi-nota">
            <strong>La necesidad, por verificar</strong>
            <p>
              Aún no tenemos una explicación verificada del problema, sus antecedentes o sus
              beneficiarios. El objeto del contrato describe lo que se pide, pero no explica por sí
              solo el porqué.
            </p>
          </div>
          <Fuente url={urlSecop}>
            {fuenteDatos} El texto de esta sección es el publicado por la entidad; no es una
            justificación elaborada por AquaLicita.
          </Fuente>
        </>
      ),
    },
    {
      id: "dinero",
      etiqueta: "Dinero",
      contenido: (
        <>
          <p className="fi-sobretitulo">Los recursos públicos</p>
          <h2 className="fi-titulo-panel">¿Cuánto se prevé gastar?</h2>
          <p className={`fi-presupuesto${valor === null ? " fi-presupuesto--falta" : ""}`}>
            {valor === null ? "Presupuesto por confirmar" : formatCopFull(valor)}
          </p>
          <p className="fi-presupuesto-nota">
            Publicado en SECOP II · No representa pagos realizados
          </p>
          {pliego?.presupuestoOficialCop !== null &&
            pliego?.presupuestoOficialCop !== undefined && (
              <dl className="fi-datos">
                <Dato nombre="Presupuesto leído del pliego">
                  {formatCopFull(pliego.presupuestoOficialCop)}
                </Dato>
              </dl>
            )}
          {capitulos.length > 0 && (
            <details className="fi-desplegable">
              <summary>Ver presupuesto por capítulos</summary>
              <dl className="fi-datos">
                {capitulos.map((c, i) => (
                  <Dato key={i} nombre={`${c.nombre} · ${c.items} ítems`}>
                    {formatCopFull(c.total)}
                  </Dato>
                ))}
              </dl>
              <p className="fi-ayuda">
                {pliego?.origen.capitulos === "reglas"
                  ? "Leído del Formulario 1 con reglas deterministas."
                  : "Extraído por el modelo; comprueba las cifras en el pliego."}
              </p>
            </details>
          )}
          <div className="fi-nota">
            <strong>Origen de los recursos por verificar</strong>
            <p>
              No hemos identificado las fuentes de financiación ni el costo total del proyecto. El
              presupuesto de este proceso puede cubrir solo una parte.
            </p>
          </div>
          <Fuente url={urlSecop}>
            {fuenteDatos}
            {pliego && <> {fuentePliego}</>}
          </Fuente>
        </>
      ),
    },
    {
      id: "plazos",
      etiqueta: "Plazos",
      contenido: (
        <>
          <p className="fi-sobretitulo">Los tiempos</p>
          <h2 className="fi-titulo-panel">¿En qué va el proceso?</h2>
          <dl className="fi-datos">
            <Dato nombre="Etapa">{etapa.nombre}</Dato>
            <Dato nombre="Estado según SECOP II">{p.estadoActual ?? "Sin estado informado"}</Dato>
            <Dato nombre="Publicación">{fecha(p.fechaPublicacion) ?? "Sin fecha verificada"}</Dato>
            <Dato nombre="Cierre de ofertas">
              {pliego?.fechaCierre ?? fecha(p.fechaRecepcion) ?? "Por confirmar en SECOP II"}
            </Dato>
            {contrato?.fechaFirma && (
              <Dato nombre="Firma del contrato">{fechaLegible(contrato.fechaFirma)}</Dato>
            )}
            <Dato nombre="Ejecución según el contrato">
              {contrato?.fechaInicio
                ? `Del ${fechaLegible(contrato.fechaInicio)}${
                    contrato.fechaFinActual || contrato.fechaFinInicial
                      ? ` al ${fechaLegible(contrato.fechaFinActual ?? contrato.fechaFinInicial)}`
                      : ""
                  }`
                : "Sin información verificada"}
            </Dato>
          </dl>
          {pliego && pliego.cronograma.length > 0 && (
            <details className="fi-desplegable">
              <summary>Ver cronograma del pliego</summary>
              <dl className="fi-datos">
                {pliego.cronograma.map((h, i) => (
                  <Dato key={i} nombre={h.hito}>
                    {h.fecha ?? "Sin fecha en el pliego"}
                  </Dato>
                ))}
              </dl>
            </details>
          )}
          <p className="fi-ayuda">
            El estado de la contratación no demuestra el avance de la obra. Las fechas pueden
            cambiar mediante adendas.
          </p>
          <Fuente url={urlSecop}>
            {fuenteDatos} {fuentePliego}
          </Fuente>
        </>
      ),
    },
    {
      id: "responsables",
      etiqueta: "Responsables",
      contenido: (
        <>
          <p className="fi-sobretitulo">Las personas y entidades</p>
          <h2 className="fi-titulo-panel">¿Quién responde?</h2>
          <dl className="fi-datos">
            <Dato nombre="Entidad contratante">{p.entidadNombre ?? "Entidad sin resolver"}</Dato>
            {p.entidadNit && (
              <Dato nombre="NIT de la entidad" def={GLOSARIO.nit.definicion}>
                {p.entidadNit}
              </Dato>
            )}
            <Dato nombre="Ubicación de la entidad">{lugar || "Sin ubicación resuelta"}</Dato>
            <Dato nombre="Contratista">
              {contratacion
                ? contratacion.contratos.map((c) => c.contratista).join(" · ")
                : "No identificado en esta ficha"}
            </Dato>
            <Dato nombre="Supervisión o interventoría">Por verificar</Dato>
          </dl>
          <div className="fi-nota">
            <strong>Lugar de ejecución por confirmar</strong>
            <p>
              La ubicación de la entidad no necesariamente es el lugar donde se ejecutará el
              proyecto.
            </p>
          </div>
          <Fuente url={urlSecop}>
            {fuenteDatos} «No identificado» describe la información de esta ficha, no la ausencia de
            un responsable.
          </Fuente>
        </>
      ),
    },
    {
      id: "metas",
      etiqueta: "Metas",
      contenido: (
        <>
          <p className="fi-sobretitulo">Los resultados esperados</p>
          <h2 className="fi-titulo-panel">¿Qué debe cumplir?</h2>
          <div className="fi-pendiente">
            <span aria-hidden="true">?</span>
            <div>
              <strong>Metas pendientes de verificar</strong>
              <p>
                Aún no tenemos cantidades de obra, beneficiarios o mejoras del servicio verificadas
                para este proceso.
              </p>
            </div>
          </div>
          <p className="fi-ayuda">
            Los estudios previos y el anexo técnico deben permitir conocer qué se entregará. Las
            actas e informes de ejecución permiten comprobar qué se cumplió.
          </p>
          <Fuente url={urlSecop}>
            {fuentePliego} Los requisitos para participar y los capítulos de presupuesto no se
            presentan como resultados alcanzados.
          </Fuente>
        </>
      ),
    },
    {
      id: "participar",
      etiqueta: "Participar",
      contenido: (
        <>
          <p className="fi-sobretitulo">Para tu empresa</p>
          <h2 className="fi-titulo-panel">
            {contratacion ? "¿Cómo se contrató?" : "¿Puedo participar?"}
          </h2>
          {recibeOfertas ? (
            /* El bloque de decisión (spec 2026-09-28-ficha-bloque-decision), alojado
               en «Quiero participar» como pide el spec de la ficha interactiva
               (2026-09-29). Solo invita a ofertar cuando el proceso recibe
               ofertas (spec 2026-10-05, criterio 7). */
            <BloqueDecision {...datosDecisionDe(p, { conPliego: pliego !== null })} />
          ) : (
            <div className="fi-nota">
              <strong>Este proceso no recibe ofertas ahora · {etapa.nombre}</strong>
              <p>{etapa.linea}</p>
              <Link className="fi-btn" href="/licitaciones">
                Explorar procesos que reciben ofertas
              </Link>
            </div>
          )}
          {contratacion && (
            <section id="como-se-contrato" className="fi-sec">
              <h3 className="fi-h2">Cómo se contrató</h3>
              <dl className="fi-datos">
                <Dato nombre="Modalidad">{p.modalidad ?? "Modalidad no informada"}</Dato>
              </dl>
              {modalidadExplicada && <p className="fi-ayuda">{modalidadExplicada}</p>}
              {contratacion.contratos.map((c, i) => (
                <dl className="fi-datos" key={i}>
                  <Dato nombre="Contratista">{c.contratista}</Dato>
                  <Dato nombre="Valor del contrato">
                    {cifraDudosa
                      ? "Cifra dudosa en la fuente: compruébala en el expediente"
                      : c.valor !== null
                        ? formatCopFull(c.valor)
                        : "No publicado"}
                  </Dato>
                  {c.adicion !== null && !cifraDudosa && (
                    <Dato nombre="Adición">{`Se adicionaron ${formatCopFull(c.adicion)}`}</Dato>
                  )}
                  <Dato nombre="Inicio">{c.inicio ?? "Sin fecha publicada"}</Dato>
                  <Dato nombre="Fin previsto">{c.finPrevisto ?? "Sin fecha publicada"}</Dato>
                  {c.prorrogaDias !== null && (
                    <Dato nombre="Prórroga">{`Se prorrogó ${c.prorrogaDias} días: termina el ${c.finActual}`}</Dato>
                  )}
                  {c.pagado !== null && (
                    <Dato nombre="Pagado según el SECOP">{formatCopFull(c.pagado)}</Dato>
                  )}
                  {c.estado && <Dato nombre="Estado del contrato según SECOP II">{c.estado}</Dato>}
                </dl>
              ))}
              {contratacion.ocultos > 0 && (
                <p className="fi-ayuda">
                  {contratacion.ocultos === 1
                    ? "Hay otro contrato con una persona natural: no se detalla."
                    : `Hay ${contratacion.ocultos} contratos más con personas naturales: no se detallan.`}
                </p>
              )}
              <p className="fi-ayuda">
                Según las fechas y valores publicados en SECOP II. No es avance de obra ni acta de
                entrega. Presupuesto, valor del contrato y pagado son cifras distintas.
              </p>
            </section>
          )}
          <section id="pliego" className="fi-sec">
            <h3 className="fi-h2">Requisitos y pliego</h3>
            <PliegoFicha pliego={pliego} slug={canonico} urlSecop={urlSecop} />
          </section>
          <details className="fi-desplegable">
            <summary>Quién suele competir en procesos similares</summary>
            {competidores.length > 0 ? (
              <RivalesFicha rivales={competidores} procesoId={p.secopProcesoId} slug={canonico} />
            ) : (
              <p className="fi-ayuda">No hay histórico disponible de oferentes comparables.</p>
            )}
          </details>
          <Fuente url={urlSecop}>
            {fuenteDatos} La comparación usa el perfil que defines. El histórico corresponde a otros
            procesos, no identifica al contratista de este.
          </Fuente>
        </>
      ),
    },
  ];

  return (
    <div className="clr-page fi-pagina">
      <style dangerouslySetInnerHTML={{ __html: ESTILOS_FICHA }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSeguro(schema) }}
      />
      <article className="fi fi-interactiva">
        <nav className="fi-migas" aria-label="Ruta de navegación">
          <Link href="/licitaciones">← Fichas de procesos</Link>
        </nav>
        <header className="fi-cabecera">
          <div className="fi-chips">
            {p.tipoProyecto && (
              <span
                className={`fi-chip fi-chip--tipo fi-chip--${COLOR_TIPO[p.tipoProyecto].familia}`}
                style={{ ["--tipo" as string]: COLOR_TIPO[p.tipoProyecto].claro }}
              >
                <span className="fi-chip-punto" aria-hidden="true" />
                {TIPO_PROYECTO[p.tipoProyecto].label}
              </span>
            )}
            <span className="fi-identificador">
              {sinFasePegada(p.referencia || p.secopProcesoId)}
            </span>
          </div>
          <h1 className="fi-h1">{tituloCorto}</h1>
          <p className="fi-entidad">{p.entidadNombre ?? "Entidad sin resolver"}</p>
          {lugar && <p className="fi-lugar">Entidad en {lugar}</p>}
          <p className="fi-estado">
            <span aria-hidden="true">◷</span> {etapa.nombre}
            <span className="fi-estado-nota">{etapa.linea}</span>
          </p>
          {etapa.contradicciones.length > 0 && (
            <div className="fi-nota" role="note">
              <strong>Revisa antes de confiar</strong>
              <ul>
                {etapa.contradicciones.map((c) => (
                  <li key={c.codigo}>{c.texto}</li>
                ))}
              </ul>
              <p>Son datos del SECOP II que no cuadran entre sí. Confírmalos en el expediente.</p>
            </div>
          )}
          <details className="fi-identificacion">
            <summary>Leer objeto completo y datos del proceso</summary>
            <p>{p.objeto ?? "Objeto no informado"}</p>
            <dl className="fi-datos">
              <Dato nombre="Identificador SECOP">{p.secopProcesoId}</Dato>
              <Dato nombre="Tipo de contrato">{p.tipoContrato ?? "No informado"}</Dato>
              {p.unspsc && (
                <Dato nombre="Código UNSPSC" def={GLOSARIO.unspsc.definicion}>
                  {p.unspsc.replace(/^V\d+\./i, "")}
                </Dato>
              )}
            </dl>
          </details>
        </header>
        <ProcesosCuenta ids={[p.secopProcesoId]}>
          <BotonGuardar
            procesoId={p.secopProcesoId}
            volver={`/licitaciones/${slugDeProceso(p.objeto, p.secopProcesoId)}`}
          />
          <a href="/mis-procesos">Mis procesos</a>
          <RegistroVisita procesoId={p.secopProcesoId} />
        </ProcesosCuenta>
        <ExploradorFicha secciones={secciones} />
        {/* Las palabras que esta ficha usa, explicadas en una línea (regla R7 del
            spec 2026-10-05). Solo las que aparecen; sin JavaScript. */}
        <details className="fi-desplegable fi-glosario">
          <summary>Palabras de esta ficha, explicadas</summary>
          <dl className="fi-datos">
            {glosario.map((g) => (
              <Dato key={g.termino} nombre={g.termino}>
                {g.definicion}
              </Dato>
            ))}
          </dl>
        </details>
        <footer className="fi-pie-ficha">
          <p>Información pública, al alcance de todos.</p>
          {urlSecop ? (
            <a href={urlSecop} target="_blank" rel="noopener noreferrer">
              Abrir expediente en SECOP II ↗
            </a>
          ) : (
            <span>Enlace al expediente no disponible</span>
          )}
        </footer>
      </article>
    </div>
  );
}
