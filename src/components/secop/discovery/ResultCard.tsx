// src/components/secop/discovery/ResultCard.tsx
"use client";

/**
 * Tarjeta de resultado — Colecciones + Búsqueda facetada (MOCK).
 * Reutiliza el vocabulario visual del semáforo de elegibilidad (glyphs
 * ✓ / ! / ✕ / ? sobre pass/warn/fail/unknown) para un "tanque" de 3
 * indicadores objetivos del proceso: urgencia, competencia y estado del
 * pliego. Ninguno de estos indicadores depende de datos del usuario.
 */

import type { MockLicitacion } from "@/src/lib/secop/mock-licitaciones";
import { formatCopCompact } from "../format";

type GateTone = "pass" | "warn" | "fail" | "unknown";

interface Gate {
  label: string;
  glyph: string;
  tone: GateTone;
  detail: string;
}

const GLYPH: Record<GateTone, string> = { pass: "✓", warn: "!", fail: "✕", unknown: "?" };

function urgenciaGate(item: MockLicitacion): Gate {
  if (!item.abierto || item.diasParaCierre == null) {
    return { label: "Plazo", glyph: GLYPH.unknown, tone: "unknown", detail: "Cerrado" };
  }
  if (item.diasParaCierre <= 3) {
    return { label: "Plazo", glyph: GLYPH.fail, tone: "fail", detail: `Cierra en ${item.diasParaCierre} d.` };
  }
  if (item.diasParaCierre <= 7) {
    return { label: "Plazo", glyph: GLYPH.warn, tone: "warn", detail: `Cierra en ${item.diasParaCierre} d.` };
  }
  return { label: "Plazo", glyph: GLYPH.pass, tone: "pass", detail: `Cierra en ${item.diasParaCierre} d.` };
}

function competenciaGate(item: MockLicitacion): Gate {
  if (item.competencia === "baja") return { label: "Competencia", glyph: GLYPH.pass, tone: "pass", detail: "Baja" };
  if (item.competencia === "media") return { label: "Competencia", glyph: GLYPH.warn, tone: "warn", detail: "Media" };
  return { label: "Competencia", glyph: GLYPH.fail, tone: "fail", detail: "Alta" };
}

function extraccionGate(item: MockLicitacion): Gate {
  return item.pliegoListoParaExtraer
    ? { label: "Pliego", glyph: GLYPH.pass, tone: "pass", detail: "Listo" }
    : { label: "Pliego", glyph: GLYPH.warn, tone: "warn", detail: "Pendiente" };
}

export default function ResultCard({ item }: { item: MockLicitacion }) {
  const gates = [urgenciaGate(item), competenciaGate(item), extraccionGate(item)];

  return (
    <a
      className="clr-disc-card"
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="clr-disc-card-top">
        <span className="clr-badge clr-badge--neutral clr-disc-mock-badge">MOCK</span>
        <span className="clr-disc-card-val">{formatCopCompact(item.valorEstimado)}</span>
      </div>
      <p className="clr-disc-card-title">{item.objeto}</p>
      <p className="clr-disc-card-meta">
        {item.entidad} · {item.municipio}, {item.departamento}
      </p>
      <div className="clr-disc-tags">
        {item.sectorTags.map((t) => (
          <span key={t} className="clr-badge clr-badge--accent">{t}</span>
        ))}
      </div>
      <ul className="clr-disc-gates">
        {gates.map((g) => (
          <li key={g.label} className={`clr-disc-gate clr-disc-gate--${g.tone}`}>
            <span className={`clr-disc-gate-glyph clr-disc-gate-glyph--${g.tone}`}>{g.glyph}</span>
            <span className="clr-disc-gate-name">{g.label}</span>
            <span className="clr-disc-gate-detail">{g.detail}</span>
          </li>
        ))}
      </ul>
    </a>
  );
}
