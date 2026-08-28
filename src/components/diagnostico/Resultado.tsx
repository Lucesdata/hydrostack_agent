/**
 * Resultado del diagnóstico: veredicto, desglose por área, escalón, plan de
 * acción y mitos.
 *
 * Se muestra COMPLETO a quien no tiene cuenta. El registro se ofrece para
 * conservarlo y activar las coincidencias, nunca para desbloquear lo que ya se
 * calculó: el resultado es la prueba de que la plataforma sirve.
 *
 * Un solo veredicto agregado está permitido aquí, a diferencia de la regla de
 * /licitaciones: allá evita alucinar sobre documentos extraídos, y aquí los
 * datos los declara el propio usuario sobre su empresa. Aun así el desglose por
 * categoría siempre acompaña al número.
 */

import { useState } from "react";
import Link from "next/link";
import {
  CATEGORIAS,
  DISCLAIMER,
  ESCALERA,
  MITOS,
  PLAN_SIN_PENDIENTES,
  REMEDIOS,
  RUTAS,
  VEREDICTOS,
  VEREDICTO_BLOQUEADO,
} from "@/src/lib/diagnostico/cuestionario/co-apsb-v1";
import { estadoArea } from "@/src/lib/diagnostico/calcular";
import type { ResultadoDiagnostico } from "@/src/lib/diagnostico/types";
import { SectorZonaSetup } from "@/src/components/oferente/SectorZonaSetup";

const TAG_AREA = { listo: "Listo", parcial: "Parcial", pendiente: "Pendiente" } as const;

interface Props {
  resultado: ResultadoDiagnostico;
  /** false = la base no estaba disponible; el resultado se muestra igual. */
  guardado: boolean;
  /** Sin sesión: se ofrece la cuenta para conservarlo. */
  anonimo: boolean;
  /**
   * Con cuenta pero sin perfil: se piden sector y zona, que el cuestionario no
   * pregunta y son los dos campos que encienden las coincidencias. Solo se
   * ofrece cuando NO hay perfil, así el prellenado nunca degrada un
   * OferenteProfile completo a PerfilMinimo (02-cuestionario §6d).
   */
  tienePerfil: boolean;
  onRepetir: () => void;
}

export function Resultado({ resultado, guardado, anonimo, tienePerfil, onRepetir }: Props) {
  const bloqueado = resultado.bloqueoAbsoluto.length > 0;
  const veredicto = bloqueado ? VEREDICTO_BLOQUEADO : VEREDICTOS[resultado.banda];
  const pasos = resultado.bloqueantes.map((id) => REMEDIOS[id]);

  return (
    <div className="clr-diag-inner clr-diag-inner--angosto">
      {!guardado && (
        <p className="clr-diag-aviso">
          No pudimos guardar tu diagnóstico ahora mismo. El resultado es válido — imprímelo o
          cópialo antes de salir.
        </p>
      )}

      <section
        className={`clr-diag-veredicto${bloqueado ? " clr-diag-veredicto--bloqueado" : ""}`}
      >
        <div className="clr-diag-fig">
          <span className="clr-diag-fig-dot" />
          <span className="clr-diag-fig-label">{veredicto.antetitulo}</span>
        </div>
        <h1 className="clr-diag-h2">{veredicto.titulo}</h1>
        <p>{veredicto.texto}</p>
        <p className="clr-diag-puntaje">
          Nivel de preparación: {resultado.puntajeTotal} / 100
        </p>
      </section>

      <div className="clr-diag-sec">
        <span className="clr-diag-fig-label">A</span>
        <h3>Dónde estás por área</h3>
      </div>
      <div className="clr-diag-areas">
        {CATEGORIAS.map((categoria) => {
          const valor = resultado.puntajeAreas[categoria.id] ?? 0;
          const estado = estadoArea(valor);
          return (
            <div key={categoria.id} className="clr-diag-area">
              <span className="clr-diag-area-nombre">{categoria.label}</span>
              <span className="clr-diag-track">
                <span
                  className={`clr-diag-val${estado === "listo" ? "" : ` clr-diag-val--${estado}`}`}
                  style={{ width: `${valor}%` }}
                />
              </span>
              <span className="clr-diag-area-tag">{TAG_AREA[estado]}</span>
            </div>
          );
        })}
      </div>

      <section className="clr-diag-ruta">
        <div className="clr-diag-fig">
          <span className="clr-diag-fig-dot" />
          <span className="clr-diag-fig-label">Por dónde empezar</span>
        </div>
        <h3>{RUTAS[resultado.escalon].titulo}</h3>
        <p>{RUTAS[resultado.escalon].texto}</p>
        <div className="clr-diag-escalera">
          {ESCALERA.map((peldano) => {
            const actual = peldano.escalon === resultado.escalon;
            return (
              <div
                key={peldano.escalon}
                className={`clr-diag-peldano${actual ? " is-actual" : ""}`}
                aria-current={actual ? "step" : undefined}
              >
                <b>
                  {actual ? "▸ " : ""}
                  {peldano.nombre}
                </b>
                <span>{peldano.descripcion}</span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="clr-diag-sec">
        <span className="clr-diag-fig-label">B</span>
        <h3>Tu plan de acción, en orden</h3>
      </div>
      <ol className="clr-diag-plan">
        {pasos.length === 0 ? (
          <li className="clr-diag-paso">
            <span className="clr-diag-paso-idx">01</span>
            <div>
              <h4>{PLAN_SIN_PENDIENTES.titulo}</h4>
              <p>{PLAN_SIN_PENDIENTES.detalle}</p>
              <div className="clr-diag-chips">
                {PLAN_SIN_PENDIENTES.chips.map((chip) => (
                  <span key={chip} className="clr-diag-chip">
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </li>
        ) : (
          pasos.map((remedio, i) => (
            <li key={remedio.id} className="clr-diag-paso">
              <span className="clr-diag-paso-idx">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h4>{remedio.titulo}</h4>
                <p>{remedio.detalle}</p>
                <div className="clr-diag-chips">
                  {remedio.chips.map((chip, j) => (
                    <span
                      key={chip}
                      className={`clr-diag-chip${j === 0 ? ` clr-diag-chip--${remedio.severidad}` : ""}`}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </li>
          ))
        )}
      </ol>

      {anonimo ? (
        <section className="clr-diag-guardar">
          <span className="clr-diag-esq clr-diag-esq--tl" />
          <span className="clr-diag-esq clr-diag-esq--tr" />
          <span className="clr-diag-esq clr-diag-esq--bl" />
          <span className="clr-diag-esq clr-diag-esq--br" />
          <h3>Conserva este plan y encuentra los procesos que te calzan</h3>
          <p>
            Ya viste tu resultado completo. Con una cuenta lo guardas, retomas el plan cuando
            avances y activas las coincidencias con los procesos abiertos de agua y saneamiento
            en tu zona.
          </p>
          <div className="clr-diag-guardar-acciones">
            <Link href="/registro?next=/diagnostico" className="clr-diag-btn">
              Crea tu cuenta y guarda tu plan →
            </Link>
            <Link href="/login?next=/diagnostico" className="clr-diag-btn clr-diag-btn--ghost">
              Ya tengo cuenta
            </Link>
          </div>
        </section>
      ) : !tienePerfil ? (
        <section className="clr-diag-guardar">
          <span className="clr-diag-esq clr-diag-esq--tl" />
          <span className="clr-diag-esq clr-diag-esq--tr" />
          <span className="clr-diag-esq clr-diag-esq--bl" />
          <span className="clr-diag-esq clr-diag-esq--br" />
          <h3>Activa tus coincidencias</h3>
          <p>
            Ya sabes qué te falta para licitar. Dinos en qué sector y en qué zona trabajas —lo
            único que este cuestionario no pregunta— y verás los procesos abiertos de agua y
            saneamiento que te calzan.
          </p>
          <SectorZonaSetup />
        </section>
      ) : (
        guardado && <p className="clr-diag-guardado">Guardado en tu cuenta</p>
      )}

      <div className="clr-diag-sec">
        <span className="clr-diag-fig-label">C</span>
        <h3>Lo que se dice y lo que es</h3>
      </div>
      <div className="clr-diag-mitos">
        {MITOS.map((mito) => (
          <div key={mito.afirmacion} className="clr-diag-mito">
            <p className="clr-diag-mito-m">&ldquo;{mito.afirmacion}&rdquo;</p>
            <p className="clr-diag-mito-r">{mito.respuesta}</p>
          </div>
        ))}
      </div>

      <div className="clr-diag-acciones">
        <CopiarPlan resultado={resultado} />
        <button type="button" className="clr-diag-btn clr-diag-btn--ghost" onClick={() => window.print()}>
          Imprime o guarda en PDF
        </button>
        <button type="button" className="clr-diag-btn clr-diag-btn--ghost" onClick={onRepetir}>
          Repite el diagnóstico
        </button>
      </div>

      <p className="clr-diag-disclaimer">{DISCLAIMER}</p>
    </div>
  );
}

/** Texto plano del plan, para pegarlo en un correo o pasárselo al contador. */
export function planComoTexto(resultado: ResultadoDiagnostico): string {
  const escalon = ESCALERA.find((p) => p.escalon === resultado.escalon);
  const lineas = [
    "DIAGNÓSTICO DE CONTRATACIÓN PÚBLICA — AGUA Y SANEAMIENTO",
    `Nivel de preparación: ${resultado.puntajeTotal} / 100`,
    (resultado.bloqueoAbsoluto.length > 0
      ? VEREDICTO_BLOQUEADO
      : VEREDICTOS[resultado.banda]
    ).titulo,
    "",
    `ESCALÓN RECOMENDADO: ${escalon?.nombre ?? resultado.escalon}`,
    "",
    "PLAN DE ACCIÓN:",
  ];

  if (resultado.bloqueantes.length === 0) {
    lineas.push(`1. ${PLAN_SIN_PENDIENTES.titulo} — ${PLAN_SIN_PENDIENTES.detalle}`);
  } else {
    resultado.bloqueantes.forEach((id, i) => {
      lineas.push(`${i + 1}. ${REMEDIOS[id].titulo} — ${REMEDIOS[id].detalle}`);
    });
  }

  lineas.push("", DISCLAIMER);
  return lineas.join("\n");
}

function CopiarPlan({ resultado }: { resultado: ResultadoDiagnostico }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(planComoTexto(resultado));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      // Sin permiso de portapapeles (o navegador viejo): imprimir sigue estando.
    }
  }

  return (
    <button type="button" className="clr-diag-btn clr-diag-btn--ghost" onClick={copiar}>
      {copiado ? "Copiado" : "Copia tu plan"}
    </button>
  );
}
