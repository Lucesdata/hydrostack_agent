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
import { PanelBloqueantes } from "@/src/components/diagnostico/PanelBloqueantes";
import { getDiagnosticoVigente } from "@/src/lib/diagnostico/diagnostico-store";
import { avisoEscalon } from "@/src/lib/diagnostico/modalidad";
import { PliegoUploadBlock } from "@/src/components/secop/PliegoUploadBlock";
import { getPliegoStatusForProcesos } from "@/src/lib/secop/pliego-status";
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
const pliegoBanner = (searchParams: Props["searchParams"]): string | null => {
  if (searchParams.pliego === "ok") return "Pliego cargado y extraído.";
  if (searchParams.pliego === "error") {
    return `No se pudo procesar el pliego: ${searchParams.pliegoDetalle ?? "error desconocido"}.`;
  }
  return null;
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
  .clr-mc-badges{ display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .clr-mc-escalon{
    font-size: 11.5px; font-family: var(--font-mono); color: var(--warning);
    background: rgba(217, 119, 6, 0.07); border: 1px solid rgba(217, 119, 6, 0.28);
    border-radius: 999px; padding: 3px 9px; white-space: nowrap;
  }
  .clr-mc-teaser-alt{ font-size: 12.5px; color: var(--ink-600); margin: 16px 0 0; }
  .clr-mc-teaser-alt a{ color: var(--accent); }
  .clr-mc-teaser-alt a:hover{ text-decoration: underline; }
  .clr-mc-pliego{ margin-top: 8px; border-top: 1px solid var(--line); padding-top: 8px; }
  .clr-mc-pliego-summary{
    cursor: pointer; font-size: 12px; color: var(--ink-600); display: flex;
    align-items: center; gap: 6px; list-style: none;
  }
  .clr-mc-pliego-summary::-webkit-details-marker{ display: none; }
  .clr-mc-pliego-glyph{
    display: inline-flex; align-items: center; justify-content: center;
    width: 14px; height: 14px; border-radius: 999px; font-size: 10px; font-weight: 700;
  }
  .clr-mc-pliego-glyph--pass{ background: #dcfce7; color: #16a34a; }
  .clr-mc-pliego-glyph--fail{ background: #fee2e2; color: #dc2626; }
  .clr-mc-pliego-body{ margin-top: 8px; display: flex; flex-direction: column; gap: 8px; }
  .clr-mc-pliego-fields{ font-size: 12px; color: var(--ink-900); margin: 0; }
  .clr-mc-pliego-hint{ font-size: 11.5px; color: var(--ink-600); margin: 0; }
  .clr-mc-pliego-hint a{ color: var(--accent); }
  .clr-mc-pliego-form{ display: flex; align-items: center; gap: 8px; }
  .clr-mc-pliego-form input[type="file"]{ font-size: 11.5px; max-width: 220px; }
  .clr-mc-pliego-form button{
    background: var(--accent); color: #fff; border: none; font-size: 11.5px;
    padding: 5px 10px; border-radius: var(--radius-md); cursor: pointer;
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
  searchParams: {
    resultado?: string;
    resultadoError?: string;
    perfilError?: string;
    pliego?: string;
    pliegoDetalle?: string;
  };
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
  const pliegoResultBanner = pliegoBanner(searchParams);
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
          <p className="clr-mc-teaser-alt">
            ¿Aún no sabes si tu empresa puede presentarse?{" "}
            <Link href="/diagnostico">Descubre qué te falta</Link> — 10 preguntas, sin cuenta.
          </p>
        </div>
      </Shell>
    );
  }

  await recordUserSignal(usuarioId, "oferente");

  // Una base caída no puede tumbar la página: sin diagnóstico el panel muestra
  // la invitación, que es exactamente lo mismo que ve quien no lo ha hecho.
  const diagnostico = await getDiagnosticoVigente(usuarioId).catch(() => null);
  const perfilGuardado = await getPerfilDb(usuarioId);

  if (!perfilGuardado) {
    return (
      <Shell>
        <h1 className="clr-mc-title">Mis coincidencias</h1>
        <p className="clr-mc-sub">
          Cuéntanos en qué sector y zona trabajas para ver tus coincidencias.
        </p>
        {perfilError && <div className="clr-mc-banner">{perfilError}</div>}
        <PanelBloqueantes diagnostico={diagnostico} />
        <SectorZonaSetup />
      </Shell>
    );
  }

  if (!isPerfilCompleto(perfilGuardado)) {
    const matches = await getMatchesForPerfilMinimo(perfilGuardado);
    const pliegoStatusMap = await getPliegoStatusForProcesos(matches.map((m) => m.proceso.id));
    return (
      <Shell>
        <h1 className="clr-mc-title">Mis coincidencias</h1>
        <p className="clr-mc-sub" style={{ margin: "0 0 24px" }}>
          {matches.length} proceso{matches.length === 1 ? "" : "s"} del sector agua que calzan con
          tu perfil. <Link href="/licitaciones/explorar">Completa tu perfil RUP</Link> para ver
          también tu semáforo de elegibilidad y recibir alertas por correo.
        </p>
        <PanelBloqueantes diagnostico={diagnostico} />
        {pliegoResultBanner && <div className="clr-mc-banner">{pliegoResultBanner}</div>}
        {matches.length === 0 ? (
          <div className="clr-mc-empty">
            Sin coincidencias por ahora. Revisa tu sector y zona en{" "}
            <Link href="/licitaciones/explorar">Licitaciones</Link>.
          </div>
        ) : (
          <div className="clr-mc-list">
            {matches.map((m: MatchMinimo) => {
              // Escalón → modalidad: avisa cuando el proceso exige más de lo
              // que el diagnóstico dice que alcanza hoy. Calla si no hay
              // diagnóstico o si la modalidad no es un peldaño de la escalera.
              const aviso = diagnostico
                ? avisoEscalon(diagnostico.escalon, m.proceso.modalidad)
                : null;
              return (
                <div key={m.proceso.id} className="clr-mc-card">
                  <div className="clr-mc-card-top">
                    <p className="clr-mc-card-title">
                      {sentenceCaseTitle(m.proceso.nombre || m.proceso.referencia)}
                    </p>
                    <span className="clr-mc-badges">
                      {aviso && <span className="clr-mc-escalon">{aviso}</span>}
                      <span className="clr-mc-badge">{coincideEnLabel(m)}</span>
                    </span>
                  </div>
                  <span className="clr-mc-card-meta">
                    {m.proceso.entidad}
                    {m.proceso.departamento ? ` · ${m.proceso.departamento}` : ""}
                    {formatShortDate(m.proceso.fechaPublicacion)
                      ? ` · ${formatShortDate(m.proceso.fechaPublicacion)}`
                      : ""}
                  </span>
                  <div className="clr-mc-card-foot">
                    <span className="clr-mc-val">
                      {formatCopCompact(m.proceso.valorAdjudicacion ?? m.proceso.precioBase)}
                    </span>
                    {m.proceso.url && (
                      <a
                        href={m.proceso.url}
                        target="_blank"
                        rel="noreferrer"
                        className="clr-mc-link"
                      >
                        Ver en SECOP ↗
                      </a>
                    )}
                  </div>
                  <PliegoUploadBlock
                    procesoId={m.proceso.id}
                    procesoUrl={m.proceso.url}
                    status={pliegoStatusMap.get(m.proceso.id)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </Shell>
    );
  }

  const matches = await getMatchesForPerfil(perfilGuardado);
  const pliegoStatusMap = await getPliegoStatusForProcesos(matches.map((m) => m.proceso.id));
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
      <PanelBloqueantes diagnostico={diagnostico} />
      {banner && <div className="clr-mc-banner">{banner}</div>}
      {pliegoResultBanner && <div className="clr-mc-banner">{pliegoResultBanner}</div>}
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
            const aviso = diagnostico ? avisoEscalon(diagnostico.escalon, proceso.modalidad) : null;
            return (
              <div key={proceso.id} className="clr-mc-card">
                <div className="clr-mc-card-top">
                  <p className="clr-mc-card-title">
                    {sentenceCaseTitle(proceso.nombre || proceso.referencia)}
                  </p>
                  <span className="clr-mc-badges">
                    {aviso && <span className="clr-mc-escalon">{aviso}</span>}
                    <span className={`clr-mc-score clr-mc-score--${score.tone}`}>
                      <span className="clr-mc-dot" />
                      {score.pass}/{score.total}
                    </span>
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
                <PliegoUploadBlock
                  procesoId={proceso.id}
                  procesoUrl={proceso.url}
                  status={pliegoStatusMap.get(proceso.id)}
                />
              </div>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
