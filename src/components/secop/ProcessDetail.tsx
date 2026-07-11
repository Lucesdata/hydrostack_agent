// src/components/secop/ProcessDetail.tsx
"use client";

/**
 * Panel de detalle del workbench: badges, datos clave, bloque de elegibilidad
 * (compuertas con razones visibles), descripción y CTA a SECOP II.
 * El padre lo monta con key={proceso.id} para resetear el estado interno.
 */

import { useState } from "react";
import type { DocumentAccess } from "@/src/lib/secop/document-access";
import type { Verdict, GateStatus } from "@/src/lib/secop/verdict";
import { formatCopFull, sentenceCaseTitle } from "./format";
import type { ProcesoVeredicto } from "./ProcessList";

const ACCESS_LABEL: Record<DocumentAccess, string> = {
  PUBLIC: "Documentos públicos",
  RESTRICTED: "Documentos restringidos",
  NOT_PUBLISHED: "Documentos sin publicar",
  UNKNOWN: "Acceso por confirmar",
};
const ACCESS_CLASS: Record<DocumentAccess, string> = {
  PUBLIC: "success",
  RESTRICTED: "warning",
  NOT_PUBLISHED: "warning",
  UNKNOWN: "neutral",
};

const STATUS: Record<GateStatus, { cls: string; glyph: string }> = {
  PASS: { cls: "pass", glyph: "✓" },
  WARN: { cls: "warn", glyph: "!" },
  FAIL: { cls: "fail", glyph: "✕" },
  UNKNOWN: { cls: "unknown", glyph: "?" },
};

const GATE_LABEL: Array<[keyof Verdict["gates"], string]> = [
  ["sectorial", "Sector"],
  ["cuantia", "Cuantía"],
  ["plazo", "Plazo"],
  ["ubicacion", "Zona"],
  ["habilitacion", "Habilitación"],
];

interface Props {
  proceso: ProcesoVeredicto;
  access: { state: DocumentAccess; message: string };
  probing: boolean;
  /** Solo móvil: cierra el overlay. */
  onBack: () => void;
}

export default function ProcessDetail({ proceso: p, access, probing, onBack }: Props) {
  const [expanded, setExpanded] = useState(false);
  const v = p.verdict;
  const passCount = v
    ? Object.values(v.gates).filter((g) => g.status === "PASS").length
    : 0;

  return (
    <article className="clr-pdetail-card">
      <button type="button" className="clr-pdetail-back" onClick={onBack}>
        ← Volver a resultados
      </button>

      <div className="clr-pdetail-badges">
        <span
          className={`clr-badge clr-badge--${p.estadoApertura === "Abierto" ? "accent" : "neutral"}`}
        >
          {(p.estadoApertura ?? p.estado ?? "—").toUpperCase()}
        </span>
        {p.modalidad && <span className="clr-badge clr-badge--neutral">{p.modalidad}</span>}
        {p.tipoContrato && (
          <span className="clr-badge clr-badge--neutral">{p.tipoContrato}</span>
        )}
      </div>

      <h2 className="clr-pdetail-title">{sentenceCaseTitle(p.nombre || p.referencia)}</h2>
      <p className="clr-secop-entity">{p.entidad}</p>

      <div className="clr-pdetail-facts">
        <div>
          <span className="clr-pdetail-label">Valor base</span>
          <span className="clr-pdetail-val">
            {formatCopFull(p.valorAdjudicacion ?? p.precioBase)}
          </span>
        </div>
        <div>
          <span className="clr-pdetail-label">Publicado</span>
          <span>
            {p.fechaPublicacion
              ? new Date(p.fechaPublicacion).toLocaleDateString("es-CO")
              : "—"}
          </span>
        </div>
        <div>
          <span className="clr-pdetail-label">Referencia</span>
          <span className="clr-pdetail-ref">{p.referencia || "—"}</span>
        </div>
        <div>
          <span className="clr-pdetail-label">Ubicación</span>
          <span>
            {p.departamento}
            {p.ciudad ? ` · ${p.ciudad}` : ""}
          </span>
        </div>
      </div>

      {v && (
        <section className="clr-elig" aria-label="Elegibilidad">
          <header className="clr-elig-head">
            <span>Elegibilidad · nivel 0</span>
            <span className="clr-elig-count">{passCount} de {GATE_LABEL.length} compuertas</span>
          </header>
          <div className="clr-elig-bar">
            {GATE_LABEL.map(([key]) => (
              <span key={key} className={`clr-elig-seg clr-elig-seg--${STATUS[v.gates[key].status].cls}`} />
            ))}
          </div>
          <ul className="clr-elig-gates">
            {GATE_LABEL.map(([key, label]) => {
              const g = v.gates[key];
              const s = STATUS[g.status];
              return (
                <li key={key} className="clr-elig-gate">
                  <span className={`clr-elig-glyph clr-elig-glyph--${s.cls}`}>{s.glyph}</span>
                  <span className="clr-elig-name">{label}</span>
                  <span className="clr-elig-reason">
                    {g.reason}
                    {g.requiredLevel === 2 ? " · requiere revisar pliego (nivel 2)" : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {p.descripcion && (
        <div className={`clr-pdetail-desc${expanded ? " is-expanded" : ""}`}>
          <p>{p.descripcion}</p>
          {p.descripcion.length > 320 && (
            <button
              type="button"
              className="clr-pdetail-more"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? "Ver menos" : "Ver más"}
            </button>
          )}
        </div>
      )}

      {p.adjudicatario && p.adjudicatario !== "No Adjudicado" && (
        <p className="clr-secop-adj">
          Adjudicatario: <strong>{p.adjudicatario}</strong>
        </p>
      )}

      <footer className="clr-pdetail-foot">
        <span className={`clr-badge clr-badge--${ACCESS_CLASS[access.state]}`}>
          {probing ? "Verificando acceso…" : ACCESS_LABEL[access.state]}
        </span>
        {p.url && (
          <a className="clr-pdetail-cta" href={p.url} target="_blank" rel="noreferrer">
            Abrir en SECOP II ↗
          </a>
        )}
      </footer>
    </article>
  );
}
