// src/components/secop/RupWizard.tsx
"use client";

/**
 * Segundo wizard, específico de Nivel 2 (Habilitación) — se abre sobre un
 * OferenteProfile que YA existe (creado por OferenteWizard: identidad,
 * sectores, cobertura, cuantía). Pide solo lo que sectorialGate/cuantiaGate/
 * ubicacionGate NO leen: experiencia aportable e indicadores financieros
 * ampliados. Cada paso es saltable — completar después es válido, y
 * habilitacionGate reporta VERIFICAR en los campos ausentes en vez de fallar.
 */

import { useState } from "react";
import type { OferenteProfile, ExperienciaContrato } from "@/src/lib/oferente/types";
import { searchUnspsc } from "@/src/lib/oferente/unspsc-catalog";

const STEPS = ["experiencia", "financiera"] as const;
type Step = (typeof STEPS)[number];

const STEP_TITLE: Record<Step, string> = {
  experiencia: "Experiencia aportable (RUP)",
  financiera: "Capacidad financiera y organizacional",
};

interface Props {
  perfil: OferenteProfile;
  onComplete: (perfil: OferenteProfile) => void;
  onSkip: () => void;
}

function emptyContrato(): ExperienciaContrato {
  return {
    objeto: "",
    valorSmmlv: 0,
    unspscCodigos: [],
    anioTerminacion: new Date().getFullYear(),
  };
}

export default function RupWizard({ perfil, onComplete, onSkip }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [experiencia, setExperiencia] = useState<ExperienciaContrato[]>(perfil.experiencia ?? []);
  const [query, setQuery] = useState("");
  const [indiceLiquidez, setIndiceLiquidez] = useState(
    String(perfil.capacidadFinanciera.indiceLiquidez ?? "")
  );
  const [indiceEndeudamiento, setIndiceEndeudamiento] = useState(
    String(perfil.capacidadFinanciera.indiceEndeudamiento ?? "")
  );
  const [razonCoberturaIntereses, setRazonCoberturaIntereses] = useState(
    String(perfil.capacidadFinanciera.razonCoberturaIntereses ?? "")
  );
  const [rentabilidadPatrimonio, setRentabilidadPatrimonio] = useState(
    String(perfil.capacidadFinanciera.rentabilidadPatrimonio ?? "")
  );
  const [rentabilidadActivo, setRentabilidadActivo] = useState(
    String(perfil.capacidadFinanciera.rentabilidadActivo ?? "")
  );
  const [patrimonioSmmlv, setPatrimonioSmmlv] = useState(
    String(perfil.capacidadFinanciera.patrimonioSmmlv ?? "")
  );
  const [capitalTrabajoSmmlv, setCapitalTrabajoSmmlv] = useState(
    String(perfil.capacidadFinanciera.capitalTrabajoSmmlv ?? "")
  );

  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;
  const opciones = searchUnspsc(query).slice(0, 8);

  function updateContrato(i: number, patch: Partial<ExperienciaContrato>) {
    setExperiencia((list) => list.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  function finish() {
    const num = (s: string) => (s.trim() === "" ? undefined : Number(s));
    onComplete({
      ...perfil,
      experiencia,
      capacidadFinanciera: {
        ...perfil.capacidadFinanciera,
        indiceLiquidez: Number(indiceLiquidez) || 0,
        indiceEndeudamiento: Number(indiceEndeudamiento) || 0,
        razonCoberturaIntereses: Number(razonCoberturaIntereses) || 0,
        rentabilidadPatrimonio: num(rentabilidadPatrimonio),
        rentabilidadActivo: num(rentabilidadActivo),
        patrimonioSmmlv: num(patrimonioSmmlv),
        capitalTrabajoSmmlv: num(capitalTrabajoSmmlv),
      },
    });
  }

  function next() {
    if (!isLast) {
      setStepIdx((i) => i + 1);
      return;
    }
    finish();
  }

  function back() {
    if (stepIdx > 0) setStepIdx((i) => i - 1);
    else onSkip();
  }

  return (
    <div className="clr-wiz-card">
      <header className="clr-wiz-head">
        <span className="clr-wiz-step">
          Paso {stepIdx + 1} de {STEPS.length} · perfil RUP
        </span>
        <h3 className="clr-wiz-title">{STEP_TITLE[step]}</h3>
      </header>

      {step === "experiencia" && (
        <div className="clr-wiz-options">
          {experiencia.map((c, i) => (
            <div key={i} className="clr-rup-contrato">
              <input
                className="clr-input"
                placeholder="Objeto del contrato"
                value={c.objeto}
                onChange={(e) => updateContrato(i, { objeto: e.target.value })}
              />
              <input
                className="clr-input"
                type="number"
                min={0}
                placeholder="Valor (SMMLV)"
                value={c.valorSmmlv ?? ""}
                onChange={(e) => updateContrato(i, { valorSmmlv: Number(e.target.value) })}
              />
              <input
                className="clr-input"
                type="number"
                placeholder="Año de terminación"
                value={c.anioTerminacion ?? ""}
                onChange={(e) => updateContrato(i, { anioTerminacion: Number(e.target.value) })}
              />
              <input
                className="clr-input"
                placeholder="Buscar código UNSPSC…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <div className="clr-wiz-scroll">
                  {opciones.map((o) => (
                    <label key={o.codigo} className="clr-wiz-check">
                      <input
                        type="checkbox"
                        checked={c.unspscCodigos.includes(o.codigo)}
                        onChange={() =>
                          updateContrato(i, {
                            unspscCodigos: c.unspscCodigos.includes(o.codigo)
                              ? c.unspscCodigos.filter((x) => x !== o.codigo)
                              : [...c.unspscCodigos, o.codigo],
                          })
                        }
                      />
                      {o.codigo} — {o.label}
                    </label>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="clr-wiz-back"
                onClick={() => setExperiencia((list) => list.filter((_, idx) => idx !== i))}
              >
                Quitar
              </button>
            </div>
          ))}
          <button
            type="button"
            className="clr-wiz-next"
            onClick={() => setExperiencia((list) => [...list, emptyContrato()])}
          >
            + Añadir contrato
          </button>
        </div>
      )}

      {step === "financiera" && (
        <div className="clr-wiz-cuantia">
          <label className="clr-wiz-field">
            Índice de liquidez (veces)
            <input
              className="clr-input"
              type="number"
              step="0.01"
              value={indiceLiquidez}
              onChange={(e) => setIndiceLiquidez(e.target.value)}
            />
          </label>
          <label className="clr-wiz-field">
            Índice de endeudamiento (0–1)
            <input
              className="clr-input"
              type="number"
              step="0.01"
              value={indiceEndeudamiento}
              onChange={(e) => setIndiceEndeudamiento(e.target.value)}
            />
          </label>
          <label className="clr-wiz-field">
            Razón de cobertura de intereses (veces)
            <input
              className="clr-input"
              type="number"
              step="0.01"
              value={razonCoberturaIntereses}
              onChange={(e) => setRazonCoberturaIntereses(e.target.value)}
            />
          </label>
          <label className="clr-wiz-field">
            Rentabilidad del patrimonio (0–1)
            <input
              className="clr-input"
              type="number"
              step="0.01"
              value={rentabilidadPatrimonio}
              onChange={(e) => setRentabilidadPatrimonio(e.target.value)}
            />
          </label>
          <label className="clr-wiz-field">
            Rentabilidad del activo (0–1)
            <input
              className="clr-input"
              type="number"
              step="0.01"
              value={rentabilidadActivo}
              onChange={(e) => setRentabilidadActivo(e.target.value)}
            />
          </label>
          <label className="clr-wiz-field">
            Patrimonio (SMMLV)
            <input
              className="clr-input"
              type="number"
              value={patrimonioSmmlv}
              onChange={(e) => setPatrimonioSmmlv(e.target.value)}
            />
          </label>
          <label className="clr-wiz-field">
            Capital de trabajo (SMMLV)
            <input
              className="clr-input"
              type="number"
              value={capitalTrabajoSmmlv}
              onChange={(e) => setCapitalTrabajoSmmlv(e.target.value)}
            />
          </label>
        </div>
      )}

      <footer className="clr-wiz-foot">
        <button type="button" className="clr-wiz-back" onClick={back}>
          {stepIdx === 0 ? "Completar después" : "← Atrás"}
        </button>
        <button type="button" className="clr-wiz-next" onClick={next}>
          {isLast ? "Ver mi habilitación →" : "Siguiente →"}
        </button>
      </footer>
    </div>
  );
}
