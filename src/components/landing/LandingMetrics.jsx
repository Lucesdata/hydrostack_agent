// src/components/landing/LandingMetrics.jsx
// Métricas interactivas del landing: oportunidad activa + tiempo de
// ejecución contractual, filtrables por departamento × sector. Lee
// /api/landing-metrics (matriz precalculada) UNA sola vez al montar — el
// selector filtra en memoria, cero fetch adicional al interactuar.
"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatCopMilM } from "@/src/components/secop/format";
import { SECTOR_KEYS, SECTOR_LABELS } from "@/src/lib/secop/sectorKeywords";

const METRICS_CSS = `
.lm-section { padding: 0 0 var(--space-14); }
.lm-container { max-width: 1100px; margin: 0 auto; padding: 0 28px; }
.lm-header { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-6); }
.lm-title { font-size: var(--fs-lg); font-weight: 700; color: var(--ink-900); margin: 0; }
.lm-fecha-corte { font-family: var(--font-mono); font-size: var(--fs-xs); color: var(--ink-300); }
.lm-controls { display: flex; flex-wrap: wrap; gap: var(--space-4); margin-bottom: var(--space-6); }
.lm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); }
@media (max-width: 720px) { .lm-grid { grid-template-columns: 1fr; } }
.lm-stat-card { min-height: 170px; justify-content: space-between; }
.lm-stat-label { font-family: var(--font-mono); font-size: var(--fs-xs); letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent); }
.lm-stat-value { font-size: var(--fs-xl); font-weight: 700; letter-spacing: -0.02em; color: var(--ink-900); font-variant-numeric: tabular-nums; }
.lm-stat-desc { font-size: var(--fs-sm); color: var(--ink-600); line-height: var(--lh-base); margin: 0; }
.lm-stat-fallback { font-size: var(--fs-sm); color: var(--ink-300); }
.lm-skeleton { display: inline-block; height: 0.68em; width: 80px; border-radius: 4px; background: linear-gradient(90deg, var(--line-soft) 25%, var(--line) 50%, var(--line-soft) 75%); background-size: 200% 100%; animation: lm-shimmer 1.6s ease-in-out infinite; }
@keyframes lm-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.lm-cta-row { margin-top: var(--space-6); }
.lm-cta-btn { display: inline-flex; align-items: center; gap: 8px; padding: 13px 24px; background: var(--accent); color: #fff; font-weight: 600; font-size: 14px; border-radius: 10px; text-decoration: none; transition: transform .18s, box-shadow .18s; }
.lm-cta-btn:hover { transform: translateY(-2px); box-shadow: var(--shadow-card-hover); }
`;

/** Espeja StatValue de LandingCards.jsx (mismo patrón visual, sin compartir
 *  código entre los dos archivos — es un componente de 6 líneas). */
function StatValue({ status, value }) {
  if (status === "loading") return <span className="lm-skeleton" aria-hidden="true" />;
  if (value == null) return <span className="lm-stat-fallback">—</span>;
  return <>{value}</>;
}

function useLandingMetrics() {
  const [state, setState] = useState({ status: "loading", data: null });

  useEffect(() => {
    let cancel = false;
    fetch("/api/landing-metrics")
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

function formatFechaCorte(iso) {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-CO", { month: "long", year: "numeric" }).replace(/\bde\s+/g, "");
}

const ZERO_COMBINACION = {
  oportunidad_activa: { valor_cop: 0, n_procesos: 0 },
  ciclo_proceso: { promedio_dias: null, mediana_dias: null, n_muestra: 0, muestra_suficiente: false },
};

export default function LandingMetrics() {
  const { status, data } = useLandingMetrics();
  const [departamento, setDepartamento] = useState("");
  const [sector, setSector] = useState("");

  const departamentos = useMemo(() => {
    const set = new Set((data?.combinaciones ?? []).map((c) => c.departamento));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [data]);

  const combinacion = useMemo(() => {
    if (!data) return null;
    if (!departamento && !sector) return data.nacional;
    const match = (data.combinaciones ?? []).find(
      (c) => (!departamento || c.departamento === departamento) && (!sector || c.sector === sector),
    );
    return match ?? ZERO_COMBINACION;
  }, [data, departamento, sector]);

  const fechaCorte = formatFechaCorte(data?.fecha_corte);

  const ctaHref = useMemo(() => {
    const params = new URLSearchParams();
    if (departamento) params.set("departamento", departamento);
    if (sector) params.set("sector", sector);
    const qs = params.toString();
    return qs ? `/licitaciones/explorar?${qs}` : "/licitaciones/explorar";
  }, [departamento, sector]);

  if (status === "error") {
    return (
      <section className="lm-section" aria-label="Métricas de contratación pública en agua y saneamiento">
        <style dangerouslySetInnerHTML={{ __html: METRICS_CSS }} />
        <div className="lm-container">
          <p className="lm-stat-fallback">No pudimos cargar las métricas en este momento.</p>
        </div>
      </section>
    );
  }

  const oa = combinacion?.oportunidad_activa;
  const cp = combinacion?.ciclo_proceso;

  return (
    <section className="lm-section" aria-label="Métricas de contratación pública en agua y saneamiento">
      <style dangerouslySetInnerHTML={{ __html: METRICS_CSS }} />
      <div className="lm-container">
        <div className="lm-header">
          <h2 className="lm-title">Oportunidad en tu región</h2>
          {fechaCorte && <span className="lm-fecha-corte">Datos SECOP, corte: {fechaCorte}</span>}
        </div>

        <div className="lm-controls">
          <select
            className="clr-select"
            value={departamento}
            onChange={(e) => setDepartamento(e.target.value)}
            aria-label="Filtrar por departamento"
          >
            <option value="">Todo el país</option>
            {departamentos.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            className="clr-select"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            aria-label="Filtrar por sector"
          >
            <option value="">Todos los sectores</option>
            {SECTOR_KEYS.map((s) => (
              <option key={s} value={s}>{SECTOR_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <div className="lm-grid">
          <div className="clr-card lm-stat-card">
            <span className="lm-stat-label">Oportunidad activa</span>
            <span className="lm-stat-value">
              <StatValue status={status} value={oa ? formatCopMilM(oa.valor_cop) : null} />
            </span>
            <p className="lm-stat-desc">
              {status === "loading"
                ? "Cargando…"
                : oa
                  ? `${oa.n_procesos.toLocaleString("es-CO")} procesos abiertos`
                  : "Sin datos para este filtro"}
            </p>
          </div>

          <div className="clr-card lm-stat-card">
            <span className="lm-stat-label">Tiempo de ejecución contractual</span>
            <span className="lm-stat-value">
              <StatValue
                status={status}
                value={cp ? (cp.muestra_suficiente ? `${cp.mediana_dias} días` : "Muestra insuficiente") : null}
              />
            </span>
            <p className="lm-stat-desc">
              {status === "loading"
                ? "Cargando…"
                : cp && cp.n_muestra > 0
                  ? `Mediana sobre ${cp.n_muestra.toLocaleString("es-CO")} contratos firmados (últimos 12 meses); promedio ${cp.promedio_dias} días`
                  : "Sin contratos firmados en los últimos 12 meses para este filtro"}
            </p>
          </div>
        </div>

        <div className="lm-cta-row">
          <Link href={ctaHref} className="lm-cta-btn">
            Ver estos procesos <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
