// src/components/landing/LandingCards.jsx
// Dashboard cards con datos vivos de SECOP II (sector agua/saneamiento).
// Lee /api/landing-stats (server-side hace las queries a Socrata); si la API
// falla, cada card degrada a un fallback neutro sin romper el landing.
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCopCompact, formatShortDate, sentenceCaseTitle } from "@/src/components/secop/format";

/**
 * Las cards del landing manejan sumas grandes (precio_base agregado por mes,
 * o el proceso de mayor cuantía) que en millones quedarían con 5+ cifras.
 * formatCopCompact (compartido con el explorador) se queda en "$X M" incluso
 * en miles de millones por contrato ya testeado (format.test.ts); esta
 * variante local añade el corte a "mil M" solo para el landing.
 */
function formatCopMilM(value) {
  if (value == null) return null;
  if (value < 1_000_000_000) return formatCopCompact(value);
  const milMillones = (value / 1_000_000_000).toLocaleString("es-CO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `$${milMillones} mil M`;
}

const CARDS_CSS = `
.lc-section {
  padding: 0 0 var(--space-14);
}
.lc-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 28px;
}
.lc-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: var(--space-6);
}
.lc-card-1 { grid-column: 1; grid-row: 1; }
.lc-card-2 { grid-column: 1; grid-row: 2; }
.lc-card-3 { grid-column: 2; grid-row: 1 / span 2; }
@media (max-width: 860px) {
  .lc-grid { grid-template-columns: 1fr; }
  .lc-card-3 { grid-column: 1; grid-row: auto; }
}
.lc-stat-card {
  justify-content: space-between;
  min-height: 200px;
}
.lc-stat-label {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
}
.lc-stat-value {
  font-size: var(--fs-xl);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--ink-900);
  font-variant-numeric: tabular-nums;
}
.lc-stat-desc {
  font-size: var(--fs-sm);
  color: var(--ink-600);
  line-height: var(--lh-base);
  margin: 0;
}
@keyframes lc-pulse {
  0%, 100% { opacity: .35; }
  50% { opacity: .8; }
}
.lc-loading { color: var(--ink-300); animation: lc-pulse 1.6s ease-in-out infinite; }
.lc-fallback { color: var(--ink-300); }
.lc-skeleton {
  display: inline-block;
  height: 0.68em;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--line-soft) 25%, var(--line) 50%, var(--line-soft) 75%);
  background-size: 200% 100%;
  animation: lc-shimmer 1.6s ease-in-out infinite;
}
@keyframes lc-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.lc-card-featured {
  min-height: 100%;
}
.lc-featured-eyebrow {
  align-self: flex-start;
}
.lc-featured-title {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--ink-900);
  line-height: 1.35;
  margin: 0;
}
.lc-featured-entidad {
  font-size: var(--fs-sm);
  color: var(--ink-600);
  margin: 0;
}
.lc-featured-meta {
  display: flex;
  gap: var(--space-6);
  padding: 12px 0;
  border-top: 1px solid var(--line-soft);
  border-bottom: 1px solid var(--line-soft);
}
.lc-featured-meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.lc-featured-meta-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-300);
}
.lc-featured-meta-value {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--ink-900);
  font-variant-numeric: tabular-nums;
}
.lc-gates {
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
}
.lc-gate-locked {
  filter: blur(4px);
  opacity: 0.55;
  pointer-events: none;
  user-select: none;
}
.lc-locked-msg {
  font-size: var(--fs-xs);
  color: var(--ink-300);
  margin: 2px 0 0;
  display: flex;
  align-items: center;
  gap: 6px;
}
.lc-cta-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: auto;
  padding: 13px 24px;
  background: var(--accent);
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  border-radius: 10px;
  text-decoration: none;
  transition: transform .18s, box-shadow .18s;
}
.lc-cta-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
}
.lc-stat-card:focus-visible,
.lc-cta-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
`;

/** Estado de fetch: null mientras carga, objeto cuando responde, 'error' si falla. */
function useLandingStats() {
  const [state, setState] = useState({ status: "loading", data: null });

  useEffect(() => {
    let cancel = false;
    fetch("/api/landing-stats")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (!cancel) setState({ status: "ready", data });
      })
      .catch(() => {
        if (!cancel) setState({ status: "error", data: null });
      });
    return () => {
      cancel = true;
    };
  }, []);

  return state;
}

function StatValue({ status, value, skeletonWidth = 60 }) {
  if (status === "loading") {
    return <span className="lc-skeleton" style={{ width: skeletonWidth }} aria-hidden="true" />;
  }
  if (value == null) return <span className="lc-fallback">—</span>;
  return <>{value}</>;
}

export default function LandingCards() {
  const { status, data } = useLandingStats();

  const nuevos7d = data?.nuevos7d ?? null;
  const totalCop = data?.enJuego?.totalCop ?? null;
  const procesosMes = data?.enJuego?.procesos ?? null;
  const destacado = data?.destacado ?? null;

  return (
    <section className="lc-section" aria-label="Estado en vivo de contratación pública en agua y saneamiento">
      <style dangerouslySetInnerHTML={{ __html: CARDS_CSS }} />
      <div className="lc-container">
        <div className="lc-grid">
          <Link
            href="/licitaciones?nuevos=7d"
            className="clr-card is-active lc-stat-card lc-card-1"
          >
            <span className="lc-stat-label">Nuevos · últimos 7 días</span>
            <span className="lc-stat-value">
              <StatValue status={status} value={nuevos7d != null ? nuevos7d.toLocaleString("es-CO") : null} skeletonWidth={40} />
            </span>
            <p className="lc-stat-desc">Procesos de agua y saneamiento en presentación de oferta</p>
            <span className="clr-card-cta">
              Ver procesos <span className="clr-cta-arrow" aria-hidden="true">→</span>
            </span>
          </Link>

          <Link href="/licitaciones" className="clr-card is-active lc-stat-card lc-card-2">
            <span className="lc-stat-label">$ en juego · este mes</span>
            <span className="lc-stat-value">
              <StatValue status={status} value={totalCop != null ? formatCopMilM(totalCop) : null} skeletonWidth={92} />
            </span>
            <p className="lc-stat-desc">
              {procesosMes != null ? `${procesosMes.toLocaleString("es-CO")} procesos abiertos del sector` : "Procesos abiertos del sector"}
            </p>
            <span className="clr-card-cta">
              Explorar licitaciones <span className="clr-cta-arrow" aria-hidden="true">→</span>
            </span>
          </Link>

          <div className="clr-card lc-card-featured lc-card-3">
            <span className="clr-badge clr-badge--accent lc-featured-eyebrow">
              Mayor cuantía · sector agua
            </span>

            {status === "loading" ? (
              <p className="lc-loading">Cargando el proceso destacado…</p>
            ) : destacado ? (
              <>
                <h3 className="lc-featured-title">{sentenceCaseTitle(destacado.objeto)}</h3>
                <p className="lc-featured-entidad">{sentenceCaseTitle(destacado.entidad)}</p>

                <div className="lc-featured-meta">
                  <div className="lc-featured-meta-item">
                    <span className="lc-featured-meta-label">Cuantía</span>
                    <span className="lc-featured-meta-value">{formatCopMilM(destacado.precioBase)}</span>
                  </div>
                  <div className="lc-featured-meta-item">
                    <span className="lc-featured-meta-label">Cierre</span>
                    <span className="lc-featured-meta-value">
                      {destacado.fechaRecepcion
                        ? formatShortDate(destacado.fechaRecepcion)
                        : destacado.estadoApertura === "Abierto"
                          ? "Abierto"
                          : destacado.fase || "—"}
                    </span>
                  </div>
                </div>

                <ul className="clr-verdict-gates lc-gates">
                  <li className="clr-verdict-gate clr-verdict-gate--pass">
                    <span className="clr-verdict-glyph">✓</span> Sector
                  </li>
                  <li className="clr-verdict-gate clr-verdict-gate--warn">
                    <span className="clr-verdict-glyph">!</span> Cuantía
                  </li>
                  <li className="clr-verdict-gate clr-verdict-gate--unknown lc-gate-locked" aria-hidden="true">
                    <span className="clr-verdict-glyph">?</span> Plazo
                  </li>
                  <li className="clr-verdict-gate clr-verdict-gate--unknown lc-gate-locked" aria-hidden="true">
                    <span className="clr-verdict-glyph">?</span> Zona
                  </li>
                  <li className="clr-verdict-gate clr-verdict-gate--unknown lc-gate-locked" aria-hidden="true">
                    <span className="clr-verdict-glyph">?</span> Habilitación
                  </li>
                </ul>
                <p className="lc-locked-msg">🔒 Detalle disponible al registrarte</p>

                <Link href="/licitaciones" className="lc-cta-btn">
                  Evalúa tu elegibilidad completa — gratis
                </Link>
              </>
            ) : (
              <>
                <p className="lc-fallback">
                  No pudimos cargar el proceso destacado en este momento.
                </p>
                <Link href="/licitaciones" className="lc-cta-btn">
                  Ver procesos abiertos
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
