// src/components/secop/discovery/LicitacionesDiscovery.tsx
"use client";

/**
 * Licitaciones · Descubrir — Colecciones inteligentes + Búsqueda facetada.
 *
 * Conectada a datos reales (GET /api/secop, mismo backend que Explorar).
 * Antes corría 100% sobre src/lib/secop/mock-licitaciones.ts; ver
 * src/lib/secop/discovery.ts para por qué las 3 colecciones cambiaron de
 * definición al pasar a datos reales (sin fecha de cierre exacta, sin señal
 * de competencia).
 *
 * Principio de producto: el usuario nunca se perfila. Todos los filtros
 * (colección o búsqueda) son atributos objetivos del proceso/pliego.
 */

import { useEffect, useMemo, useState } from "react";
import {
  SMART_COLLECTIONS,
  buildDiscoveryQuery,
  filterByResidualPills,
  secopQueryToSearchParams,
  type FilterPill,
} from "@/src/lib/secop/discovery";
import type { SecopProceso } from "@/src/lib/secop/types";
import SmartCollections from "./SmartCollections";
import FacetedSearchBar from "./FacetedSearchBar";
import ResultCard from "./ResultCard";
import LicitacionesTabs from "../LicitacionesTabs";

function dedupePills(pills: FilterPill[]): FilterPill[] {
  const seen = new Map<string, FilterPill>();
  for (const p of pills) seen.set(p.id, p);
  return Array.from(seen.values());
}

type FetchState = "loading" | "ready" | "error";

export default function LicitacionesDiscovery() {
  const [pills, setPills] = useState<FilterPill[]>([]);
  const [items, setItems] = useState<SecopProceso[]>([]);
  const [state, setState] = useState<FetchState>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeCollectionIds = useMemo(() => {
    const active = new Set<string>();
    for (const c of SMART_COLLECTIONS) {
      if (c.pills.every((cp) => pills.some((p) => p.id === cp.id))) active.add(c.id);
    }
    return active;
  }, [pills]);

  const { query, residualPills } = useMemo(() => buildDiscoveryQuery(pills), [pills]);

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    setErrorMsg(null);

    fetch(`/api/secop?${secopQueryToSearchParams(query).toString()}`, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.detail || body?.error || `Error ${res.status}`);
        setItems(body.items ?? []);
        setState("ready");
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        setErrorMsg(e instanceof Error ? e.message : String(e));
        setState("error");
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(query)]);

  const results = useMemo(
    () => filterByResidualPills(items, residualPills),
    [items, residualPills]
  );

  function handleToggleCollection(collectionId: string) {
    const collection = SMART_COLLECTIONS.find((c) => c.id === collectionId);
    if (!collection) return;
    const isActive = activeCollectionIds.has(collectionId);
    if (isActive) {
      const removeIds = new Set(collection.pills.map((p) => p.id));
      setPills((prev) => prev.filter((p) => !removeIds.has(p.id)));
    } else {
      setPills((prev) => dedupePills([...prev, ...collection.pills]));
    }
  }

  function handleAddPills(newPills: FilterPill[]) {
    setPills((prev) => dedupePills([...prev, ...newPills]));
  }

  function handleRemovePill(pillId: string) {
    setPills((prev) => prev.filter((p) => p.id !== pillId));
  }

  return (
    <div className="clr-page">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="clr-container">
        <LicitacionesTabs />
        <header className="clr-disc-header">
          <div>
            <span className="clr-tag">SECOP II · Agua y saneamiento</span>
            <h1 className="clr-h1">Descubrir licitaciones</h1>
            <p className="clr-sub">
              Colecciones listas para usar y búsqueda libre — combinables entre sí. Ningún filtro
              pide datos tuyos, solo atributos del proceso.
            </p>
          </div>
        </header>

        <SmartCollections
          activeCollectionIds={activeCollectionIds}
          onToggle={handleToggleCollection}
        />

        <FacetedSearchBar
          pills={pills}
          onAddPills={handleAddPills}
          onRemovePill={handleRemovePill}
        />

        <div className="clr-disc-context">
          <span className="clr-disc-count">
            {state === "loading" ? (
              "Cargando…"
            ) : (
              <>
                <strong>{results.length}</strong> proceso{results.length === 1 ? "" : "s"}
                {pills.length > 0 ? " con estos filtros" : ""}
              </>
            )}
          </span>
          {pills.length > 0 && (
            <button type="button" className="clr-disc-clear" onClick={() => setPills([])}>
              Limpiar todo
            </button>
          )}
        </div>

        {state === "error" && (
          <div className="clr-disc-empty clr-disc-error">
            No se pudo consultar SECOP: {errorMsg}
          </div>
        )}

        {state === "ready" && results.length === 0 && (
          <div className="clr-disc-empty">
            Ningún proceso cumple esta combinación de filtros. Prueba quitando alguna pill.
          </div>
        )}

        {state === "ready" && results.length > 0 && (
          <div className="clr-disc-grid">
            {results.map((item) => (
              <ResultCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const CSS = `
.clr-disc-header{
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: 16px; flex-wrap: wrap; margin-bottom: 22px;
}

.clr-disc-collections{
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin-bottom: 22px;
}
.clr-disc-collection{
  text-align: left;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 16px 18px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: var(--font-sans);
  transition: border-color 0.18s, transform 0.18s, box-shadow 0.18s, background 0.18s;
}
.clr-disc-collection:hover{
  border-color: var(--accent-soft);
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
}
.clr-disc-collection.is-active{
  border-color: var(--accent);
  background: var(--accent-faint);
  box-shadow: 0 0 0 3px var(--accent-faint);
}
.clr-disc-collection-glyph{ font-size: 20px; line-height: 1; margin-bottom: 4px; }
.clr-disc-collection-title{ font-size: var(--fs-sm); font-weight: 600; color: var(--ink-900); }
.clr-disc-collection-desc{ font-size: 12px; color: var(--ink-600); line-height: var(--lh-base); }

.clr-disc-search{ margin-bottom: 18px; }
.clr-disc-search-form{ display: flex; gap: 8px; }
.clr-disc-search-input{ flex: 1; }
.clr-disc-search-btn{
  background: var(--accent); color: #fff; border: none;
  font-size: var(--fs-sm); font-weight: 500;
  padding: 8px 18px; border-radius: var(--radius-md); cursor: pointer;
  transition: opacity 0.15s;
}
.clr-disc-search-btn:hover{ opacity: 0.88; }

.clr-disc-pills{
  display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px;
}
.clr-disc-pill{
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12.5px; color: var(--accent);
  background: var(--accent-faint);
  border: 1px solid var(--accent-soft);
  border-radius: var(--radius-pill);
  padding: 4px 6px 4px 12px;
  font-family: var(--font-sans);
}
.clr-disc-pill-remove{
  background: none; border: none; cursor: pointer;
  color: var(--accent); font-size: 15px; line-height: 1;
  padding: 2px 6px; border-radius: 50%;
  transition: background 0.15s;
}
.clr-disc-pill-remove:hover{ background: rgba(3,105,161,0.15); }

.clr-disc-context{
  display: flex; justify-content: space-between; align-items: center;
  gap: 10px; margin-bottom: 14px; font-size: 12.5px; color: var(--ink-600);
}
.clr-disc-count strong{ color: var(--ink-900); font-weight: 600; }
.clr-disc-clear{
  background: none; border: none; padding: 0;
  color: var(--accent); font-size: 12.5px; cursor: pointer;
  font-family: var(--font-sans);
}
.clr-disc-clear:hover{ text-decoration: underline; }

.clr-disc-empty{
  padding: 48px 24px; text-align: center;
  color: var(--ink-600); font-size: var(--fs-sm);
  border: 1px dashed var(--line); border-radius: var(--radius-lg);
}
.clr-disc-error{ color: var(--danger); border-color: var(--danger); }

.clr-disc-grid{
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}
.clr-disc-card{
  display: flex; flex-direction: column; gap: 8px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 16px 18px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.18s, transform 0.18s, box-shadow 0.18s;
}
.clr-disc-card:hover{
  border-color: var(--accent-soft);
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
}
.clr-disc-card-top{
  display: flex; justify-content: space-between; align-items: center; gap: 8px;
}
.clr-disc-card-val{ font-family: var(--font-mono); font-size: 12.5px; color: var(--ink-900); }
.clr-disc-card-title{
  margin: 0; font-size: 13.5px; font-weight: 500; color: var(--ink-900); line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.clr-disc-card-meta{
  margin: 0; font-size: 11.5px; color: var(--ink-600);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.clr-disc-gates{
  list-style: none; margin: 0; padding-top: 8px; margin-top: 4px;
  border-top: 1px solid var(--line-soft);
  display: grid; gap: 6px;
}
.clr-disc-gate{
  display: grid; grid-template-columns: 14px 68px 1fr; gap: 7px;
  align-items: baseline; font-size: 11.5px;
}
.clr-disc-gate-glyph{ font-weight: 700; line-height: 1.3; }
.clr-disc-gate-glyph--pass{ color: var(--success); }
.clr-disc-gate-glyph--warn{ color: var(--warning); }
.clr-disc-gate-glyph--fail{ color: var(--danger); }
.clr-disc-gate-glyph--unknown{ color: var(--ink-300); }
.clr-disc-gate-name{ color: var(--ink-900); }
.clr-disc-gate-detail{ color: var(--ink-600); }

@media (max-width: 640px){
  .clr-disc-header{ flex-direction: column; }
  .clr-disc-search-form{ flex-direction: column; }
}
`;
