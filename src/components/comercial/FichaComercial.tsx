import { TIPO_PROYECTO, TIPOS_PROYECTO, type TipoProyecto } from "@/src/lib/classify/tipo-proyecto";
import type { FichaComercialContrato } from "@/src/lib/comercial/ficha-contrato";
import { fechaLegible } from "@/src/lib/secop/etapa";
import s from "./ficha-comercial.module.css";

const pesos = (n: number | null) =>
  n === null ? "sin dato" : `$${Math.round(n).toLocaleString("es-CO")}`;
const fecha = (iso: string | null) => fechaLegible(iso) ?? "sin dato";

const NATURALEZA: Record<string, string> = {
  bien: "Bien o equipo",
  servicio: "Servicio",
  mixto: "Bien o servicio",
};

/**
 * Ficha comercial de contrato (CI-11a). Componente de servidor, sin JavaScript
 * de cliente. Todo lo que no existe en los datos dice «sin dato»; ninguna
 * necesidad trae cantidades, especificaciones ni fechas porque el texto no las
 * da. Prototipo aprobado: docs/commercial-intelligence/prototipos/05-ficha-contrato.html
 */
export default function FichaComercial({ ficha }: { ficha: FichaComercialContrato }) {
  const tipo = (TIPOS_PROYECTO as readonly string[]).includes(ficha.tipoProyecto ?? "")
    ? TIPO_PROYECTO[ficha.tipoProyecto as TipoProyecto].label
    : null;

  return (
    <article className={s.page}>
      <p className={s.crumb}>Contrato {ficha.id}</p>
      <h1 className={s.title}>{ficha.objeto ?? "Contrato sin objeto publicado"}</h1>
      <p className={s.sub}>
        {ficha.entidad ?? "Entidad sin dato"}
        {ficha.ubicacionEntidad ? ` · sede de la entidad: ${ficha.ubicacionEntidad}` : ""}
      </p>

      <div className={s.chips}>
        {ficha.estadoSecop ? (
          <span className={`${s.chip} ${s.ok}`}>▶ {ficha.estadoSecop}</span>
        ) : null}
        {ficha.vigente === true ? (
          <span className={`${s.chip} ${s.ok}`}>✓ Vigente según sus fechas</span>
        ) : null}
        {ficha.vigente === false ? (
          <span className={`${s.chip} ${s.neutral}`}>■ Fecha fin cumplida</span>
        ) : null}
        {tipo ? <span className={`${s.chip} ${s.neutral}`}>{tipo}</span> : null}
      </div>

      <p className={s.note}>
        Estado administrativo según SECOP II. <strong>No indica avance físico de la obra</strong> ni
        que haya compras pendientes.
      </p>

      <div className={s.grid}>
        <section className={s.card} aria-labelledby="c-contrato">
          <h2 className={`${s.h2}`} id="c-contrato">
            Contrato
          </h2>
          <dl className={s.kv}>
            <dt>Valor actual</dt>
            <dd>{pesos(ficha.valorActual)}</dd>
            <dt>Valor inicial</dt>
            <dd>{pesos(ficha.valorInicial)}</dd>
            <dt>Firma</dt>
            <dd>{fecha(ficha.fechaFirma)}</dd>
            <dt>Inicio</dt>
            <dd>{fecha(ficha.fechaInicio)}</dd>
            <dt>Fin previsto</dt>
            <dd>{fecha(ficha.fechaFinActual)}</dd>
          </dl>
          <p className={s.muted}>Valores y fechas tal como los publica la entidad en SECOP.</p>
        </section>

        <section className={s.card} aria-labelledby="c-contratista">
          <h2 className={s.h2} id="c-contratista">
            Contratista
          </h2>
          {ficha.contratista.visible ? (
            <dl className={s.kv}>
              <dt>Nombre</dt>
              <dd>{ficha.contratista.nombre}</dd>
              <dt>NIT</dt>
              <dd>{ficha.contratista.nit}</dd>
              <dt>Estructura</dt>
              <dd>
                {ficha.contratista.estructuraPlural
                  ? "Consorcio o unión temporal"
                  : "Persona jurídica"}
              </dd>
              <dt>Integrantes</dt>
              <dd>
                <span className={`${s.chip} ${s.neutral}`}>Sin dato oficial</span>
              </dd>
            </dl>
          ) : (
            <p className={s.muted}>
              {ficha.tieneContratista
                ? "El contratista no se nombra: solo se muestran personas jurídicas con NIT."
                : "El contrato no publica contratista."}
            </p>
          )}
        </section>
      </div>

      <h2 className={s.h2}>Necesidades de suministro potenciales</h2>
      {ficha.necesidades.length > 0 ? (
        <ul className={s.list}>
          {ficha.necesidades.map((n) => (
            <li className={s.need} key={n.codigo}>
              <div className={s.needHead}>
                <strong>{n.nombre}</strong>
                <span className={`${s.chip} ${s.warn}`}>○ Inferida</span>
                <span className={`${s.chip} ${s.neutral}`}>{NATURALEZA[n.naturaleza]}</span>
                <span className={s.grade}>
                  <b>{n.calidadEvidencia}</b>
                  <span>Evidencia</span>
                </span>
              </div>
              <p className={s.quote}>«…{n.cita}…»</p>
              <dl className={s.kv}>
                <dt>Cantidad</dt>
                <dd>sin dato</dd>
                <dt>Especificaciones</dt>
                <dd>sin dato</dd>
                <dt>Fecha requerida</dt>
                <dd>sin dato</dd>
              </dl>
            </li>
          ))}
        </ul>
      ) : (
        <p className={s.muted}>
          El objeto del contrato no menciona bienes, equipos ni servicios que podamos identificar.
        </p>
      )}
      <p className={s.note} style={{ marginTop: 10 }}>
        «Inferida» significa que el texto del contrato lo menciona. Una mención{" "}
        <strong>no demuestra una compra pendiente</strong>: solo el contratista puede confirmarla.
      </p>

      <h2 className={s.h2}>Requisitos profesionales</h2>
      <div className={`${s.card} ${s.reserved}`}>
        <p style={{ margin: 0 }}>
          <strong>Sección de Talent Intelligence</strong>: aún no disponible.
        </p>
        <p className={s.muted} style={{ margin: "0.4rem 0 0" }}>
          Los requisitos de personal no equivalen a ofertas de empleo. Las necesidades de personal y
          de suministro son entidades distintas.
        </p>
      </div>

      <h2 className={s.h2}>Qué falta confirmar y restricciones</h2>
      <ul className={s.bullets}>
        <li>Si hay compras pendientes: solo el contratista puede decirlo.</li>
        <li>Cantidades, especificaciones y fechas de entrega: sin dato.</li>
        <li>
          La plataforma no contacta, no intermedia, no coordina precios ni verifica listas
          restrictivas.
        </li>
      </ul>
      {ficha.urlSecop ? (
        <p>
          <a className={s.link} href={ficha.urlSecop} rel="noopener noreferrer" target="_blank">
            Ver el contrato en SECOP II
          </a>
        </p>
      ) : null}
    </article>
  );
}
