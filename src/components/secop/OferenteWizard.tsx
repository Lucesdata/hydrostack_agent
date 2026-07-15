// src/components/secop/OferenteWizard.tsx
"use client";

/**
 * Mini-wizard de perfil de oferente (empresa o persona natural) — 4 pasos,
 * solo los campos que las compuertas Nivel 0 leen: sectores UNSPSC (Sectorial),
 * cobertura geográfica (Ubicación), rango de cuantía (Cuantía). Reemplaza al
 * OFERENTE_PILOTO hardcodeado. Se guarda en localStorage (clientStore), sin
 * cuenta ni backend.
 *
 * Spec: docs/superpowers/specs/2026-07-15-vista-simple-y-elegibilidad-diferida.md
 */

import { useState } from "react";
import type { OferenteProfile, TipoPersona } from "@/src/lib/oferente/types";
import { SECTOR_OPTIONS, buildOferenteProfile } from "@/src/lib/oferente/wizard";
import { DEPARTAMENTOS } from "@/data/dane/divipola";

const STEPS = ["identidad", "sectores", "cobertura", "cuantia"] as const;
type Step = (typeof STEPS)[number];

const STEP_TITLE: Record<Step, string> = {
  identidad: "¿Quién ofertaría?",
  sectores: "¿En qué sectores trabajas?",
  cobertura: "¿Dónde puedes operar?",
  cuantia: "¿Qué rango de valor te interesa?",
};

interface Props {
  onComplete: (perfil: OferenteProfile) => void;
  onCancel: () => void;
}

export default function OferenteWizard({ onComplete, onCancel }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [tipoPersona, setTipoPersona] = useState<TipoPersona>("juridica");
  const [sectores, setSectores] = useState<string[]>([]);
  const [departamentos, setDepartamentos] = useState<string[]>([]);
  const [minCop, setMinCop] = useState("");
  const [maxCop, setMaxCop] = useState("");

  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;

  const canAdvance =
    (step === "identidad" && !!tipoPersona) ||
    (step === "sectores" && sectores.length > 0) ||
    (step === "cobertura" && departamentos.length > 0) ||
    (step === "cuantia" &&
      minCop !== "" &&
      maxCop !== "" &&
      Number(minCop) >= 0 &&
      Number(maxCop) >= Number(minCop));

  function toggle(list: string[], set: (v: string[]) => void, value: string) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function back() {
    if (stepIdx > 0) setStepIdx((i) => i - 1);
    else onCancel();
  }

  function next() {
    if (!canAdvance) return;
    if (!isLast) {
      setStepIdx((i) => i + 1);
      return;
    }
    onComplete(
      buildOferenteProfile({
        tipoPersona,
        sectoresUnspsc: sectores,
        departamentos,
        municipios: [],
        minCop: Number(minCop),
        maxCop: Number(maxCop),
      }),
    );
  }

  return (
    <div className="clr-wiz-card">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <header className="clr-wiz-head">
        <span className="clr-wiz-step">
          Paso {stepIdx + 1} de {STEPS.length}
        </span>
        <h3 className="clr-wiz-title">{STEP_TITLE[step]}</h3>
      </header>

      {step === "identidad" && (
        <div className="clr-wiz-options">
          <label className={`clr-wiz-radio${tipoPersona === "juridica" ? " is-checked" : ""}`}>
            <input
              type="radio"
              name="tipoPersona"
              checked={tipoPersona === "juridica"}
              onChange={() => setTipoPersona("juridica")}
            />
            Empresa (persona jurídica)
          </label>
          <label className={`clr-wiz-radio${tipoPersona === "natural" ? " is-checked" : ""}`}>
            <input
              type="radio"
              name="tipoPersona"
              checked={tipoPersona === "natural"}
              onChange={() => setTipoPersona("natural")}
            />
            Persona natural
          </label>
        </div>
      )}

      {step === "sectores" && (
        <div className="clr-wiz-options">
          {SECTOR_OPTIONS.map((opt) => (
            <label
              key={opt.codigo}
              className={`clr-wiz-check${sectores.includes(opt.codigo) ? " is-checked" : ""}`}
            >
              <input
                type="checkbox"
                checked={sectores.includes(opt.codigo)}
                onChange={() => toggle(sectores, setSectores, opt.codigo)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      )}

      {step === "cobertura" && (
        <div className="clr-wiz-scroll">
          {DEPARTAMENTOS.map((d) => (
            <label
              key={d.departamentoCodigo}
              className={`clr-wiz-check${departamentos.includes(d.departamentoCodigo) ? " is-checked" : ""}`}
            >
              <input
                type="checkbox"
                checked={departamentos.includes(d.departamentoCodigo)}
                onChange={() => toggle(departamentos, setDepartamentos, d.departamentoCodigo)}
              />
              {d.departamentoNombre}
            </label>
          ))}
        </div>
      )}

      {step === "cuantia" && (
        <div className="clr-wiz-cuantia">
          <label className="clr-wiz-field">
            Valor mínimo (COP)
            <input
              className="clr-input"
              type="number"
              min={0}
              value={minCop}
              onChange={(e) => setMinCop(e.target.value)}
              placeholder="50.000.000"
            />
          </label>
          <label className="clr-wiz-field">
            Valor máximo (COP)
            <input
              className="clr-input"
              type="number"
              min={0}
              value={maxCop}
              onChange={(e) => setMaxCop(e.target.value)}
              placeholder="2.000.000.000"
            />
          </label>
        </div>
      )}

      <footer className="clr-wiz-foot">
        <button type="button" className="clr-wiz-back" onClick={back}>
          {stepIdx === 0 ? "Cancelar" : "← Atrás"}
        </button>
        <button type="button" className="clr-wiz-next" disabled={!canAdvance} onClick={next}>
          {isLast ? "Ver mi elegibilidad" : "Siguiente →"}
        </button>
      </footer>
    </div>
  );
}

const CSS = `
.clr-wiz-card{
  background: var(--card, #fff);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 18px 20px;
  display: flex; flex-direction: column; gap: 14px;
}
.clr-wiz-head{ display: flex; flex-direction: column; gap: 4px; }
.clr-wiz-step{ font-size: 11px; color: var(--ink-600); font-family: var(--font-mono); }
.clr-wiz-title{ font-size: 15px; font-weight: 600; color: var(--ink-900); margin: 0; }
.clr-wiz-options{ display: flex; flex-direction: column; gap: 8px; }
.clr-wiz-scroll{
  display: flex; flex-direction: column; gap: 6px;
  max-height: 220px; overflow-y: auto;
  border: 1px solid var(--line); border-radius: var(--radius-md);
  padding: 10px 12px;
}
.clr-wiz-radio, .clr-wiz-check{
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: var(--ink-900);
  border: 1px solid var(--line); border-radius: var(--radius-md);
  padding: 9px 12px; cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.clr-wiz-scroll .clr-wiz-check{ border: none; padding: 3px 0; }
.clr-wiz-radio:hover, .clr-wiz-check:hover{ border-color: var(--accent-soft); }
.clr-wiz-radio.is-checked, .clr-wiz-check.is-checked{
  border-color: var(--accent); background: var(--accent-faint);
}
.clr-wiz-radio input, .clr-wiz-check input{ accent-color: var(--accent); }
.clr-wiz-cuantia{ display: flex; gap: 12px; flex-wrap: wrap; }
.clr-wiz-field{
  display: flex; flex-direction: column; gap: 5px;
  font-size: 11.5px; color: var(--ink-600); flex: 1; min-width: 160px;
}
.clr-wiz-foot{
  display: flex; justify-content: space-between; align-items: center;
  border-top: 1px solid var(--line); padding-top: 12px;
}
.clr-wiz-back{
  background: none; border: none; padding: 0;
  color: var(--ink-600); font-size: 12.5px; cursor: pointer; font-family: var(--font-sans);
}
.clr-wiz-back:hover{ color: var(--ink-900); }
.clr-wiz-next{
  background: var(--accent); color: #fff; border: none;
  font-size: 12.5px; font-weight: 500;
  padding: 8px 16px; border-radius: var(--radius-md); cursor: pointer;
  transition: opacity 0.15s;
}
.clr-wiz-next:hover:not(:disabled){ opacity: 0.88; }
.clr-wiz-next:disabled{ opacity: 0.4; cursor: not-allowed; }
`;
