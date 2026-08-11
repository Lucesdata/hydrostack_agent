// src/components/secop/ProcessList.tsx
"use client";

/**
 * Lista compacta de procesos (columna izquierda del workbench).
 * Presentación pura: el estado (selección, datos) vive en SecopExplorer.
 */

import type { SecopProceso } from "@/src/lib/secop/types";
import type { Verdict } from "@/src/lib/secop/verdict";
import { sentenceCaseTitle, formatCopCompact, formatShortDate, verdictScore } from "./format";

/** Proceso con veredicto Nivel 0 adjunto por /api/secop. */
export type ProcesoVeredicto = SecopProceso & { verdict?: Verdict };

/** Estados del procedimiento que se consideran "no vivos" para la UI. */
const ESTADOS_CERRADOS = ["Cancelado", "Desierto"];

interface Props {
  items: ProcesoVeredicto[];
  selectedId: string | null;
  onSelect: (p: ProcesoVeredicto) => void;
  loading: boolean;
}

export default function ProcessList({ items, selectedId, onSelect, loading }: Props) {
  if (loading) {
    return (
      <div className="clr-plist" aria-busy="true" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="clr-prow clr-prow--skel" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <div className="clr-secop-empty">Sin resultados para estos filtros.</div>;
  }

  return (
    <div className="clr-plist" role="list" aria-label="Procesos de contratación">
      {items.map((p) => {
        const closed =
          p.estadoApertura === "Cerrado" || ESTADOS_CERRADOS.includes(p.estado);
        const score = p.verdict ? verdictScore(p.verdict) : null;
        const fecha = formatShortDate(p.fechaPublicacion);
        return (
          <button
            key={p.id}
            type="button"
            aria-current={p.id === selectedId ? "true" : undefined}
            className={`clr-prow${p.id === selectedId ? " is-selected" : ""}${closed ? " is-closed" : ""}`}
            onClick={() => onSelect(p)}
          >
            {closed && p.estado && (
              <span className="clr-prow-state">{p.estado.toUpperCase()}</span>
            )}
            <span className="clr-prow-title">
              {sentenceCaseTitle(p.nombre || p.referencia)}
            </span>
            <span className="clr-prow-meta">
              {p.entidad}
              {p.departamento ? ` · ${p.departamento}` : ""}
              {fecha ? ` · ${fecha}` : ""}
            </span>
            <span className="clr-prow-foot">
              <span className="clr-prow-val">
                {formatCopCompact(p.valorAdjudicacion ?? p.precioBase)}
              </span>
              {score && (
                <span className={`clr-prow-score clr-prow-score--${score.tone}`}>
                  <span className="clr-prow-dot" />
                  {score.pass}/{score.total}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
