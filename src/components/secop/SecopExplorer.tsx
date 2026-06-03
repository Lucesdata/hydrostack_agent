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
import { ESTADOS_PROCESO } from "@/src/lib/secop/config";

const DEPARTAMENTOS = [
  "VALLE DEL CAUCA", "ANTIOQUIA", "CUNDINAMARCA", "BOGOTÁ", "ATLÁNTICO",
  "BOLÍVAR", "SANTANDER", "NARIÑO", "CAUCA", "CÓRDOBA", "MAGDALENA",
];

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency", currency: "COP", maximumFractionDigits: 0,
});

interface Filters {
  q: string; departamento: string; estado: string; valorMin: string;
}

export default function SecopExplorer() {
  const [filters, setFilters] = useState<Filters>({
    q: "", departamento: "", estado: "", valorMin: "",
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SecopResult<SecopProceso> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="hs-secop">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <header className="hs-secop-head">
        <span className="hs-secop-tag">SECOP II · DATOS ABIERTOS</span>
        <h1>Licitaciones · Agua y Saneamiento</h1>
        <p>Procesos de contratación pública del sector agua potable y saneamiento básico en Colombia — adjudicados y por adjudicar.</p>
      </header>

      <div className="hs-secop-filters">
        <input className="hs-secop-input" placeholder="Buscar (municipio, objeto, entidad…)"
          value={filters.q} onChange={set("q")} />
        <select className="hs-secop-input" value={filters.departamento} onChange={set("departamento")}>
          <option value="">Todos los departamentos</option>
          {DEPARTAMENTOS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="hs-secop-input" value={filters.estado} onChange={set("estado")}>
          <option value="">Todos los estados</option>
          {ESTADOS_PROCESO.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <input className="hs-secop-input" type="number" placeholder="Valor mín. (COP)"
          value={filters.valorMin} onChange={set("valorMin")} />
      </div>

      {error && <div className="hs-secop-error">⚠ {error}</div>}

      <div className="hs-secop-results">
        {loading && <div className="hs-secop-skeleton">Consultando SECOP…</div>}

        {!loading && data?.items.length === 0 && (
          <div className="hs-secop-empty">Sin resultados para estos filtros.</div>
        )}

        {!loading && data?.items.map((p) => (
          <article key={p.id} className="hs-secop-card">
            <div className="hs-secop-card-top">
              <span className={`hs-secop-state hs-secop-state--${p.adjudicado ? "adj" : "open"}`}>
                {p.estado || (p.adjudicado ? "Adjudicado" : "Abierto")}
              </span>
              <span className="hs-secop-val">
                {p.valorAdjudicacion ?? p.precioBase
                  ? COP.format((p.valorAdjudicacion ?? p.precioBase)!)
                  : "—"}
              </span>
            </div>
            <h3 className="hs-secop-card-title">{p.nombre || p.referencia}</h3>
            <p className="hs-secop-card-entity">{p.entidad}</p>
            <div className="hs-secop-meta">
              <span>{p.departamento}{p.ciudad ? ` · ${p.ciudad}` : ""}</span>
              <span>{p.modalidad}</span>
              {p.fechaPublicacion && (
                <span>{new Date(p.fechaPublicacion).toLocaleDateString("es-CO")}</span>
              )}
            </div>
            {p.adjudicatario && p.adjudicatario !== "No Adjudicado" && (
              <p className="hs-secop-adj">Adjudicatario: <strong>{p.adjudicatario}</strong></p>
            )}
            {p.url && (
              <a className="hs-secop-link" href={p.url} target="_blank" rel="noreferrer">
                Ver en SECOP ↗
              </a>
            )}
          </article>
        ))}
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
  margin-top: auto;
  color: var(--cyan);
  text-decoration: none;
  font-size: .8rem;
  font-family: var(--mono);
}
.hs-secop-link:hover{ text-decoration: underline; }
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
