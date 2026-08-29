// app/diagnostico/historial/page.tsx
/**
 * Historial de diagnósticos de la cuenta.
 *
 * Existe porque la tabla `diagnostico` es append-only —guarda uno por cada vez
 * que alguien responde— y hasta ahora no había dónde verlos. El veredicto de la
 * banda más baja promete que "en dos meses tendrás un panorama distinto"; esta
 * página es donde se comprueba si lo tuvo.
 *
 * Ruta con sesión: va en PROTECTED_PREFIXES de middleware.ts. `/diagnostico` a
 * secas sigue siendo pública — el prefijo protegido es solo este subcamino.
 */

import Link from "next/link";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { getHistorialDiagnosticos } from "@/src/lib/diagnostico/diagnostico-store";
import { construirHistorial, type EntradaHistorial } from "@/src/lib/diagnostico/historial";
import { getCuestionario } from "@/src/lib/diagnostico/registro";

export const metadata = {
  title: "Tu historial de diagnósticos — AquaLicita",
};

export const dynamic = "force-dynamic";

const STYLE = `
  .clr-hist{ min-height: 100vh; background: var(--bg); padding: 48px 20px 80px; font-family: var(--font-sans); }
  .clr-hist-inner{ max-width: 760px; margin: 0 auto; }
  .clr-hist-fig{ display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
  .clr-hist-fig-dot{ width: 8px; height: 8px; background: var(--accent); flex-shrink: 0; }
  .clr-hist-fig-label{
    font: 11px var(--font-mono); color: var(--accent);
    letter-spacing: .12em; text-transform: uppercase;
  }
  .clr-hist-h1{ font-size: 24px; font-weight: 600; color: var(--ink-900); margin: 0 0 6px; }
  .clr-hist-sub{ font-size: 13px; color: var(--ink-600); margin: 0 0 28px; line-height: 1.55; max-width: 60ch; }
  .clr-hist-lista{ display: flex; flex-direction: column; gap: 10px; }
  .clr-hist-item{
    position: relative; background: var(--surface, #fff); border: 1px solid var(--line);
    padding: 18px 20px;
  }
  .clr-hist-esq{ position: absolute; width: 10px; height: 10px; }
  .clr-hist-esq--tl{ top: -1px; left: -1px; border-top: 2px solid var(--accent); border-left: 2px solid var(--accent); }
  .clr-hist-esq--br{ bottom: -1px; right: -1px; border-bottom: 2px solid var(--accent); border-right: 2px solid var(--accent); }
  .clr-hist-top{ display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .clr-hist-fecha{ font: 11.5px var(--font-mono); color: var(--ink-600); letter-spacing: .06em; text-transform: uppercase; }
  .clr-hist-variacion{ font: 12px var(--font-mono); margin-left: 8px; }
  .clr-hist-variacion--sube{ color: var(--success); }
  .clr-hist-variacion--baja{ color: var(--danger); }
  .clr-hist-variacion--igual{ color: var(--ink-600); }
  .clr-hist-puntaje{ font-size: 22px; font-weight: 600; color: var(--ink-900); margin: 8px 0 2px; }
  .clr-hist-puntaje span{ font-size: 13px; font-weight: 400; color: var(--ink-600); }
  .clr-hist-meta{ font-size: 12.5px; color: var(--ink-600); line-height: 1.6; }
  .clr-hist-meta b{ color: var(--ink-900); font-weight: 600; }
  .clr-hist-chip{
    font: 10.5px var(--font-mono); color: var(--ink-600); background: var(--surface-alt);
    border: 1px solid var(--line); border-radius: 999px; padding: 3px 9px; white-space: nowrap;
  }
  .clr-hist-vacio{
    background: var(--surface, #fff); border: 1px dashed var(--line);
    border-radius: var(--radius-lg); padding: 28px 24px; text-align: center;
  }
  .clr-hist-vacio p{ font-size: 13px; color: var(--ink-600); margin: 0 0 18px; line-height: 1.6; }
  .clr-hist-cta{
    display: inline-flex; background: var(--accent); color: #fff; font-size: 13px;
    font-weight: 500; padding: 10px 18px; border-radius: var(--radius-md);
  }
  .clr-hist-pie{ margin-top: 28px; font-size: 12.5px; color: var(--ink-600); }
  .clr-hist-pie a{ color: var(--accent); }
  .clr-hist-pie a:hover{ text-decoration: underline; }
`;

const FECHA = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Bogota",
});

export default async function HistorialPage() {
  const user = await getSessionUser();
  // El middleware ya garantiza sesión; esto solo satisface al tipo.
  if (!user) return null;

  let entradas: EntradaHistorial[] = [];
  try {
    entradas = construirHistorial(await getHistorialDiagnosticos(user.id));
  } catch {
    // Una base caída muestra el estado vacío, que no miente: no hay nada que
    // enseñar ahora mismo.
  }

  return (
    <main className="clr-hist">
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <div className="clr-hist-inner">
        <div className="clr-hist-fig">
          <span className="clr-hist-fig-dot" />
          <span className="clr-hist-fig-label">Tu historial</span>
        </div>
        <h1 className="clr-hist-h1">Cómo ha cambiado tu preparación</h1>
        <p className="clr-hist-sub">
          Cada vez que respondes el diagnóstico se guarda uno nuevo; ninguno reemplaza al anterior.
          Aquí ves si lo que resolviste se nota.
        </p>

        {entradas.length === 0 ? (
          <div className="clr-hist-vacio">
            <p>
              Todavía no has respondido ningún diagnóstico con esta cuenta. Toma tres minutos y
              vuelve aquí cuando lo repitas para comparar.
            </p>
            <Link href="/diagnostico" className="clr-hist-cta">
              Haz tu diagnóstico →
            </Link>
          </div>
        ) : (
          <div className="clr-hist-lista">
            {entradas.map(({ diagnostico, variacion, bloqueantesResueltos }) => {
              const cuestionario = getCuestionario(diagnostico.version);
              const peldano = cuestionario?.escalera?.find(
                (p) => p.escalon === diagnostico.escalon
              );
              return (
                <article key={diagnostico.id} className="clr-hist-item">
                  <span className="clr-hist-esq clr-hist-esq--tl" />
                  <span className="clr-hist-esq clr-hist-esq--br" />
                  <div className="clr-hist-top">
                    <span className="clr-hist-fecha">{FECHA.format(diagnostico.creadoEn)}</span>
                    <span className="clr-hist-chip">
                      {cuestionario?.etiqueta ?? diagnostico.version}
                    </span>
                  </div>

                  <p className="clr-hist-puntaje">
                    {diagnostico.puntajeTotal} <span>/ 100</span> <Variacion valor={variacion} />
                  </p>

                  <p className="clr-hist-meta">
                    {peldano ? (
                      <>
                        Escalón: <b>{peldano.nombre}</b>.{" "}
                      </>
                    ) : null}
                    {diagnostico.bloqueantes.length === 0 ? (
                      <b>Sin pendientes de habilitación.</b>
                    ) : (
                      <>
                        <b>{diagnostico.bloqueantes.length}</b> pendiente
                        {diagnostico.bloqueantes.length === 1 ? "" : "s"} en el plan.
                      </>
                    )}
                    {bloqueantesResueltos ? (
                      <>
                        {" "}
                        Resolviste <b>{bloqueantesResueltos}</b> desde el anterior.
                      </>
                    ) : null}
                  </p>
                </article>
              );
            })}
          </div>
        )}

        <p className="clr-hist-pie">
          <Link href="/diagnostico">Repite el diagnóstico</Link> cuando avances, o vuelve a{" "}
          <Link href="/mis-coincidencias">tus coincidencias</Link>.
        </p>
      </div>
    </main>
  );
}

/**
 * La variación solo existe frente al anterior de la MISMA versión: comparar
 * cuestionarios distintos daría un número sin significado (ver historial.ts).
 */
function Variacion({ valor }: { valor: number | null }) {
  if (valor === null) return null;
  const clase = valor > 0 ? "sube" : valor < 0 ? "baja" : "igual";
  const signo = valor > 0 ? "+" : "";
  return (
    <span className={`clr-hist-variacion clr-hist-variacion--${clase}`}>
      {valor === 0 ? "sin cambio" : `${signo}${valor}`}
    </span>
  );
}
