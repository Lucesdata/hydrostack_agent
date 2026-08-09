// app/mis-coincidencias/page.tsx

/**
 * Mis coincidencias (Fase 1.2) — procesos que le convienen a la cuenta,
 * calculados on-demand con el mismo motor de veredicto Nivel 0 que ya corre en
 * /licitaciones/explorar (src/lib/secop/verdict.ts vía src/lib/matching/match.ts).
 * Server component puro: sin filtros, sin wizard — el perfil se completa en
 * /licitaciones/explorar (ya sincroniza a la cuenta desde Fase 1.1).
 *
 * Prefiltro SQL deliberadamente sin `departamento`: `searchProcesosDb` filtra
 * por nombre de departamento, pero `OferenteProfile.cobertura` guarda códigos
 * DIVIPOLA — traducir agregaría una dependencia no verificada. Se sobre-trae
 * y `ubicacionGate` filtra en memoria (mismo trade-off ya aceptado en
 * docs/plan-arquitectura-roadmap.md §3.2 para los falsos positivos del prefiltro).
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { getPerfilDb } from "@/src/lib/oferente/perfil-store";
import { getMatchesForPerfil } from "@/src/lib/matching/get-matches-for-perfil";
import { enviarDigestAhora, type EnvioEstado } from "@/src/lib/alertas/enviar-ahora";
import { recordUserSignal } from "@/src/lib/signals/record-signal";
import {
  sentenceCaseTitle,
  formatCopCompact,
  formatShortDate,
  verdictScore,
} from "@/src/components/secop/format";

const BANNER: Record<EnvioEstado, string> = {
  enviado: "Correo enviado — revisa tu bandeja de entrada.",
  sin_coincidencias: "No hay coincidencias hoy — no se envió correo.",
  error:
    "No se pudo enviar el correo. Revisa la configuración de Resend (AUTH_RESEND_KEY / EMAIL_FROM).",
};

const STYLE = `
  .clr-mc{
    min-height: 100vh; background: var(--bg); cursor: auto;
    padding-top: 48px;
  }
  .clr-mc-inner{ max-width: 860px; margin: 0 auto; padding: 0 20px 80px; font-family: var(--font-sans); }
  .clr-mc-title{ font-size: 20px; font-weight: 600; color: var(--ink-900); margin: 0 0 4px; }
  .clr-mc-sub{ font-size: 13px; color: var(--ink-600); margin: 0 0 24px; }
  .clr-mc-empty{
    background: var(--card, #fff); border: 1px solid var(--line); border-radius: var(--radius-lg);
    padding: 24px; font-size: 13px; color: var(--ink-600);
  }
  .clr-mc-empty a{ color: var(--accent); }
  .clr-mc-list{ display: flex; flex-direction: column; gap: 10px; }
  .clr-mc-card{
    background: var(--card, #fff); border: 1px solid var(--line); border-radius: var(--radius-lg);
    padding: 16px 18px; display: flex; flex-direction: column; gap: 6px;
  }
  .clr-mc-card-top{ display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
  .clr-mc-card-title{ font-size: 14px; font-weight: 600; color: var(--ink-900); margin: 0; }
  .clr-mc-card-meta{ font-size: 12px; color: var(--ink-600); }
  .clr-mc-card-foot{ display: flex; justify-content: space-between; align-items: center; margin-top: 4px; }
  .clr-mc-val{ font-family: var(--font-mono); font-size: 13px; color: var(--ink-900); }
  .clr-mc-score{ display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-family: var(--font-mono); }
  .clr-mc-dot{ width: 7px; height: 7px; border-radius: 999px; }
  .clr-mc-score--success .clr-mc-dot{ background: #16a34a; }
  .clr-mc-score--warn .clr-mc-dot{ background: #d97706; }
  .clr-mc-score--fail .clr-mc-dot{ background: #dc2626; }
  .clr-mc-score--neutral .clr-mc-dot{ background: var(--ink-600); }
  .clr-mc-link{ font-size: 12px; color: var(--accent); text-decoration: none; }
  .clr-mc-link:hover{ text-decoration: underline; }
  .clr-mc-actions{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .clr-mc-send-btn{
    background: var(--accent); color: #fff; border: none; font-size: 12.5px; font-weight: 500;
    padding: 8px 14px; border-radius: var(--radius-md); cursor: pointer;
  }
  .clr-mc-send-btn:hover{ opacity: 0.9; }
  .clr-mc-banner{
    font-size: 12.5px; color: var(--ink-900); background: var(--accent-faint);
    border: 1px solid var(--accent-soft); border-radius: var(--radius-md);
    padding: 10px 14px; margin-bottom: 16px;
  }
`;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="clr-mc">
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <div className="clr-mc-inner">{children}</div>
    </main>
  );
}

interface Props {
  searchParams: { resultado?: string };
}

export default async function MisCoincidenciasPage({ searchParams }: Props) {
  const user = await getSessionUser();
  const usuarioId = user?.id;
  const banner = BANNER[searchParams.resultado as EnvioEstado] ?? null;

  if (!usuarioId) {
    return (
      <Shell>
        <h1 className="clr-mc-title">Mis coincidencias</h1>
        <div className="clr-mc-empty">
          Necesitas una cuenta para ver tus coincidencias.{" "}
          <Link href="/login?next=/mis-coincidencias">Ingresar →</Link>
        </div>
      </Shell>
    );
  }

  await recordUserSignal(usuarioId, "oferente");

  const perfil = await getPerfilDb(usuarioId);
  if (!perfil) {
    return (
      <Shell>
        <h1 className="clr-mc-title">Mis coincidencias</h1>
        <div className="clr-mc-empty">
          Aún no tienes un perfil de oferente guardado.{" "}
          <Link href="/licitaciones/explorar">Complétalo en Licitaciones →</Link>
        </div>
      </Shell>
    );
  }

  const matches = await getMatchesForPerfil(perfil);

  async function handleEnviarAhora() {
    "use server";
    const s = await getSessionUser();
    if (!s?.id) return;
    const resultado = await enviarDigestAhora(s.id);
    redirect(`/mis-coincidencias?resultado=${resultado.estado}`);
  }

  return (
    <Shell>
      <div className="clr-mc-actions">
        <div>
          <h1 className="clr-mc-title">Mis coincidencias</h1>
          <p className="clr-mc-sub" style={{ margin: 0 }}>
            {matches.length} proceso{matches.length === 1 ? "" : "s"} abierto
            {matches.length === 1 ? "" : "s"} del sector agua que calzan con tu perfil.
          </p>
        </div>
        <form action={handleEnviarAhora}>
          <button type="submit" className="clr-mc-send-btn">
            Enviarme por correo ahora
          </button>
        </form>
      </div>
      {banner && <div className="clr-mc-banner">{banner}</div>}
      {matches.length === 0 ? (
        <div className="clr-mc-empty">
          Sin coincidencias por ahora con tu perfil actual. Revisa tu cobertura y sectores en{" "}
          <Link href="/licitaciones/explorar">Licitaciones</Link>.
        </div>
      ) : (
        <div className="clr-mc-list">
          {matches.map(({ proceso, verdict }) => {
            const score = verdictScore(verdict);
            const fecha = formatShortDate(proceso.fechaPublicacion);
            return (
              <div key={proceso.id} className="clr-mc-card">
                <div className="clr-mc-card-top">
                  <p className="clr-mc-card-title">
                    {sentenceCaseTitle(proceso.nombre || proceso.referencia)}
                  </p>
                  <span className={`clr-mc-score clr-mc-score--${score.tone}`}>
                    <span className="clr-mc-dot" />
                    {score.pass}/{score.total}
                  </span>
                </div>
                <span className="clr-mc-card-meta">
                  {proceso.entidad}
                  {proceso.departamento ? ` · ${proceso.departamento}` : ""}
                  {fecha ? ` · ${fecha}` : ""}
                </span>
                <div className="clr-mc-card-foot">
                  <span className="clr-mc-val">
                    {formatCopCompact(proceso.valorAdjudicacion ?? proceso.precioBase)}
                  </span>
                  {proceso.url && (
                    <a href={proceso.url} target="_blank" rel="noreferrer" className="clr-mc-link">
                      Ver en SECOP ↗
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
