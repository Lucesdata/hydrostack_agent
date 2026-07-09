"use client";

/**
 * SecopExplorer · sección "Licitaciones" de HydroStack
 *
 * Componente cliente. Llama a /api/secop (server-side proxy a SECOP II).
 * Adaptado al design system existente de HydroStack (cyberpunk dark:
 * --deep1/2, --cyan, --white, --muted; fuentes Orbitron / IBM Plex Mono / Inter).
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
              <p className="hs-secop-adj">Adjudicatario: <strong>{p.adjudicatario}</strong></p>
            )}
            <div className="hs-secop-access-row">
              <span className={`hs-secop-access hs-secop-access--${ACCESS_CLASS[acc.state]}`}>
                {ACCESS_LABEL[acc.state]}
              </span>
              <span className="hs-secop-access-msg">{acc.message}</span>
            </div>
            <div className="hs-secop-actions">
              {acc.state !== "PUBLIC" && !probed[p.id] && p.url && (
                <button className="hs-secop-probe" onClick={() => probe(p)} disabled={probing[p.id]}>
                  {probing[p.id] ? "Verificando…" : "Verificar acceso"}
                </button>
              )}
              {p.url && (
                <a className="hs-secop-link" href={p.url} target="_blank" rel="noreferrer">
                  {acc.state === "PUBLIC" ? "Ver en SECOP ↗" : "Abrir en SECOP II ↗"}
                </a>
              )}
            </div>
          </article>
          );
        })}
      </div>

      <div className="hs-secop-pager">
        <button disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>← Anterior</button>
        <span>Página {page}</span>
        <button disabled={loading || (data?.items.length ?? 0) === 0} onClick={() => setPage((p) => p + 1)}>Siguiente →</button>
      </div>
    </div>
  );
}

const CSS = `
.hs-secop{
  color: var(--white);
  padding: 2.5rem clamp(1rem, 4vw, 3rem);
  min-height: calc(100vh - 52px);
  font-family: var(--sans);
  position: relative;
  z-index: 1;
}
.hs-secop-head{ max-width: 60ch; margin-bottom: 2rem; }
.hs-secop-tag{
  font-family: var(--mono);
  font-size: .7rem;
  letter-spacing: .25em;
  color: var(--cyan);
  text-shadow: 0 0 12px rgba(0,245,255,0.35);
}
.hs-secop-head h1{
  font-family: var(--orb);
  font-size: clamp(1.7rem, 4.2vw, 2.6rem);
  font-weight: 700;
  margin: .4rem 0 .6rem;
  color: var(--white);
  letter-spacing: -0.01em;
}
.hs-secop-head p{ color: var(--muted); line-height: 1.55; font-size: .95rem; }
.hs-secop-filters{
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: .75rem;
  margin-bottom: 1.5rem;
}
.hs-secop-input{
  background: var(--deep2);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--white);
  padding: .7rem .9rem;
  font-size: .9rem;
  font-family: var(--mono);
  outline: none;
  transition: border-color .15s, box-shadow .15s;
}
.hs-secop-input::placeholder{ color: var(--muted); }
.hs-secop-input:focus{
  border-color: var(--cyan);
  box-shadow: 0 0 0 3px rgba(0,245,255,.12);
}
.hs-secop-error{
  border: 1px solid rgba(255,176,32,.35);
  background: rgba(255,176,32,.07);
  color: var(--amber);
  padding: .8rem 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: .9rem;
  font-family: var(--mono);
}
.hs-secop-results{
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}
.hs-secop-skeleton, .hs-secop-empty{
  grid-column: 1 / -1;
  padding: 3rem;
  text-align: center;
  color: var(--muted);
  font-family: var(--mono);
  font-size: .85rem;
  border: 1px dashed var(--border);
  border-radius: 8px;
}
.hs-secop-card{
  background: linear-gradient(160deg, var(--deep2), #061218);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: .5rem;
  position: relative;
  overflow: hidden;
  transition: transform .18s, border-color .18s, box-shadow .18s;
}
.hs-secop-card:hover{
  transform: translateY(-3px);
  border-color: var(--cyan);
  box-shadow: 0 6px 24px rgba(0,245,255,0.08);
}
.hs-secop-card::before{
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 2px;
  background: var(--cyan);
  opacity: .55;
}
.hs-secop-card-top{
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: .5rem;
}
.hs-secop-state{
  font-family: var(--mono);
  font-size: .62rem;
  letter-spacing: .14em;
  padding: .25rem .55rem;
  border-radius: 99px;
  text-transform: uppercase;
  white-space: nowrap;
}
.hs-secop-state--adj{
  background: rgba(0,245,255,.12);
  color: var(--cyan);
  border: 1px solid rgba(0,245,255,.25);
}
.hs-secop-state--open{
  background: rgba(232,248,255,.06);
  color: var(--white);
  border: 1px solid var(--border);
}
.hs-secop-val{
  font-family: var(--mono);
  font-size: .82rem;
  color: var(--white);
  text-align: right;
}
.hs-secop-card-title{
  font-family: var(--sans);
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--white);
  line-height: 1.25;
  margin: .15rem 0;
}
.hs-secop-card-entity{
  color: var(--cyan);
  font-size: .8rem;
  font-family: var(--mono);
}
.hs-secop-meta{
  display: flex;
  flex-wrap: wrap;
  gap: .4rem .9rem;
  color: var(--muted);
  font-size: .72rem;
  font-family: var(--mono);
}
.hs-secop-adj{ font-size: .8rem; color: var(--white); }
.hs-secop-adj strong{ color: var(--green); }
.hs-secop-link{
  color: var(--cyan);
  text-decoration: none;
  font-size: .8rem;
  font-family: var(--mono);
}
.hs-secop-link:hover{ text-decoration: underline; }
/* Fase D — chips de acceso documental */
.hs-secop-access-row{
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .45rem .6rem;
  margin-top: .15rem;
}
.hs-secop-access{
  font-family: var(--mono);
  font-size: .6rem;
  letter-spacing: .12em;
  text-transform: uppercase;
  padding: .22rem .5rem;
  border-radius: 99px;
  white-space: nowrap;
}
.hs-secop-access--public{
  background: rgba(0,229,212,.14);
  color: #00E5D4;
  border: 1px solid rgba(0,229,212,.42);
}
.hs-secop-access--restricted, .hs-secop-access--notpub{
  background: rgba(255,176,32,.1);
  color: var(--amber);
  border: 1px solid rgba(255,176,32,.35);
}
.hs-secop-access--unknown{
  background: rgba(232,248,255,.05);
  color: var(--muted);
  border: 1px solid var(--border);
}
.hs-secop-access-msg{
  font-size: .68rem;
  color: var(--muted);
  font-family: var(--mono);
  line-height: 1.3;
}
.hs-secop-actions{
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: .9rem;
  flex-wrap: wrap;
  padding-top: .35rem;
}
.hs-secop-probe{
  background: transparent;
  border: 1px solid var(--border);
  color: var(--white);
  padding: .35rem .7rem;
  border-radius: 4px;
  cursor: pointer;
  font-family: var(--mono);
  font-size: .68rem;
  letter-spacing: .06em;
  transition: border-color .15s, color .15s;
}
.hs-secop-probe:hover:not(:disabled){ border-color: var(--cyan); color: var(--cyan); }
.hs-secop-probe:disabled{ opacity: .5; cursor: not-allowed; }
/* Veredicto Nivel 0 — readout/semáforo HUD */
.hs-verdict{
  margin-top: .2rem;
  border: 1px solid var(--border);
  border-left-width: 2px;
  border-radius: 6px;
  padding: .55rem .6rem;
  background: rgba(0,0,0,.22);
  display: flex;
  flex-direction: column;
  gap: .5rem;
}
.hs-verdict--pass{ border-left-color: #00e5a0; }
.hs-verdict--warn{ border-left-color: var(--amber); }
.hs-verdict--fail{ border-left-color: #ff3b5c; }
.hs-verdict--unknown{ border-left-color: var(--muted); }
.hs-verdict-head{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .5rem;
}
.hs-verdict-tag{
  font-family: var(--mono);
  font-size: .54rem;
  letter-spacing: .22em;
  color: var(--muted);
}
.hs-verdict-overall{
  font-family: var(--orb);
  font-size: .68rem;
  font-weight: 700;
  letter-spacing: .06em;
  display: flex;
  align-items: center;
  gap: .4rem;
  text-transform: uppercase;
}
.hs-verdict-dot{
  width: 8px; height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.hs-verdict--pass .hs-verdict-overall{ color: #00e5a0; }
.hs-verdict--pass .hs-verdict-dot{ background: #00e5a0; box-shadow: 0 0 9px #00e5a0; }
.hs-verdict--warn .hs-verdict-overall{ color: var(--amber); }
.hs-verdict--warn .hs-verdict-dot{ background: var(--amber); box-shadow: 0 0 9px var(--amber); }
.hs-verdict--fail .hs-verdict-overall{ color: #ff3b5c; }
.hs-verdict--fail .hs-verdict-dot{ background: #ff3b5c; box-shadow: 0 0 9px #ff3b5c; }
.hs-verdict--unknown .hs-verdict-overall{ color: var(--muted); }
.hs-verdict--unknown .hs-verdict-dot{ background: var(--muted); }
.hs-verdict-gates{
  display: flex;
  flex-wrap: wrap;
  gap: .3rem;
}
.hs-verdict-gate{
  font-family: var(--mono);
  font-size: .55rem;
  letter-spacing: .07em;
  display: flex;
  align-items: center;
  gap: .25rem;
  padding: .2rem .42rem;
  border-radius: 4px;
  border: 1px solid var(--border);
  color: var(--muted);
  cursor: default;
  white-space: nowrap;
}
.hs-verdict-glyph{ font-weight: 700; line-height: 1; }
.hs-verdict-gate--pass{ color: #00e5a0; border-color: rgba(0,229,160,.4); background: rgba(0,229,160,.08); }
.hs-verdict-gate--warn{ color: var(--amber); border-color: rgba(255,176,32,.4); background: rgba(255,176,32,.08); }
.hs-verdict-gate--fail{ color: #ff3b5c; border-color: rgba(255,59,92,.42); background: rgba(255,59,92,.08); }
.hs-verdict-gate--unknown{ color: var(--muted); border-color: var(--border); }
.hs-secop-pager{
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 2rem;
  font-family: var(--mono);
  font-size: .8rem;
  color: var(--muted);
}
.hs-secop-pager button{
  background: transparent;
  border: 1px solid var(--border);
  color: var(--white);
  padding: .5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-family: var(--mono);
  font-size: .75rem;
  letter-spacing: .08em;
  text-transform: uppercase;
  transition: all .18s;
}
.hs-secop-pager button:hover:not(:disabled){
  border-color: var(--cyan);
  color: var(--cyan);
  box-shadow: 0 0 12px rgba(0,245,255,0.15);
}
.hs-secop-pager button:disabled{ opacity: .35; cursor: not-allowed; }
`;
