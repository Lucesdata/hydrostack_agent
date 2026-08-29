// src/components/diagnostico/PanelBloqueantes.tsx
/**
 * Plan de habilitación de la cuenta, dentro de /mis-coincidencias.
 *
 * Es la forma en que el diagnóstico alimenta el producto SIN tocar el semáforo.
 * `habilitacionGate` necesita los requisitos del pliego para pronunciarse, y su
 * invariante D18 prohíbe que una compuerta documental pinte verde o rojo sin
 * el pliego (verdict.ts). Un RUP vencido, en cambio, es un hecho de la empresa
 * que vale para TODO proceso que lo exija: se dice una vez, a nivel de cuenta,
 * en vez de repetir un cuadro rojo por proceso. Ver
 * docs/diagnostico/02-cuestionario-co-apsb-v1.md §6.
 *
 * Server Component: solo lee lo que la página ya cargó.
 */

import Link from "next/link";
import { CUESTIONARIO_VIGENTE, getCuestionario } from "@/src/lib/diagnostico/registro";
import type { DiagnosticoGuardado } from "@/src/lib/diagnostico/diagnostico-store";
import { MAX_LISTADOS, restantesTexto } from "@/src/lib/diagnostico/resumen";

const STYLE = `
  .clr-pb{
    background: var(--surface, #fff); border: 1px solid var(--line);
    border-radius: var(--radius-lg); padding: 18px 20px; margin-bottom: 20px;
  }
  .clr-pb--vacio{ border-style: dashed; }
  .clr-pb-top{ display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .clr-pb-titulo{ font-size: 14px; font-weight: 600; color: var(--ink-900); margin: 0; }
  .clr-pb-meta{ font: 11.5px var(--font-mono); color: var(--ink-600); }
  .clr-pb-sub{ font-size: 12.5px; color: var(--ink-600); margin: 4px 0 0; line-height: 1.5; }
  .clr-pb-bloqueo{
    display: flex; gap: 8px; align-items: flex-start;
    font-size: 12.5px; color: var(--ink-900); line-height: 1.5;
    background: rgba(220, 38, 38, .06); border: 1px solid rgba(220, 38, 38, .25);
    border-radius: var(--radius-md); padding: 10px 12px; margin-top: 12px;
  }
  .clr-pb-bloqueo-glyph{ color: var(--danger); font-family: var(--font-mono); font-weight: 700; }
  .clr-pb-lista{ list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .clr-pb-item{ display: grid; grid-template-columns: 6px 1fr; gap: 12px; align-items: baseline; }
  .clr-pb-punto{ width: 6px; height: 6px; background: var(--accent); display: block; margin-top: 6px; }
  .clr-pb-item-titulo{ font-size: 13px; font-weight: 600; color: var(--ink-900); }
  .clr-pb-item-chip{ font: 10px var(--font-mono); color: var(--ink-600); letter-spacing: .06em; text-transform: uppercase; margin-left: 8px; }
  .clr-pb-pie{ display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-top: 14px; flex-wrap: wrap; }
  .clr-pb-restantes{ font-size: 12px; color: var(--ink-600); }
  .clr-pb-link{ font-size: 12px; color: var(--accent); }
  .clr-pb-link:hover{ text-decoration: underline; }
`;

export function PanelBloqueantes({ diagnostico }: { diagnostico: DiagnosticoGuardado | null }) {
  if (!diagnostico) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: STYLE }} />
        <div className="clr-pb clr-pb--vacio">
          <p className="clr-pb-titulo">¿Ya puedes presentarte a estos procesos?</p>
          <p className="clr-pb-sub">
            Diez preguntas, tres minutos. Descubre qué te falta para ofertar, a qué escalón de
            contratación puedes aspirar hoy y en qué orden resolver lo que te bloquea.
          </p>
          <div className="clr-pb-pie">
            <span />
            <Link href="/diagnostico" className="clr-pb-link">
              Haz tu diagnóstico →
            </Link>
          </div>
        </div>
      </>
    );
  }

  // El catálogo de SU versión, no el vigente: los textos tienen que ser los
  // que esa persona vio al responder.
  const { remedios, escalera } = getCuestionario(diagnostico.version) ?? CUESTIONARIO_VIGENTE;
  const duros = diagnostico.bloqueantes.filter((id) => remedios[id]?.severidad === "hard");
  const blandos = diagnostico.bloqueantes.length - duros.length;
  const absolutos = diagnostico.bloqueoAbsoluto
    .map((id) => remedios[id]?.titulo)
    .filter((titulo): titulo is string => Boolean(titulo));
  const peldano = escalera?.find((p) => p.escalon === diagnostico.escalon);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <div className="clr-pb">
        <div className="clr-pb-top">
          <p className="clr-pb-titulo">Tu plan de habilitación</p>
          <span className="clr-pb-meta">
            {diagnostico.puntajeTotal}/100 ·{" "}
            {peldano?.nombre ?? diagnostico.escalon ?? "sin escalera"}
          </span>
        </div>

        {absolutos.length > 0 && (
          <p className="clr-pb-bloqueo">
            <span className="clr-pb-bloqueo-glyph" aria-hidden="true">
              !
            </span>
            <span>
              {absolutos.join(" · ")}. Hasta resolverlo, la entidad rechaza tu oferta sin evaluarla,
              sin importar el proceso.
            </span>
          </p>
        )}

        {diagnostico.bloqueantes.length === 0 ? (
          <p className="clr-pb-sub">
            No tienes pendientes de habilitación. Lo que sigue es escoger un proceso y armar la
            oferta.
          </p>
        ) : (
          <>
            <ul className="clr-pb-lista">
              {duros.slice(0, MAX_LISTADOS).map((id) => (
                <li key={id} className="clr-pb-item">
                  {/* Sin numerar: el orden numerado es el del plan completo, y
                      aquí solo caben los primeros. Numerar dos veces la misma
                      lista con cifras distintas confunde más de lo que ayuda. */}
                  <span className="clr-pb-punto" aria-hidden="true" />
                  <span>
                    <span className="clr-pb-item-titulo">{remedios[id].titulo}</span>
                    <span className="clr-pb-item-chip">{remedios[id].chips.at(-1)}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="clr-pb-pie">
              <span className="clr-pb-restantes">{restantesTexto(duros.length, blandos)}</span>
              <Link href="/diagnostico" className="clr-pb-link">
                Ver tu plan completo →
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}
