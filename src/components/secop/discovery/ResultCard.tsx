// src/components/secop/discovery/ResultCard.tsx
"use client";

/**
 * Tarjeta de resultado — Colecciones + Búsqueda facetada, sobre datos reales.
 * Reutiliza el vocabulario visual del semáforo de elegibilidad (glyphs
 * ✓ / ! / ✕ / ? sobre pass/warn/fail/unknown) para 2 indicadores objetivos
 * del proceso: apertura y acceso al pliego. (El mock original tenía un
 * tercer indicador "competencia" sin contraparte real — ver discovery.ts.)
 */

import type { SecopProceso } from "@/src/lib/secop/types";
import { canExtract } from "@/src/lib/secop/document-access";
import { sentenceCaseTitle, formatCopCompact } from "../format";

type GateTone = "pass" | "warn" | "fail" | "unknown";

interface Gate {
  label: string;
  glyph: string;
  tone: GateTone;
  detail: string;
}

const GLYPH: Record<GateTone, string> = { pass: "✓", warn: "!", fail: "✕", unknown: "?" };

function aperturaGate(item: SecopProceso): Gate {
  if (item.estadoApertura == null) {
    return { label: "Apertura", glyph: GLYPH.unknown, tone: "unknown", detail: "Sin dato" };
  }
  if (item.estadoApertura === "Abierto" && !item.adjudicado) {
    return { label: "Apertura", glyph: GLYPH.pass, tone: "pass", detail: "Abierto" };
  }
  if (item.estadoApertura === "Abierto" && item.adjudicado) {
    return { label: "Apertura", glyph: GLYPH.warn, tone: "warn", detail: "Abierto · adjudicado" };
  }
  return { label: "Apertura", glyph: GLYPH.fail, tone: "fail", detail: "Cerrado" };
}

function extraccionGate(item: SecopProceso): Gate {
  if (canExtract(item.documentAccess)) {
    return { label: "Pliego", glyph: GLYPH.pass, tone: "pass", detail: "Público" };
  }
  if (item.documentAccess === "UNKNOWN") {
    return { label: "Pliego", glyph: GLYPH.unknown, tone: "unknown", detail: "Sin probar" };
  }
  return { label: "Pliego", glyph: GLYPH.warn, tone: "warn", detail: "No disponible" };
}

export default function ResultCard({ item }: { item: SecopProceso }) {
  const gates = [aperturaGate(item), extraccionGate(item)];
  const titulo = sentenceCaseTitle(item.nombre || item.descripcion || item.referencia);

  return (
    <a
      className="clr-disc-card"
      href={item.url ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="clr-disc-card-top">
        {item.unspsc && <span className="clr-badge clr-badge--neutral">{item.unspsc}</span>}
        <span className="clr-disc-card-val">{formatCopCompact(item.precioBase)}</span>
      </div>
      <p className="clr-disc-card-title">{titulo}</p>
      <p className="clr-disc-card-meta">
        {item.entidad} · {item.ciudad}, {item.departamento}
      </p>
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
