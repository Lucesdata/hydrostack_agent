// app/mis-coincidencias/page.tsx
/**
 * Mis coincidencias — dos calidades de perfil, ambas reales (sin mock):
 * - PerfilMinimo (sector+zona, setup inline): matchProcesosMinimo, sin
 *   semáforo de elegibilidad completo.
 * - OferenteProfile completo (wizard en /licitaciones/explorar): el veredicto
 *   Nivel 0 de siempre (src/lib/secop/verdict.ts vía src/lib/matching/match.ts).
 * Server component puro. Ver docs/superpowers/plans/2026-08-17-mis-coincidencias-refinamiento.md.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { getPerfilDb } from "@/src/lib/oferente/perfil-store";
import { isPerfilCompleto } from "@/src/lib/oferente/perfil-minimo";
import { getMatchesForPerfil } from "@/src/lib/matching/get-matches-for-perfil";
import { getMatchesForPerfilMinimo } from "@/src/lib/matching/get-matches-for-perfil-minimo";
import { coincideEnLabel, type MatchMinimo } from "@/src/lib/matching/match-minimo";
import type { Match } from "@/src/lib/matching/match";
import { markCoincidenciasVistas } from "@/src/lib/matching/record-coincidencias";
import { enviarDigestAhora, type EnvioEstado } from "@/src/lib/alertas/enviar-ahora";
import { recordUserSignal } from "@/src/lib/signals/record-signal";
import { getEnJuegoMes } from "@/src/lib/secop/landingStats";
import { SectorZonaSetup } from "@/src/components/oferente/SectorZonaSetup";
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

const PERFIL_ERROR: Record<string, string> = {
  vacio: "Marca al menos un sector o una zona antes de continuar.",
  db_unavailable: "No pudimos guardar tu perfil ahora mismo. Intenta de nuevo en unos minutos.",
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
  .clr-mc-badge{
    font-size: 11.5px; font-family: var(--font-mono); color: var(--accent);
    background: var(--accent-faint); border: 1px solid var(--accent-soft);
    border-radius: 999px; padding: 3px 9px;
  }
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
  .clr-mc-teaser{
    background: var(--card, #fff); border: 1px solid var(--line); border-radius: var(--radius-lg);
    padding: 28px 24px; text-align: center; filter: blur(0); position: relative;
  }
  .clr-mc-teaser-num{ font-size: 32px; font-weight: 700; color: var(--accent); font-family: var(--font-mono); }
  .clr-mc-teaser-sub{ font-size: 13px; color: var(--ink-600); margin: 6px 0 20px; }
  .clr-mc-cta{
    display: inline-flex; align-items: center; gap: 8px; background: var(--accent); color: #fff;
    text-decoration: none; font-size: 13px; font-weight: 500; padding: 10px 18px;
    border-radius: var(--radius-md);
  }
  .clr-mc-cta:hover{ opacity: 0.9; }
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
  searchParams: { resultado?: string; resultadoError?: string; perfilError?: string };
}

export default async function MisCoincidenciasPage({ searchParams }: Props) {
  const user = await getSessionUser();
  const usuarioId = user?.id;
  const estado = searchParams.resultado as EnvioEstado | undefined;
  const banner =
    estado === "error" && searchParams.resultadoError
      ? searchParams.resultadoError
      : estado
        ? (BANNER[estado] ?? null)
        : null;
  const perfilError = PERFIL_ERROR[searchParams.perfilError ?? ""] ?? null;

  if (!usuarioId) {
    const enJuego = await getEnJuegoMes().catch(() => ({ totalCop: null, procesos: null }));
    return (
      <Shell>
        <h1 className="clr-mc-title">Mis coincidencias</h1>
        <div className="clr-mc-teaser">
          <div className="clr-mc-teaser-num">
            {enJuego.procesos != null ? enJuego.procesos : "—"}
          </div>
          <p className="clr-mc-teaser-sub">
            procesos del sector agua abiertos este mes. Regístrate para ver cuáles calzan con tu
            sector y tu zona.
          </p>
          <Link href="/login?next=/mis-coincidencias" className="clr-mc-cta">
            Regístrate con Google →
          </Link>
        </div>
      </Shell>
    );
  }

  await recordUserSignal(usuarioId, "oferente");

  const perfilGuardado = await getPerfilDb(usuarioId);

  if (!perfilGuardado) {
    return (
      <Shell>
        <h1 className="clr-mc-title">Mis coincidencias</h1>
        <p className="clr-mc-sub">Cuéntanos en qué sector y zona trabajas para ver tus coincidencias.</p>
        {perfilError && <div className="clr-mc-banner">{perfilError}</div>}
        <SectorZonaSetup />
      </Shell>
    );
  }

  if (!isPerfilCompleto(perfilGuardado)) {
    const matches = await getMatchesForPerfilMinimo(perfilGuardado);
    return (
      <Shell>
        <h1 className="clr-mc-title">Mis coincidencias</h1>
        <p className="clr-mc-sub" style={{ margin: "0 0 24px" }}>
          {matches.length} proceso{matches.length === 1 ? "" : "s"} del sector agua que calzan con
          tu perfil.{" "}
          <Link href="/licitaciones/explorar">Completa tu perfil RUP</Link> para ver también tu
          semáforo de elegibilidad y recibir alertas por correo.
        </p>
        {matches.length === 0 ? (
          <div className="clr-mc-empty">
            Sin coincidencias por ahora. Revisa tu sector y zona en{" "}
            <Link href="/licitaciones/explorar">Licitaciones</Link>.
          </div>
        ) : (
          <div className="clr-mc-list">
            {matches.map((m: MatchMinimo) => (
              <div key={m.proceso.id} className="clr-mc-card">
                <div className="clr-mc-card-top">
                  <p className="clr-mc-card-title">
                    {sentenceCaseTitle(m.proceso.nombre || m.proceso.referencia)}
                  </p>
                  <span className="clr-mc-badge">{coincideEnLabel(m)}</span>
                </div>
                <span className="clr-mc-card-meta">
                  {m.proceso.entidad}
                  {m.proceso.departamento ? ` · ${m.proceso.departamento}` : ""}
                  {formatShortDate(m.proceso.fechaPublicacion) ? ` · ${formatShortDate(m.proceso.fechaPublicacion)}` : ""}
                </span>
                <div className="clr-mc-card-foot">
                  <span className="clr-mc-val">
                    {formatCopCompact(m.proceso.valorAdjudicacion ?? m.proceso.precioBase)}
                  </span>
                  {m.proceso.url && (
                    <a href={m.proceso.url} target="_blank" rel="noreferrer" className="clr-mc-link">
                      Ver en SECOP ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Shell>
    );
  }

  const matches = await getMatchesForPerfil(perfilGuardado);
  await markCoincidenciasVistas(usuarioId);

  async function handleEnviarAhora() {
    "use server";
    const s = await getSessionUser();
    if (!s?.id) return;
    const resultado = await enviarDigestAhora(s.id);
    const params = new URLSearchParams({ resultado: resultado.estado });
    if (resultado.estado === "error" && resultado.error) {
      params.set("resultadoError", resultado.error);
    }
    redirect(`/mis-coincidencias?${params.toString()}`);
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
          {matches.map(({ proceso, verdict }: Match) => {
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
