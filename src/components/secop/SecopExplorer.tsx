// src/components/secop/SecopExplorer.tsx
"use client";

/**
 * SecopExplorer · sección "Licitaciones" de HydroStack — workbench v2.
 *
 * Orquestador master-detail: lista compacta (ProcessList) + panel de detalle
 * (ProcessDetail). Llama a /api/secop (proxy server-side a SECOP II).
 * Clear theme compartido (clr-* / app/globals.css).
 *
 * Spec: docs/superpowers/specs/2026-07-11-licitaciones-v2-workbench-design.md
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { SecopResult } from "@/src/lib/secop/types";
import type { DocumentAccess } from "@/src/lib/secop/document-access";
import type { Verdict } from "@/src/lib/secop/verdict";
import type { OferenteProfile } from "@/src/lib/oferente/types";
import { ESTADOS_PROCESO } from "@/src/lib/secop/config";
import { SECTOR_KEYS, SECTOR_LABELS, type SectorKey } from "@/src/lib/secop/sectorKeywords";
import { getOferentePerfil, saveOferentePerfil } from "@/src/lib/state/clientStore";
import ProcessList, { type ProcesoVeredicto } from "./ProcessList";
import ProcessDetail from "./ProcessDetail";
import OferenteWizard from "./OferenteWizard";

const DEPARTAMENTOS = [
  "VALLE DEL CAUCA", "ANTIOQUIA", "CUNDINAMARCA", "BOGOTÁ", "ATLÁNTICO",
  "BOLÍVAR", "SANTANDER", "NARIÑO", "CAUCA", "CÓRDOBA", "MAGDALENA",
];

const PAGE_SIZES = [10, 25, 50];

interface Filters {
  q: string;
  departamento: string;
  estado: string;
  valorMin: string;
  sector: string;
}

type ProbeState = { state: DocumentAccess; message: string };

export default function SecopExplorer() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<Filters>(() => ({
    q: "",
    departamento: searchParams.get("departamento") ?? "",
    estado: "",
    valorMin: "",
    sector: (SECTOR_KEYS as string[]).includes(searchParams.get("sector") ?? "")
      ? (searchParams.get("sector") as string)
      : "",
  }));
  const [incluirCerrados, setIncluirCerrados] = useState(false);
  const [orden, setOrden] = useState<"fecha" | "valor">("fecha");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SecopResult<ProcesoVeredicto> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false); // solo móvil
  const [probed, setProbed] = useState<Record<string, ProbeState>>({});
  const [probing, setProbing] = useState<Record<string, boolean>>({});
  const probeAttempted = useRef<Set<string>>(new Set());

  // Fase 2 — elegibilidad diferida: perfil de oferente (localStorage) y
  // veredictos calculados on-demand, cacheados por procesoId en memoria.
  const [perfil, setPerfil] = useState<OferenteProfile | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [verdictLoading, setVerdictLoading] = useState<Record<string, boolean>>({});
  const verdictAttempted = useRef<Set<string>>(new Set());

  useEffect(() => {
    setPerfil(getOferentePerfil());
  }, []);

  // Solo-abiertos aplica si el usuario no pidió cerrados ni un estado concreto.
  const soloAbiertos = !incluirCerrados && !filters.estado;

  const fetchData = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        tipo: "procesos",
        page: String(page),
        pageSize: String(pageSize),
        orden,
      });
      if (soloAbiertos) params.set("apertura", "Abierto");
      if (filters.q) params.set("q", filters.q);
      if (filters.departamento) params.set("departamento", filters.departamento);
      if (filters.estado) params.set("estado", filters.estado);
      if (filters.valorMin) params.set("valorMin", filters.valorMin);
      if (filters.sector) params.set("sector", filters.sector);
      const res = await fetch(`/api/secop?${params}`, { signal });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.detail ?? "Error de consulta");
      }
      setData(await res.json());
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Error desconocido");
      setData(null);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [filters, page, pageSize, orden, soloAbiertos]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  // Auto-selección: primer resultado de la página (sin abrir overlay móvil).
  useEffect(() => {
    if (!data) return;
    const stillThere = data.items.some((p) => p.id === selectedId);
    if (!stillThere) setSelectedId(data.items[0]?.id ?? null);
  }, [data, selectedId]);

  const selected = data?.items.find((p) => p.id === selectedId) ?? null;

  /** Probe on-demand (C1), ahora automático al seleccionar. */
  const probe = useCallback(async (p: ProcesoVeredicto) => {
    if (!p.url) return;
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
      /* chip preliminar se mantiene si el probe falla */
    } finally {
      setProbing((s) => ({ ...s, [p.id]: false }));
    }
  }, []);

  useEffect(() => {
    if (!selected?.url) return;
    if (selected.documentAccess === "PUBLIC") return;
    if (probeAttempted.current.has(selected.id)) return;
    probeAttempted.current.add(selected.id);
    probe(selected);
  }, [selected, probe]);

  /** Veredicto Nivel 0 on-demand (Fase 2): solo al abrir detalle con perfil guardado. */
  const fetchVerdict = useCallback(async (p: ProcesoVeredicto, prof: OferenteProfile) => {
    setVerdictLoading((s) => ({ ...s, [p.id]: true }));
    try {
      const res = await fetch("/api/secop/verdict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proceso: p, perfil: prof }),
      });
      if (res.ok) {
        const payload = await res.json();
        setVerdicts((s) => ({ ...s, [p.id]: payload.verdict }));
      }
    } catch {
      /* sin veredicto si falla; el usuario puede reabrir el detalle */
    } finally {
      setVerdictLoading((s) => ({ ...s, [p.id]: false }));
    }
  }, []);

  useEffect(() => {
    if (!selected || !perfil) return;
    if (verdictAttempted.current.has(selected.id)) return;
    verdictAttempted.current.add(selected.id);
    fetchVerdict(selected, perfil);
  }, [selected, perfil, fetchVerdict]);

  function handlePerfilCompleto(nuevoPerfil: OferenteProfile) {
    saveOferentePerfil(nuevoPerfil);
    setPerfil(nuevoPerfil);
    setWizardOpen(false);
    if (selected) {
      verdictAttempted.current.add(selected.id);
      fetchVerdict(selected, nuevoPerfil);
    }
  }

  const set =
    (k: keyof Filters) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setPage(1);
      setFilters((f) => ({ ...f, [k]: e.target.value }));
    };

  const totalPages =
    data?.total != null ? Math.max(1, Math.ceil(data.total / pageSize)) : null;

  const access = selected
    ? probed[selected.id] ?? { state: selected.documentAccess, message: selected.accessMessage }
    : null;

  return (
    <div className="clr-page">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="clr-container">
        <header className="clr-wb-header">
          <span className="clr-tag">SECOP II · Datos abiertos</span>
          <h1 className="clr-h1">Licitaciones · Agua y saneamiento</h1>
          <p className="clr-sub">
            Procesos de contratación pública del sector agua potable y saneamiento
            básico en Colombia.
          </p>
        </header>

        <div className="clr-wb-controls">
          <input
            className="clr-input clr-wb-search"
            placeholder="Buscar municipio, objeto, entidad…"
            value={filters.q}
            onChange={set("q")}
          />
          <select className="clr-select" value={filters.departamento} onChange={set("departamento")}>
            <option value="">Todos los departamentos</option>
            {DEPARTAMENTOS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="clr-select" value={filters.sector} onChange={set("sector")}>
            <option value="">Todos los sub-sectores</option>
            {SECTOR_KEYS.map((s) => (
              <option key={s} value={s}>{SECTOR_LABELS[s as SectorKey]}</option>
            ))}
          </select>
          <select className="clr-select" value={filters.estado} onChange={set("estado")}>
            <option value="">Todos los estados</option>
            {ESTADOS_PROCESO.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <input
            className="clr-input"
            type="number"
            placeholder="Valor mín. (COP)"
            value={filters.valorMin}
            onChange={set("valorMin")}
          />
          <select
            className="clr-select"
            value={orden}
            onChange={(e) => { setPage(1); setOrden(e.target.value as "fecha" | "valor"); }}
            aria-label="Ordenar resultados"
          >
            <option value="fecha">Recientes primero</option>
            <option value="valor">Mayor valor primero</option>
          </select>
        </div>

        <div className="clr-wb-context">
          <span className="clr-wb-count">
            {data?.total != null ? (
              <>
                <strong>{data.total.toLocaleString("es-CO")}</strong>
                {" "}procesos{soloAbiertos ? " abiertos" : ""}
              </>
            ) : (
              "Procesos"
            )}
            {" "}· sector agua y saneamiento
          </span>
          <span className="clr-wb-context-right">
            <label className="clr-wb-toggle">
              <input
                type="checkbox"
                checked={incluirCerrados}
                onChange={(e) => { setPage(1); setIncluirCerrados(e.target.checked); }}
              />
              Incluir cerrados y cancelados
            </label>
            <select
              className="clr-select clr-wb-pagesize"
              value={pageSize}
              onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)); }}
              aria-label="Resultados por página"
            >
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} / pág.</option>)}
            </select>
          </span>
        </div>

        {error && <div className="clr-secop-error">⚠ {error}</div>}

        <div className="clr-wb-split">
          <div className="clr-wb-listcol">
            <ProcessList
              items={data?.items ?? []}
              selectedId={selectedId}
              loading={loading}
              onSelect={(p) => { setSelectedId(p.id); setDetailOpen(true); }}
            />
            <div className="clr-secop-pager">
              <button disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
                ← Anterior
              </button>
              <span>
                Página {page}{totalPages != null ? ` de ${totalPages.toLocaleString("es-CO")}` : ""}
              </span>
              <button
                disabled={
                  loading ||
                  (data?.items.length ?? 0) === 0 ||
                  (totalPages != null && page >= totalPages)
                }
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente →
              </button>
            </div>
          </div>

          <div className={`clr-wb-detailcol${detailOpen ? " is-open" : ""}`}>
            {wizardOpen ? (
              <OferenteWizard onComplete={handlePerfilCompleto} onCancel={() => setWizardOpen(false)} />
            ) : selected && access ? (
              <ProcessDetail
                key={selected.id}
                proceso={selected}
                access={access}
                probing={!!probing[selected.id]}
                onBack={() => setDetailOpen(false)}
                verdict={verdicts[selected.id]}
                verdictLoading={!!verdictLoading[selected.id]}
                hasPerfil={!!perfil}
                onRequestPerfil={() => setWizardOpen(true)}
              />
            ) : (
              !loading && (
                <div className="clr-secop-empty">
                  Selecciona un proceso para ver el detalle.
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
.clr-wb-header{ margin-bottom: 16px; }
.clr-wb-controls{
  display: grid;
  grid-template-columns: minmax(220px, 1.6fr) repeat(4, minmax(140px, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}
.clr-wb-context{
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 14px;
  font-size: 12px;
  color: var(--ink-600);
}
.clr-wb-count strong{ color: var(--ink-900); font-weight: 600; }
.clr-wb-context-right{ display: flex; align-items: center; gap: 14px; }
.clr-wb-toggle{
  display: flex; align-items: center; gap: 6px; cursor: pointer;
  font-size: 12px; color: var(--ink-600); user-select: none;
}
.clr-wb-toggle input{ accent-color: var(--accent); }
.clr-wb-pagesize{ padding: 4px 8px; font-size: 12px; }

.clr-wb-split{
  display: grid;
  grid-template-columns: minmax(280px, 42%) minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}
.clr-plist{ display: flex; flex-direction: column; gap: 8px; }
.clr-prow{
  display: flex; flex-direction: column; gap: 4px;
  text-align: left;
  background: var(--card, #fff);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: 11px 13px;
  cursor: pointer;
  font-family: var(--font-sans);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.clr-prow:hover{ border-color: var(--accent-soft); }
.clr-prow.is-selected{
  border: 1.5px solid var(--accent);
  box-shadow: 0 0 0 3px var(--accent-faint);
}
.clr-prow.is-closed{ opacity: 0.55; }
.clr-prow--skel{
  min-height: 84px;
  background: linear-gradient(90deg, var(--accent-faint), transparent 60%);
  cursor: default;
}
.clr-prow-state{
  align-self: flex-start;
  font-family: var(--font-mono); font-size: 10px;
  color: var(--warning);
  background: rgba(217,119,6,0.08);
  border-radius: var(--radius-sm);
  padding: 1px 6px;
}
.clr-prow-title{
  font-size: 13px; font-weight: 500; color: var(--ink-900); line-height: 1.35;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.clr-prow-meta{
  font-size: 11px; color: var(--ink-600);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.clr-prow-foot{
  display: flex; justify-content: space-between; align-items: center; margin-top: 2px;
}
.clr-prow-val{ font-family: var(--font-mono); font-size: 11.5px; color: var(--ink-900); }
.clr-prow-score{ display: flex; align-items: center; gap: 4px; font-size: 11px; }
.clr-prow-score--success{ color: var(--success); }
.clr-prow-score--warn{ color: var(--warning); }
.clr-prow-score--fail{ color: #DC2626; }
.clr-prow-score--neutral{ color: var(--ink-600); }
.clr-prow-dot{ width: 7px; height: 7px; border-radius: 50%; background: currentColor; }

.clr-pdetail-card{
  background: var(--card, #fff);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 18px 20px;
  display: flex; flex-direction: column; gap: 12px;
}
.clr-pdetail-back{ display: none; }
.clr-pdetail-badges{ display: flex; gap: 6px; flex-wrap: wrap; }
.clr-pdetail-title{
  font-size: 16px; font-weight: 600; color: var(--ink-900);
  line-height: 1.4; margin: 0;
}
.clr-pdetail-facts{
  display: flex; gap: 22px; flex-wrap: wrap;
}
.clr-pdetail-facts > div{ display: flex; flex-direction: column; gap: 2px; }
.clr-pdetail-label{ font-size: 10.5px; color: var(--ink-600); }
.clr-pdetail-val{ font-family: var(--font-mono); font-size: 14px; color: var(--ink-900); }
.clr-pdetail-ref{ font-family: var(--font-mono); font-size: 12.5px; }

.clr-elig{
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: 12px 14px;
}
.clr-elig-head{
  display: flex; justify-content: space-between; align-items: center;
  font-size: 12.5px; font-weight: 500; color: var(--ink-900); margin-bottom: 8px;
}
.clr-elig-count{ font-weight: 400; color: var(--ink-600); font-size: 11.5px; }
.clr-elig-bar{ display: flex; gap: 3px; margin-bottom: 10px; }
.clr-elig-seg{ flex: 1; height: 5px; border-radius: 2px; }
.clr-elig-seg--pass{ background: var(--success); }
.clr-elig-seg--warn{ background: var(--warning); }
.clr-elig-seg--fail{ background: #DC2626; }
.clr-elig-seg--unknown{ background: var(--line); }
.clr-elig-gates{ list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.clr-elig-gate{
  display: grid; grid-template-columns: 16px 78px 1fr; gap: 7px;
  font-size: 11.5px; align-items: baseline;
}
.clr-elig-glyph{ font-weight: 600; }
.clr-elig-glyph--pass{ color: var(--success); }
.clr-elig-glyph--warn{ color: var(--warning); }
.clr-elig-glyph--fail{ color: #DC2626; }
.clr-elig-glyph--unknown{ color: var(--ink-600); }
.clr-elig-name{ color: var(--ink-900); }
.clr-elig-reason{ color: var(--ink-600); line-height: 1.4; }
.clr-elig-cta{
  display: flex; justify-content: space-between; align-items: center;
  gap: 12px; flex-wrap: wrap;
  background: var(--accent-faint, rgba(0,0,0,0.02));
}
.clr-elig-cta p{ margin: 0; font-size: 12.5px; color: var(--ink-600); line-height: 1.5; }
.clr-elig-cta-btn{
  background: var(--accent); color: #fff; border: none;
  font-size: 12.5px; font-weight: 500; white-space: nowrap;
  padding: 8px 16px; border-radius: var(--radius-md); cursor: pointer;
  transition: opacity 0.15s;
}
.clr-elig-cta-btn:hover{ opacity: 0.88; }
.clr-elig-loading{ margin: 0; font-size: 12.5px; color: var(--ink-600); }

.clr-pdetail-desc p{
  font-size: 12px; color: var(--ink-600); line-height: 1.55; margin: 0;
  display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden;
}
.clr-pdetail-desc.is-expanded p{ -webkit-line-clamp: unset; }
.clr-pdetail-more{
  background: none; border: none; padding: 0; margin-top: 4px;
  color: var(--accent); font-size: 12px; cursor: pointer; font-family: var(--font-sans);
}
.clr-pdetail-foot{
  display: flex; justify-content: space-between; align-items: center;
  gap: 10px; flex-wrap: wrap;
  border-top: 1px solid var(--line); padding-top: 12px; margin-top: 2px;
}
.clr-pdetail-cta{
  background: var(--accent); color: #fff;
  font-size: 12.5px; font-weight: 500; text-decoration: none;
  padding: 8px 16px; border-radius: var(--radius-md);
  transition: opacity 0.15s;
}
.clr-pdetail-cta:hover{ opacity: 0.88; }

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
  padding: 48px 24px;
  text-align: center;
  color: var(--ink-600);
  font-size: var(--fs-sm);
  border: 1px dashed var(--line);
  border-radius: var(--radius-lg);
}
.clr-secop-entity{ color: var(--accent); font-size: 12px; font-family: var(--font-mono); margin: 0; }
.clr-secop-adj{ font-size: 12px; color: var(--ink-600); margin: 0; }
.clr-secop-adj strong{ color: var(--ink-900); }
.clr-secop-pager{
  display: flex; align-items: center; justify-content: center;
  gap: 16px; margin-top: 16px;
  font-size: 12.5px; color: var(--ink-600);
}
.clr-secop-pager button{
  background: transparent;
  border: 1px solid var(--line);
  color: var(--ink-900);
  padding: 7px 14px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: 12.5px;
  transition: border-color 0.18s, color 0.18s;
}
.clr-secop-pager button:hover:not(:disabled){ border-color: var(--accent); color: var(--accent); }
.clr-secop-pager button:disabled{ opacity: 0.35; cursor: not-allowed; }

@media (max-width: 900px){
  .clr-wb-controls{ grid-template-columns: 1fr 1fr; }
  .clr-wb-search{ grid-column: 1 / -1; }
  .clr-wb-split{ grid-template-columns: 1fr; }
  .clr-wb-detailcol{
    display: none;
  }
  .clr-wb-detailcol.is-open{
    display: block;
    position: fixed;
    top: var(--nav-h);
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 50;
    background: var(--bg);
    overflow-y: auto;
    padding: 16px;
  }
  .clr-pdetail-back{
    display: inline-block;
    background: none; border: none; padding: 0;
    color: var(--accent); font-size: 13px; cursor: pointer;
    font-family: var(--font-sans);
  }
}
`;
