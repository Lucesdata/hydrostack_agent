"use client";

/**
 * SecopExplorer · sección "Licitaciones" de HydroStack
 *
 * Componente cliente. Llama a /api/secop (server-side proxy a SECOP II).
 * Usa el clear theme compartido de HydroStack (clr-* / app/globals.css) —
 * mismo sistema visual que la landing y el hub de calculadoras.
 *
 * Uso (App Router):
 *   // app/licitaciones/page.js
 *   import SecopExplorer from "@/src/components/secop/SecopExplorer";
 *   export default function Page() { return <SecopExplorer />; }
 */

import { useCallback, useEffect, useState } from "react";
import type { SecopProceso, SecopResult } from "@/src/lib/secop/types";
import type { DocumentAccess } from "@/src/lib/secop/document-access";
import type { Verdict, GateStatus } from "@/src/lib/secop/verdict";
import { ESTADOS_PROCESO } from "@/src/lib/secop/config";

const DEPARTAMENTOS = [
  "VALLE DEL CAUCA", "ANTIOQUIA", "CUNDINAMARCA", "BOGOTÁ", "ATLÁNTICO",
  "BOLÍVAR", "SANTANDER", "NARIÑO", "CAUCA", "CÓRDOBA", "MAGDALENA",
];

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency", currency: "COP", maximumFractionDigits: 0,
});

/** Etiqueta + clase CSS por estado de acceso documental (Fase D). */
const ACCESS_LABEL: Record<DocumentAccess, string> = {
  PUBLIC: "Público",
  RESTRICTED: "Restringido",
  NOT_PUBLISHED: "Sin publicar",
  UNKNOWN: "Por confirmar",
};
const ACCESS_CLASS: Record<DocumentAccess, string> = {
  PUBLIC: "success",
  RESTRICTED: "warning",
  NOT_PUBLISHED: "warning",
  UNKNOWN: "neutral",
};

/** Proceso con veredicto Nivel 0 adjunto por /api/secop. */
type ProcesoVeredicto = SecopProceso & { verdict?: Verdict };

/** Glifo + clase CSS por estado de compuerta/veredicto (semáforo HUD). */
const STATUS: Record<GateStatus, { cls: string; glyph: string }> = {
  PASS: { cls: "pass", glyph: "✓" },
  WARN: { cls: "warn", glyph: "!" },
  FAIL: { cls: "fail", glyph: "✕" },
  UNKNOWN: { cls: "unknown", glyph: "?" },
};

/** Etiqueta del veredicto global. */
const OVERALL_LABEL: Record<GateStatus, string> = {
  PASS: "Elegible",
  WARN: "Con reservas",
  FAIL: "No elegible",
  UNKNOWN: "Por confirmar",
};

/** Orden + etiqueta corta de cada compuerta en el readout. */
const GATE_LABEL: Array<[keyof Verdict["gates"], string]> = [
  ["sectorial", "SECTOR"],
  ["cuantia", "CUANTÍA"],
  ["plazo", "PLAZO"],
  ["ubicacion", "ZONA"],
  ["habilitacion", "HABILIT."],
];

interface Filters {
  q: string; departamento: string; estado: string; valorMin: string;
}

export default function SecopExplorer() {
  const [filters, setFilters] = useState<Filters>({
    q: "", departamento: "", estado: "", valorMin: "",
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SecopResult<ProcesoVeredicto> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Resultado del probe on-demand por proceso (refina el chip preliminar).
  const [probed, setProbed] = useState<Record<string, { state: DocumentAccess; message: string }>>({});
  const [probing, setProbing] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ tipo: "procesos", page: String(page) });
      if (filters.q) params.set("q", filters.q);
      if (filters.departamento) params.set("departamento", filters.departamento);
      if (filters.estado) params.set("estado", filters.estado);
      if (filters.valorMin) params.set("valorMin", filters.valorMin);
      const res = await fetch(`/api/secop?${params}`);
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.detail ?? "Error de consulta");
      }
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const set = (k: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setPage(1); setFilters((f) => ({ ...f, [k]: e.target.value }));
  };

  /** Probe on-demand (C1): confirma PUBLIC/RESTRICTED al abrir un proceso. */
  const probe = async (p: SecopProceso) => {
    if (!p.url || probing[p.id]) return;
    setProbing((s) => ({ ...s, [p.id]: true }));
    try {
      const res = await fetch("/api/secop/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: p.url, secopProcesoId: p.id }),
      });
      const payload = await res.json();
      if (res.ok) {
        setProbed((s) => ({ ...s, [p.id]: { state: payload.state, message: payload.message } }));
      }
    } catch {
      /* el chip preliminar se mantiene si el probe falla */
    } finally {
      setProbing((s) => ({ ...s, [p.id]: false }));
    }
  };

  return (
    <div className="clr-page">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="clr-container">
        <header style={{ marginBottom: 22 }}>
          <span className="clr-tag">SECOP II · Datos abiertos</span>
          <h1 className="clr-h1">Licitaciones · Agua y Saneamiento</h1>
          <p className="clr-sub">Procesos de contratación pública del sector agua potable y saneamiento básico en Colombia — adjudicados y por adjudicar.</p>
        </header>

        <div className="clr-secop-filters">
          <input className="clr-input" placeholder="Buscar (municipio, objeto, entidad…)"
            value={filters.q} onChange={set("q")} />
          <select className="clr-select" value={filters.departamento} onChange={set("departamento")}>
            <option value="">Todos los departamentos</option>
            {DEPARTAMENTOS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="clr-select" value={filters.estado} onChange={set("estado")}>
            <option value="">Todos los estados</option>
            {ESTADOS_PROCESO.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <input className="clr-input" type="number" placeholder="Valor mín. (COP)"
            value={filters.valorMin} onChange={set("valorMin")} />
        </div>

      {error && <div className="clr-secop-error">⚠ {error}</div>}

      <div className="clr-grid">
        {loading && <div className="clr-secop-empty">Consultando SECOP…</div>}

        {!loading && data?.items.length === 0 && (
          <div className="clr-secop-empty">Sin resultados para estos filtros.</div>
        )}

        {!loading && data?.items.map((p) => {
          // Acceso efectivo: el del probe on-demand si existe, si no el preliminar.
          const acc = probed[p.id] ?? { state: p.documentAccess, message: p.accessMessage };
          const v = p.verdict;
          return (
          <article key={p.id} className="clr-card is-active">
            <div className="clr-secop-card-top">
              <span className={`clr-badge clr-badge--${p.adjudicado ? "accent" : "neutral"}`}>
                {p.estado || (p.adjudicado ? "Adjudicado" : "Abierto")}
              </span>
              <span className="clr-secop-val">
                {p.valorAdjudicacion ?? p.precioBase
                  ? COP.format((p.valorAdjudicacion ?? p.precioBase)!)
                  : "—"}
              </span>
            </div>
            <h3 className="clr-card-title">{p.nombre || p.referencia}</h3>
            <p className="clr-secop-entity">{p.entidad}</p>
            <div className="clr-secop-meta">
              <span>{p.departamento}{p.ciudad ? ` · ${p.ciudad}` : ""}</span>
              <span>{p.modalidad}</span>
              {p.fechaPublicacion && (
                <span>{new Date(p.fechaPublicacion).toLocaleDateString("es-CO")}</span>
              )}
            </div>
            {v && (
              <div className="clr-verdict">
                <span className={`clr-verdict-overall clr-verdict-overall--${STATUS[v.overall].cls}`}>
                  <span className="clr-verdict-dot" />
                  {OVERALL_LABEL[v.overall]}
                  <span style={{ opacity: 0.7, fontWeight: 400 }}>· Nivel 0</span>
                </span>
                <div className="clr-verdict-gates">
                  {GATE_LABEL.map(([key, label]) => {
                    const g = v.gates[key];
                    const s = STATUS[g.status];
                    const tip = `${label}: ${g.reason}${g.requiredLevel === 2 ? " · requiere pliego" : ""}`;
                    return (
                      <span key={key} className={`clr-verdict-gate clr-verdict-gate--${s.cls}`} title={tip}>
                        <span className="clr-verdict-glyph">{s.glyph}</span>
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            {p.adjudicatario && p.adjudicatario !== "No Adjudicado" && (
              <p className="clr-secop-adj">Adjudicatario: <strong>{p.adjudicatario}</strong></p>
            )}
            <div className="clr-secop-access-row">
              <span className={`clr-badge clr-badge--${ACCESS_CLASS[acc.state]}`}>
                {ACCESS_LABEL[acc.state]}
              </span>
              <span className="clr-secop-access-msg">{acc.message}</span>
            </div>
            <div className="clr-secop-actions">
              {acc.state !== "PUBLIC" && !probed[p.id] && p.url && (
                <button className="clr-secop-probe" onClick={() => probe(p)} disabled={probing[p.id]}>
                  {probing[p.id] ? "Verificando…" : "Verificar acceso"}
                </button>
              )}
              {p.url && (
                <a className="clr-secop-link" href={p.url} target="_blank" rel="noreferrer">
                  {acc.state === "PUBLIC" ? "Ver en SECOP ↗" : "Abrir en SECOP II ↗"}
                </a>
              )}
            </div>
          </article>
          );
        })}
      </div>

      <div className="clr-secop-pager">
        <button disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>← Anterior</button>
        <span>Página {page}</span>
        <button disabled={loading || (data?.items.length ?? 0) === 0} onClick={() => setPage((p) => p + 1)}>Siguiente →</button>
      </div>
      </div>
    </div>
  );
}

const CSS = `
.clr-secop-filters{
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}
.clr-secop-error{
  border: 1px solid rgba(217,119,6,0.3);
  background: rgba(217,119,6,0.06);
  color: var(--warning);
  padding: 12px 16px;
  border-radius: var(--radius-md);
  margin-bottom: 16px;
  font-size: var(--fs-sm);
}
.clr-secop-empty{
  grid-column: 1 / -1;
  padding: 48px;
  text-align: center;
  color: var(--ink-600);
  font-size: var(--fs-sm);
  border: 1px dashed var(--line);
  border-radius: var(--radius-lg);
}
.clr-secop-card-top{
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.clr-secop-val{
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  color: var(--ink-900);
  text-align: right;
}
.clr-secop-entity{
  color: var(--accent);
  font-size: 12px;
  font-family: var(--font-mono);
  margin: 0;
}
.clr-secop-meta{
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  color: var(--ink-600);
  font-size: 11px;
  font-family: var(--font-mono);
}
.clr-secop-adj{ font-size: 12px; color: var(--ink-600); margin: 0; }
.clr-secop-adj strong{ color: var(--ink-900); }
.clr-secop-access-row{
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  margin-top: 2px;
}
.clr-secop-access-msg{
  font-size: 11px;
  color: var(--ink-600);
  line-height: 1.3;
}
.clr-secop-actions{
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  padding-top: 6px;
}
.clr-secop-probe{
  background: transparent;
  border: 1px solid var(--line);
  color: var(--ink-600);
  padding: 5px 11px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: 12px;
  transition: border-color 0.18s, color 0.18s;
}
.clr-secop-probe:hover:not(:disabled){ border-color: var(--accent); color: var(--accent); }
.clr-secop-probe:disabled{ opacity: 0.5; cursor: not-allowed; }
.clr-secop-link{
  color: var(--accent);
  text-decoration: none;
  font-size: 12px;
  font-weight: 500;
}
.clr-secop-link:hover{ text-decoration: underline; }
.clr-secop-pager{
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-top: 32px;
  font-size: 13px;
  color: var(--ink-600);
}
.clr-secop-pager button{
  background: transparent;
  border: 1px solid var(--line);
  color: var(--ink-900);
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: 13px;
  transition: border-color 0.18s, color 0.18s;
}
.clr-secop-pager button:hover:not(:disabled){ border-color: var(--accent); color: var(--accent); }
.clr-secop-pager button:disabled{ opacity: 0.35; cursor: not-allowed; }
`;
