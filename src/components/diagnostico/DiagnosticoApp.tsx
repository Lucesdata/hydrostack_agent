"use client";

/**
 * Las tres etapas del diagnóstico en una sola página: portada → cuestionario →
 * resultado. Estado en memoria, nada en localStorage: la persistencia es
 * POST /api/diagnostico contra Postgres desde el primer envío.
 *
 * Si el POST no llega (red caída, endpoint fuera), el resultado se calcula aquí
 * mismo con el mismo motor puro y se muestra marcado como no guardado. El
 * cálculo es determinístico y ya viaja en el bundle —el cuestionario y el
 * catálogo de remedios se necesitan para pintar la UI—, así que no cuesta nada
 * y evita que un fallo de red le borre a alguien tres minutos de trabajo.
 */

import { useCallback, useEffect, useState } from "react";
import { calcularDiagnostico } from "@/src/lib/diagnostico/calcular";
import {
  PORTADA,
  FACTS,
  PREGUNTAS,
  CATEGORIAS,
} from "@/src/lib/diagnostico/cuestionario/co-apsb-v1";
import type {
  RespuestasDiagnostico,
  RespuestasParciales,
  ResultadoDiagnostico,
} from "@/src/lib/diagnostico/types";
import { DIAGNOSTICO_CSS } from "./estilos";
import { MedidorTanque } from "./MedidorTanque";
import { Resultado } from "./Resultado";

type Etapa = "portada" | "cuestionario" | "resultado";

const CATEGORIA_LABEL = new Map(CATEGORIAS.map((c) => [c.id, c.label]));

interface Props {
  /** Diagnóstico ya guardado (cuenta o cookie): se entra directo al resultado. */
  resultadoInicial: ResultadoDiagnostico | null;
  /** Sin sesión: al final se ofrece la cuenta para conservar el plan. */
  anonimo: boolean;
  /** Con cuenta y sin perfil: al final se piden sector y zona. */
  tienePerfil: boolean;
}

export function DiagnosticoApp({ resultadoInicial, anonimo, tienePerfil }: Props) {
  const [etapa, setEtapa] = useState<Etapa>(resultadoInicial ? "resultado" : "portada");
  const [indice, setIndice] = useState(0);
  const [respuestas, setRespuestas] = useState<RespuestasParciales>({});
  const [resultado, setResultado] = useState<ResultadoDiagnostico | null>(resultadoInicial);
  const [guardado, setGuardado] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const pregunta = PREGUNTAS[indice];

  // El medidor se llena con el puntaje acumulado, no con el avance: en la
  // pregunta 5 con todo perfecto marca 40 %. Ver 02-cuestionario §3.1.
  const puntajeParcial = PREGUNTAS.reduce((suma, q) => {
    const elegida = respuestas[q.key];
    return elegida === undefined ? suma : suma + q.opciones[elegida].puntos;
  }, 0);

  const enviar = useCallback(async (completas: RespuestasDiagnostico) => {
    setEnviando(true);
    // Fallback local: si la red falla, el resultado no se pierde.
    let calculado = calcularDiagnostico(completas);
    let persistido = false;

    try {
      const res = await fetch("/api/diagnostico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respuestas: completas }),
      });
      const cuerpo = await res.json();
      if (cuerpo?.resultado) calculado = cuerpo.resultado as ResultadoDiagnostico;
      persistido = cuerpo?.guardado === true;
    } catch {
      // Se queda con el cálculo local y `persistido` en false.
    }

    setResultado(calculado);
    setGuardado(persistido);
    setEnviando(false);
    setEtapa("resultado");
    window.scrollTo({ top: 0 });
  }, []);

  const responder = useCallback(
    (opcionIdx: number) => {
      if (enviando) return;
      const siguientes = { ...respuestas, [pregunta.key]: opcionIdx };
      setRespuestas(siguientes);

      if (indice < PREGUNTAS.length - 1) {
        setIndice((i) => i + 1);
        return;
      }
      void enviar(siguientes as RespuestasDiagnostico);
    },
    [enviando, respuestas, pregunta, indice, enviar]
  );

  // Atajos numéricos: 1..n escoge la opción. Solo durante el cuestionario.
  useEffect(() => {
    if (etapa !== "cuestionario") return;
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number.parseInt(e.key, 10);
      if (Number.isInteger(n) && n >= 1 && n <= pregunta.opciones.length) {
        e.preventDefault();
        responder(n - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [etapa, pregunta, responder]);

  function atras() {
    if (indice > 0) setIndice((i) => i - 1);
    else setEtapa("portada");
  }

  function repetir() {
    setRespuestas({});
    setIndice(0);
    setResultado(null);
    setGuardado(true);
    setEtapa("portada");
    window.scrollTo({ top: 0 });
  }

  return (
    <main className="clr-diag">
      <style dangerouslySetInnerHTML={{ __html: DIAGNOSTICO_CSS }} />

      {etapa === "portada" && (
        <div className="clr-diag-inner">
          <div className="clr-diag-hero">
            <div>
              <div className="clr-diag-fig">
                <span className="clr-diag-fig-dot" />
                <span className="clr-diag-fig-label">{PORTADA.antetitulo}</span>
              </div>
              <h1 className="clr-diag-h1">{tituloConEnfasis()}</h1>
              <p className="clr-diag-lede">{PORTADA.lede}</p>
              <button
                type="button"
                className="clr-diag-btn"
                onClick={() => setEtapa("cuestionario")}
              >
                {PORTADA.cta}
              </button>
            </div>
            <MedidorTanque porcentaje={resultado?.puntajeTotal ?? 0} conTicks />
          </div>

          <div className="clr-diag-facts">
            {FACTS.map((fact) => (
              <div key={fact.titulo} className="clr-diag-fact">
                <b>{fact.titulo}</b>
                <span>{fact.texto}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {etapa === "cuestionario" && (
        <div className="clr-diag-inner">
          <div className="clr-diag-quiz">
            <div>
              <div className="clr-diag-q-head">
                <span className="clr-diag-q-num">
                  {String(indice + 1).padStart(2, "0")} /{" "}
                  {String(PREGUNTAS.length).padStart(2, "0")}
                </span>
                <span className="clr-diag-q-cat">{CATEGORIA_LABEL.get(pregunta.categoria)}</span>
              </div>
              <h1 className="clr-diag-q-text">{pregunta.texto}</h1>
              <p className="clr-diag-q-help">{pregunta.ayuda}</p>

              <div className="clr-diag-opts">
                {pregunta.opciones.map((opcion, i) => (
                  <button
                    key={opcion.texto}
                    type="button"
                    className={`clr-diag-opt${respuestas[pregunta.key] === i ? " is-elegida" : ""}`}
                    onClick={() => responder(i)}
                    disabled={enviando}
                  >
                    <span className="clr-diag-opt-key" aria-hidden="true">
                      {i + 1}
                    </span>
                    <span>{opcion.texto}</span>
                  </button>
                ))}
              </div>

              <div className="clr-diag-nav">
                <button
                  type="button"
                  className="clr-diag-btn clr-diag-btn--ghost clr-diag-btn--sm"
                  onClick={atras}
                >
                  ← Anterior
                </button>
                <span className="clr-diag-step">
                  {enviando
                    ? "Calculando tu resultado…"
                    : `Pregunta ${indice + 1} de ${PREGUNTAS.length}`}
                </span>
              </div>
            </div>

            <aside className="clr-diag-lado">
              <MedidorTanque porcentaje={puntajeParcial} anunciar />
            </aside>
          </div>
        </div>
      )}

      {etapa === "resultado" && resultado && (
        <Resultado
          resultado={resultado}
          guardado={guardado}
          anonimo={anonimo}
          tienePerfil={tienePerfil}
          onRepetir={repetir}
        />
      )}
    </main>
  );
}

/** El titular lleva una parte en color de acento, como en el prototipo. */
function tituloConEnfasis() {
  const [antes, despues] = PORTADA.titulo.split(PORTADA.tituloEnfasis);
  return (
    <>
      {antes}
      <em>{PORTADA.tituloEnfasis}</em>
      {despues}
    </>
  );
}
