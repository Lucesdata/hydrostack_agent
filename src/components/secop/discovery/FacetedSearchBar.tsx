// src/components/secop/discovery/FacetedSearchBar.tsx
"use client";

/**
 * Búsqueda libre que se traduce en pills de filtro. El parser es por
 * palabras clave (ver parseSearchQuery en mock-licitaciones.ts) — no NLP
 * real, suficiente para maquetar la interacción "escribo → aparecen pills".
 */

import { useState, type FormEvent } from "react";
import { parseSearchQuery, type FilterPill } from "@/src/lib/secop/discovery";

interface Props {
  pills: FilterPill[];
  onAddPills: (pills: FilterPill[]) => void;
  onRemovePill: (pillId: string) => void;
}

export default function FacetedSearchBar({ pills, onAddPills, onRemovePill }: Props) {
  const [query, setQuery] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = parseSearchQuery(query);
    if (parsed.length > 0) onAddPills(parsed);
    setQuery("");
  }

  return (
    <div className="clr-disc-search">
      <form onSubmit={handleSubmit} className="clr-disc-search-form">
        <input
          className="clr-input clr-disc-search-input"
          placeholder='Escribe libremente, ej. "PSMV Valle del Cauca 7 días"'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="clr-disc-search-btn">Buscar</button>
      </form>

      {pills.length > 0 && (
        <div className="clr-disc-pills" role="list" aria-label="Filtros activos">
          {pills.map((p) => (
            <span key={p.id} role="listitem" className={`clr-disc-pill clr-disc-pill--${p.type}`}>
              {p.label}
              <button
                type="button"
                className="clr-disc-pill-remove"
                aria-label={`Quitar filtro ${p.label}`}
                onClick={() => onRemovePill(p.id)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
