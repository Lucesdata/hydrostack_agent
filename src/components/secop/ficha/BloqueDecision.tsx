"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import CanalCompuertas from "./CanalCompuertas";
import OferenteWizard from "../OferenteWizard";
import {
  compuertasDesdeVeredicto,
  explicacionModalidad,
  fraseVeredicto,
  siguientePaso,
  textoDiasRestantes,
  ventanaDeOfertas,
  type CompuertaVista,
  type DestinoPaso,
  type EstadoCompuerta,
} from "@/src/lib/secop/semaforo";
import { saveOferentePerfil, sincronizarPerfilConCuenta } from "@/src/lib/state/clientStore";
import type { OferenteProfile } from "@/src/lib/oferente/types";
import type { SecopProceso } from "@/src/lib/secop/types";
import type { VerdictRespuesta } from "@/src/lib/secop/verdict-publico";

/**
 * El bloque de decisión de la ficha: «¿Es para ti?» respondido arriba del todo.
 * Spec: docs/superpowers/specs/2026-09-28-ficha-bloque-decision.md.
 *
 * ── Por qué es una isla de cliente y no se calcula en el servidor ───────────
 * La ficha es estática con ISR: se genera una vez por ventana y se sirve de
 * caché a todo el mundo. Eso es lo que la hace barata e indexable, y es lo que
 * la convierte en la única puerta de entrada orgánica del producto.
 *
 * Calcular el veredicto en el servidor la volvería dinámica —una invocación por
 * visita— y el HTML dejaría de ser cacheable, porque sería distinto para cada
 * usuario. Se perdería el SEO para ganar una personalización que solo ve quien
 * ya tiene perfil.
 *
 * Así que el servidor sirve SIEMPRE la lectura absoluta (lo que el proceso
 * exige, que es lo que un buscador debe indexar y lo que ve quien llega sin
 * nada) y esta isla la sustituye por la relativa cuando encuentra un perfil.
 * Mejora progresiva: sin JavaScript o sin perfil, la página sigue diciendo algo
 * cierto y completo. Lo mismo con «quedan N días»: el HTML cacheado puede tener
 * 12 horas, así que la cuenta se hace aquí, después de montar.
 *
 * El perfil vive en dos sitios según haya cuenta o no —localStorage para
 * anónimos, oferente_perfil para sesiones—; `sincronizarPerfilConCuenta` los
 * reconcilia y sube el local a una cuenta nueva (D1: se define sin cuenta, y la
 * cuenta se pide al subir el pliego).
 *
 * Sustituye a `SemaforoConPerfil`, que solo usaba la ficha.
 */

export interface DatosDecision {
  /** Para `POST /api/secop/verdict`. */
  proceso: SecopProceso;
  /** La lectura absoluta que ya pintó el servidor: el estado inicial, no un cargando. */
  absolutas: CompuertaVista[];
  conPliego: boolean;
  urlSecop: string | null;
  /** Ya formateado en el servidor; nunca «$0» (criterio 8). */
  presupuesto: string;
  conPresupuesto: boolean;
  fechaPublicacion: string | null;
  fechaRecepcion: string | null;
  /** «14 oct 2026», formateado en el servidor para no depender del huso del navegador. */
  fechaRecepcionTexto: string | null;
  fechaPublicacionTexto: string | null;
  estadoApertura: string | null;
  modalidad: string | null;
  hrefExplorar: string;
  /**
   * Dónde está la ficha, para los pasos que llevan a su pliego (`#pliego`).
   * Vacío en la propia ficha; la ruta de la ficha en el panel del Radar de la
   * vitrina, que no tiene pliego propio.
   */
  hrefFicha?: string;
}

const PLURAL: Partial<Record<EstadoCompuerta, [string, string]>> = {
  PASS: ["cumple", "cumplen"],
  WARN: ["por revisar", "por revisar"],
  FAIL: ["no cumple", "no cumplen"],
  UNKNOWN: ["sin datos", "sin datos"],
};

/** «4 cumplen · 1 sin datos». Sin perfil no hay conteo que dar. */
function resumenCanal(compuertas: CompuertaVista[], relativo: boolean): string {
  if (!relativo) return "Lecturas del proceso · aún sin tu perfil";
  return (["PASS", "WARN", "FAIL", "UNKNOWN"] as EstadoCompuerta[])
    .map((e) => {
      const n = compuertas.filter((c) => c.estado === e).length;
      const [uno, varios] = PLURAL[e]!;
      return n > 0 ? `${n} ${n === 1 ? uno : varios}` : null;
    })
    .filter(Boolean)
    .join(" · ");
}

const PASOS = ["Tu perfil", "El pliego", "Ofertar en SECOP II"] as const;

/**
 * A dónde lleva cada paso que es un enlace. Los del pliego van a `#pliego` de
 * la ficha: en la propia ficha `hrefFicha` es vacío, y en el panel del Radar de
 * la vitrina es la ruta de la ficha, que es donde está el pliego.
 */
export function hrefsDePaso(
  props: Pick<DatosDecision, "urlSecop" | "hrefExplorar" | "hrefFicha">
): Record<Exclude<DestinoPaso, "definir-perfil" | "ver-porque">, string | null> {
  const pliego = `${props.hrefFicha ?? ""}#pliego`;
  return {
    "subir-pliego": pliego,
    "requisitos-pliego": pliego,
    "completar-perfil": "/perfil",
    "ofertar-secop": props.urlSecop,
    "expediente-secop": props.urlSecop,
    explorar: props.hrefExplorar,
  };
}

export default function BloqueDecision(props: DatosDecision) {
  const { proceso, absolutas, conPliego } = props;
  const [compuertas, setCompuertas] = useState<CompuertaVista[]>(absolutas);
  const [relativo, setRelativo] = useState(false);
  const [conCuenta, setConCuenta] = useState(false);
  const [creandoPerfil, setCreandoPerfil] = useState(false);
  const [ahora, setAhora] = useState<number | null>(null);
  const wizardRef = useRef<HTMLDivElement>(null);

  const pedirVeredicto = useCallback(
    async (perfil: OferenteProfile) => {
      try {
        const res = await fetch("/api/secop/verdict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proceso, perfil }),
        });
        if (!res.ok) {
          console.warn(`ficha: el veredicto respondió ${res.status}; se queda la lectura absoluta`);
          return;
        }
        const { verdict } = (await res.json()) as { verdict: VerdictRespuesta };
        setCompuertas(compuertasDesdeVeredicto(verdict));
        setRelativo(true);
      } catch (err) {
        // Se queda con la lectura absoluta, que ya está en pantalla y es cierta.
        console.warn("ficha: no se pudo calcular el veredicto", err);
      }
    },
    [proceso]
  );

  useEffect(() => {
    setAhora(Date.now());
    let vivo = true;
    (async () => {
      const { perfil, conCuenta: cuenta } = await sincronizarPerfilConCuenta();
      if (!vivo) return;
      setConCuenta(cuenta);
      if (perfil) await pedirVeredicto(perfil);
    })();
    return () => {
      vivo = false;
    };
  }, [pedirVeredicto]);

  useEffect(() => {
    if (creandoPerfil) wizardRef.current?.focus();
  }, [creandoPerfil]);

  function perfilDefinido(perfil: OferenteProfile) {
    saveOferentePerfil(perfil);
    setCreandoPerfil(false);
    if (conCuenta) {
      fetch("/api/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(perfil),
      }).catch((err) => console.warn("ficha: no se pudo guardar el perfil en la cuenta", err));
    }
    void pedirVeredicto(perfil);
  }

  const frase = fraseVeredicto(compuertas, relativo);
  const paso = siguientePaso({ relativo, conCuenta, conPliego, compuertas });
  const ventana =
    ahora === null ? null : ventanaDeOfertas(props.fechaPublicacion, props.fechaRecepcion, ahora);
  const queEs = explicacionModalidad(props.modalidad);

  const href = hrefsDePaso(props);

  function accion(destino: DestinoPaso, texto: string, clase: string) {
    // «Ver por qué» no toca el hash: la ficha interactiva lee el hash para elegir
    // sección, y `#fd-porque` la habría devuelto al Resumen.
    if (destino === "ver-porque") {
      return (
        <button
          type="button"
          className={clase}
          onClick={() => {
            const porque = document.getElementById("fd-porque") as HTMLDetailsElement | null;
            if (porque) {
              porque.open = true;
              porque.scrollIntoView({ block: "start" });
            }
          }}
        >
          {texto}
        </button>
      );
    }
    if (destino === "definir-perfil") {
      return (
        <button type="button" className={clase} onClick={() => setCreandoPerfil(true)}>
          {texto}
        </button>
      );
    }
    const destinoHref = href[destino];
    if (!destinoHref) return null;
    const externo = destinoHref.startsWith("http");
    return externo ? (
      <a className={clase} href={destinoHref} target="_blank" rel="noopener noreferrer">
        {texto}
      </a>
    ) : (
      <Link className={clase} href={destinoHref}>
        {texto}
      </Link>
    );
  }

  const redactadas = compuertas.some((c) => c.redactada);

  return (
    <section className="fd" aria-labelledby="fd-titulo">
      <div className="fd-banda">
        <div className="fd-veredicto">
          <ol className="fd-pasos" aria-label="Tu recorrido con este proceso">
            {PASOS.map((nombre, i) => (
              <li
                key={nombre}
                className={`fd-paso${i < paso.paso ? " is-hecho" : i === paso.paso ? " is-actual" : ""}`}
                aria-current={i === paso.paso ? "step" : undefined}
              >
                <span className="fd-paso-marca" aria-hidden="true">
                  {i < paso.paso ? "✓" : i + 1}
                </span>
                {nombre}
              </li>
            ))}
          </ol>
          <p className="fd-antetitulo">¿Es para ti?</p>
          <h2 id="fd-titulo" className="fd-titulo">
            {frase.titulo}
          </h2>
          <p className="fd-bajada">{frase.bajada}</p>
        </div>

        <dl className="fd-datos">
          <div>
            <dt>¿Cuánto?</dt>
            <dd className={`fd-cifra${props.conPresupuesto ? "" : " fd-cifra--falta"}`}>
              {props.presupuesto}
            </dd>
            <dd className="fd-nota">
              {props.conPresupuesto
                ? "Presupuesto oficial publicado"
                : "El SECOP no publica el presupuesto de este proceso"}
            </dd>
          </div>
          <div>
            <dt>¿Hasta cuándo?</dt>
            {props.fechaRecepcionTexto ? (
              <>
                <dd className="fd-fecha">
                  {props.fechaRecepcionTexto}
                  {ventana && (
                    <span className="fd-restan">{textoDiasRestantes(ventana.diasRestantes)}</span>
                  )}
                </dd>
                {ventana && (
                  <dd
                    className="fd-barra"
                    role="img"
                    aria-label={`Ha pasado el ${Math.round(ventana.transcurrido * 100)} % del plazo de ofertas`}
                  >
                    <span style={{ width: `${Math.round(ventana.transcurrido * 100)}%` }} />
                  </dd>
                )}
                <dd className="fd-nota">
                  {props.fechaPublicacionTexto
                    ? `Publicado el ${props.fechaPublicacionTexto} · cierre de recepción de ofertas`
                    : "Cierre de recepción de ofertas"}
                </dd>
              </>
            ) : (
              <dd className="fd-nota fd-nota--sola">
                {props.estadoApertura === "Abierto"
                  ? "Abierto a ofertas. El SECOP no publica la fecha de cierre en este dataset: está en el cronograma del pliego."
                  : "El SECOP no publica la fecha de cierre en este dataset."}
              </dd>
            )}
          </div>
          {props.modalidad && (
            <div>
              <dt>¿Cómo se contrata?</dt>
              <dd className="fd-modalidad">{props.modalidad}</dd>
              {queEs && (
                <dd className="fd-nota">
                  <details className="fd-que-es">
                    <summary>¿Qué significa?</summary>
                    <p>{queEs}</p>
                  </details>
                </dd>
              )}
            </div>
          )}
        </dl>
      </div>

      <div className="fd-cuerpo">
        <div className="fd-cabeza-canal">
          <h3 className="fd-h3">Las cinco compuertas</h3>
          <span className="fd-resumen">{resumenCanal(compuertas, relativo)}</span>
        </div>
        <CanalCompuertas compuertas={compuertas} relativo={relativo} />

        <details className="fd-porque" id="fd-porque" open>
          <summary>Por qué, una por una</summary>
          <dl>
            {compuertas.map((c) => (
              <div key={c.clave}>
                <dt>{c.etiqueta}</dt>
                <dd>
                  {c.redactada ? (
                    <Link href="/registro">Ver por qué: pide una cuenta gratuita</Link>
                  ) : (
                    (c.explicacion ?? "Este dato no está publicado en el SECOP para este proceso.")
                  )}
                </dd>
              </div>
            ))}
          </dl>
          {redactadas && (
            <p className="fd-nota-cuerpo">
              Con tu perfil ya ves si cumples; el porqué de cada compuerta se ve con una cuenta
              gratuita.
            </p>
          )}
        </details>

        <details className="fd-primera-vez">
          <summary>¿Primera vez? Cómo leer las compuertas</summary>
          <p>
            Una compuerta <strong>arriba</strong> deja pasar el agua: cumples.{" "}
            <strong>A media altura</strong>: hay algo que revisar. <strong>Abajo</strong>: no
            cumples. <strong>Punteada</strong>: todavía no hay dato para saberlo. Sin tu perfil,
            cada una dice lo que exige el proceso.
          </p>
          <p className="fd-nota-cuerpo">
            Es una lectura, no un dictamen: quien decide si calificas es el pliego del proceso.
          </p>
        </details>

        {/* En móvil la barra fija lleva solo los botones, para no tapar el bloque;
            la ayuda del siguiente paso se lee aquí. */}
        <p className="fd-ayuda-movil">
          <strong>Tu siguiente paso:</strong> {paso.ayuda}
        </p>
      </div>

      {creandoPerfil && (
        <div
          className="fd-wizard"
          ref={wizardRef}
          tabIndex={-1}
          role="region"
          aria-label="Define tu perfil de oferente"
        >
          <OferenteWizard onComplete={perfilDefinido} onCancel={() => setCreandoPerfil(false)} />
        </div>
      )}

      <div className="fd-accion">
        <div className="fd-accion-texto">
          <span className="fd-antetitulo fd-antetitulo--claro">Tu siguiente paso</span>
          <span className="fd-ayuda">{paso.ayuda}</span>
        </div>
        <div className="fd-accion-botones">
          {/* Sin URL de expediente, «Preparar la oferta» no tiene a dónde ir: el
              secundario sube a principal para que el bloque no quede sin acción. */}
          {accion(paso.destino, paso.cta, "fd-cta") !== null ? (
            <>
              {accion(paso.destinoSecundario, paso.secundario, "fd-secundario")}
              {accion(paso.destino, paso.cta, "fd-cta")}
            </>
          ) : (
            accion(paso.destinoSecundario, paso.secundario, "fd-cta")
          )}
        </div>
      </div>
    </section>
  );
}
