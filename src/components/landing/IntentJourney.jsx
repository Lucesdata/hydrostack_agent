"use client";
// src/components/landing/IntentJourney.jsx
// Fig. 02 — diagrama de recorrido: línea de 4 nodos del proceso de
// licitación + entrada alterna (problema de agua) + panel con vista previa
// real del producto por momento. El estado del waitlist ("Vendo o fabrico
// soluciones") sube al padre porque app/page.js ya maneja el fetch a
// /api/mercado/waitlist — este componente solo lo pinta.

import Link from "next/link";
import { useState } from "react";

const NODES = [
  { id: 1, n: "01", title: "Busco contratos", phase: "entrada" },
  { id: 2, n: "02", title: "Tengo un pliego que descifrar", phase: "preparación" },
  { id: 3, n: "03", title: "Gané un contrato", phase: "ejecución" },
  { id: 4, n: "04", title: "Opero un acueducto o una ESP", phase: "operación" },
];

const ALT_ENTRY_ID = 5;
const ALT_ENTRY_TITLE = "Tengo un problema de agua o vertimientos";

const PANELS = {
  1: {
    title: "Busca procesos y sabe de entrada si calificas",
    body: "Cruzamos los procesos activos de agua y saneamiento del SECOP II con tu RUP, y te decimos cuáles puedes ganar antes de que escribas una sola página.",
    cta: "BUSCAR PROCESOS",
    href: "/licitaciones",
  },
  2: {
    title: "Un pliego de 104 páginas, en checklist",
    body: "El asistente extrae requisitos habilitantes, técnicos y financieros, y te muestra cada uno con su página y numeral para que puedas verificarlo.",
    cta: "DECODIFICAR PLIEGO",
    href: "/pliego",
  },
  3: {
    title: "Ganaste. Ahora hay que ejecutar sin sanciones",
    body: "Actas, pólizas, informes de avance y liquidación con sus plazos. Te avisamos antes de cada vencimiento, no después.",
    cta: "EMPEZAR",
    href: "/asistente/ejecucion",
  },
  4: {
    title: "Normativa respondida y citada",
    body: "RAS, Res. 0330, CRA y reportes al SUI. Cada respuesta trae el artículo exacto, para que puedas sustentarla ante quien sea.",
    cta: "CONSULTAR",
    href: "/asistente/operacion",
  },
  5: {
    title: "De un problema de agua a una solución contratable",
    body: "Te llevamos del diagnóstico a la alternativa técnica y de ahí a cómo contratarla: modalidad, presupuesto y quién puede ejecutarla.",
    cta: "VER EL CAMINO",
    href: "/soluciones",
  },
};

const PROCESOS_PREVIEW_ROWS = [
  { entidad: "Aguas del Norte E.S.P.", cuantia: "$4.850 M", cierre: "28 ago", estado: "ok" },
  { entidad: "Alcaldía de Tumaco", cuantia: "$1.230 M", cierre: "02 sep", estado: "warn" },
  { entidad: "EPS Nariño", cuantia: "$3.850 M", cierre: "11 sep", estado: "ok" },
];

const REQUISITOS_PREVIEW_ROWS = [
  { text: "Experiencia específica en PTAR", page: "pág. 34", status: "ok" },
  { text: "Índice de liquidez ≥ 1,5", page: "pág. 41", status: "ok" },
  { text: "Capacidad residual insuficiente", page: "pág. 42", status: "warn" },
  { text: "Certificación RETIE del proveedor", page: "pág. 58", status: "unknown" },
];

const EJECUCION_PREVIEW_ROWS = [
  { label: "Acta de inicio y pólizas", status: "100% entregado", pct: 100 },
  { label: "Informe de avance 01", status: "100% aprobado", pct: 100 },
  { label: "Informe de avance 02", status: "45% en curso", pct: 45 },
  { label: "Acta de liquidación", status: "0% pendiente", pct: 0 },
];

const NORMATIVA_PREVIEW = {
  question: "¿Cada cuánto debo reportar al SUI el índice de agua no contabilizada?",
  answer:
    "Reporte trimestral, dentro de los 30 días siguientes al cierre del trimestre; el cargue se hace por el formulario de gestión comercial.",
  citations: ["Res. CRA 906 · Art. 12", "Res. 0330 · Art. 34"],
};

const RUTA_PREVIEW_STEPS = [
  { n: "01", title: "Diagnóstico", desc: "Caudal, carga contaminante y norma que te aplica" },
  {
    n: "02",
    title: "Alternativa técnica",
    desc: "Qué tecnología resuelve tu caso y qué cuesta operarla",
  },
  {
    n: "03",
    title: "Cómo contratarlo",
    desc: "Modalidad, presupuesto oficial y quién puede ejecutarlo",
  },
];

const INTENT_JOURNEY_CSS = `
@keyframes ij-dash { to { background-position: 20px 0; } }
@keyframes ij-ping { 0%,100% { transform: scale(1); opacity: .25; } 50% { transform: scale(1.8); opacity: 0; } }

.ij-wrap { position: relative; }

.ij-line { position: relative; display: flex; flex-wrap: wrap; }
.ij-line::before {
  content: "";
  position: absolute;
  top: 9px;
  left: 12%;
  right: 12%;
  height: 1px;
  background: repeating-linear-gradient(90deg, #0369A1 0 9px, transparent 9px 20px);
  opacity: .45;
  animation: ij-dash 6s linear infinite;
  pointer-events: none;
}

.ij-node {
  position: relative;
  flex: 1 1 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 0 8px 14px;
  background: transparent;
  border: 0;
  cursor: pointer;
  text-align: center;
  transition: transform .16s ease;
}
.ij-node:hover { transform: translateY(-2px); }
.ij-node-circle {
  position: relative;
  width: 19px;
  height: 19px;
  border-radius: 50%;
  border: 1.5px solid #0369A1;
  background: #FCFCF9;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ij-node-ping {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: #0369A1;
  opacity: .25;
  animation: ij-ping 3s ease-out infinite;
}
.ij-node-dot { position: relative; width: 9px; height: 9px; border-radius: 50%; background: #0369A1; }
.ij-node-label { font: 10px var(--font-jetbrains-mono), monospace; color: #6B746F; text-transform: uppercase; }
.ij-node-title { font: 600 14px/1.35 var(--font-inter); color: #0A1F1C; }
.ij-node-phase { font: 11px var(--font-jetbrains-mono), monospace; color: #6B746F; }
.ij-node-bar {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 2px;
  background: #0369A1;
}

.ij-alt-row { display: flex; align-items: center; gap: 12px; margin-top: 20px; flex-wrap: wrap; }
.ij-alt-label { font: 10px var(--font-jetbrains-mono), monospace; color: #6B746F; letter-spacing: .1em; text-transform: uppercase; white-space: nowrap; }
.ij-alt-dash { width: 40px; height: 1px; border-top: 1px dashed #DADAD2; }
.ij-alt-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: transparent;
  border: 1px solid #DADAD2;
  padding: 9px 16px;
  font: 600 13px var(--font-inter);
  color: #0A1F1C;
  cursor: pointer;
  transition: border-color .16s ease;
}
.ij-alt-btn:hover, .ij-alt-btn[aria-pressed="true"] { border-color: #0369A1; }
.ij-alt-circle { width: 15px; height: 15px; border-radius: 50%; border: 1.5px solid #0369A1; flex-shrink: 0; }

.ij-panel {
  border-top: 1px dashed #DADAD2;
  padding-top: 34px;
  margin-top: 34px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 36px;
  align-items: start;
}
.ij-panel-title {
  font-family: var(--font-ibm-plex-sans-condensed), var(--font-inter), sans-serif;
  font-weight: 700;
  font-size: 28px;
  line-height: 1.2;
  color: #0A1F1C;
  margin: 0 0 14px;
}
.ij-panel-body { font: 14.5px/1.6 var(--font-inter); color: #525B5A; max-width: 420px; text-wrap: pretty; margin: 0 0 22px; }
.ij-panel-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #0369A1;
  color: #fff;
  font: 600 12px var(--font-jetbrains-mono), monospace;
  padding: 11px 22px 11px 20px;
}

.ij-preview {
  position: relative;
  background: #fff;
  border: 1px solid #DADAD2;
  padding: 20px;
  min-height: 236px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.ij-preview-corner { position: absolute; width: 10px; height: 10px; }
.ij-preview-corner-tl { top: -1px; left: -1px; border-top: 2px solid #0369A1; border-left: 2px solid #0369A1; }
.ij-preview-corner-br { bottom: -1px; right: -1px; border-bottom: 2px solid #0369A1; border-right: 2px solid #0369A1; }

.ij-preview-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.ij-preview-head-title { font: 600 13px var(--font-inter); color: #0A1F1C; }
.ij-preview-head-badge { font: 600 11px var(--font-jetbrains-mono), monospace; color: #6B746F; }
.ij-badge-ok { color: #16A34A; }
.ij-badge-accent { color: #0369A1; }

.ij-preview-rows { display: flex; flex-direction: column; }
.ij-preview-row { padding: 9px 0; border-top: 1px solid #F0F0EA; display: grid; align-items: center; gap: 8px; }
.ij-preview-row:first-child { border-top: none; }
.ij-preview-row-procesos { grid-template-columns: 1fr 92px 62px 12px; }
.ij-preview-cell-entidad { font: 12.5px var(--font-inter); color: #0A1F1C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ij-preview-cell-cuantia { font: 12px var(--font-jetbrains-mono), monospace; color: #0369A1; font-variant-numeric: tabular-nums; text-align: right; }
.ij-preview-cell-fecha { font: 11px var(--font-jetbrains-mono), monospace; color: #6B746F; text-align: right; }
.ij-preview-status-dot { width: 7px; height: 7px; border-radius: 50%; justify-self: center; }
.ij-status-ok { background: #16A34A; }
.ij-status-warn { background: #D97706; }

.ij-preview-foot { padding-top: 12px; border-top: 1px dashed #DADAD2; font: 12px var(--font-inter); color: #525B5A; }
.ij-preview-foot-ok { color: #16A34A; font-weight: 600; }
.ij-preview-foot-warn { color: #D97706; }

.ij-preview-row-requisitos { grid-template-columns: 16px 1fr auto; }
.ij-preview-glyph { font: 700 12px var(--font-jetbrains-mono), monospace; text-align: center; }
.ij-glyph-ok { color: #16A34A; }
.ij-glyph-warn { color: #D97706; }
.ij-glyph-unknown { color: #6B746F; }
.ij-preview-cell-text { font: 12.5px var(--font-inter); color: #0A1F1C; }
.ij-preview-cell-page { font: 11px var(--font-jetbrains-mono), monospace; color: #6B746F; }

.ij-preview-hito { display: flex; flex-direction: column; gap: 6px; padding: 8px 0; }
.ij-preview-hito-top { display: flex; justify-content: space-between; gap: 8px; }
.ij-preview-hito-label { font: 12.5px var(--font-inter); color: #0A1F1C; }
.ij-preview-hito-status { font: 11px var(--font-jetbrains-mono), monospace; color: #6B746F; }
.ij-preview-bar-track { height: 5px; background: #F0F0EA; }
.ij-preview-bar-fill { height: 100%; background: #0369A1; }

.ij-preview-question { font: italic 13px/1.5 var(--font-inter); color: #525B5A; margin: 0; }
.ij-preview-answer { font: 12.5px/1.6 var(--font-inter); color: #0A1F1C; padding-top: 12px; border-top: 1px solid #F0F0EA; margin: 0; }
.ij-preview-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.ij-preview-chip { font: 10px var(--font-jetbrains-mono), monospace; color: #0369A1; border: 1px solid rgba(3,105,161,.25); padding: 4px 8px; }

.ij-preview-step { display: grid; grid-template-columns: 26px 1fr; gap: 10px; padding: 8px 0; }
.ij-preview-step-n { font: 600 11px var(--font-jetbrains-mono), monospace; color: #0369A1; }
.ij-preview-step-title { font: 600 13px var(--font-inter); color: #0A1F1C; }
.ij-preview-step-desc { font: 12.5px/1.5 var(--font-inter); color: #525B5A; margin: 4px 0 0; }

.ij-soon-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 34px;
  padding-top: 20px;
  border-top: 1px dashed #DADAD2;
}
.ij-soon-label { font: 10px var(--font-jetbrains-mono), monospace; color: #6B746F; letter-spacing: .1em; text-transform: uppercase; }
.ij-soon-title { font: 500 14px var(--font-inter); color: #0A1F1C; }
.ij-soon-desc { font: 13px var(--font-inter); color: #525B5A; }
.ij-soon-btn, .ij-soon-done { margin-left: auto; white-space: nowrap; }
.ij-soon-btn {
  background: transparent;
  border: 1px solid #0369A1;
  padding: 6px 12px;
  font: 600 12px var(--font-jetbrains-mono), monospace;
  color: #0369A1;
  cursor: pointer;
  transition: background .16s ease, color .16s ease;
}
.ij-soon-btn:hover { background: #0369A1; color: #fff; }
.ij-soon-btn:disabled { cursor: not-allowed; opacity: .6; }
.ij-soon-done { font: 600 12px var(--font-jetbrains-mono), monospace; color: #16A34A; }
.ij-soon-error { width: 100%; font: 11px var(--font-inter); color: #DC2626; }

@media (max-width: 640px) {
  .ij-panel { gap: 24px; }
  .ij-soon-btn, .ij-soon-done { margin-left: 0; }
}
`;

function PreviewCorners() {
  return (
    <>
      <span className="ij-preview-corner ij-preview-corner-tl" aria-hidden="true" />
      <span className="ij-preview-corner ij-preview-corner-br" aria-hidden="true" />
    </>
  );
}

function PreviewBox({ active }) {
  if (active === 1) {
    return (
      <div className="ij-preview">
        <PreviewCorners />
        <div className="ij-preview-head">
          <span className="ij-preview-head-title">Procesos activos · SECOP II</span>
          <span className="ij-preview-head-badge ij-badge-ok">3 de 38</span>
        </div>
        <div className="ij-preview-rows">
          {PROCESOS_PREVIEW_ROWS.map((row) => (
            <div key={row.entidad} className="ij-preview-row ij-preview-row-procesos">
              <span className="ij-preview-cell-entidad">{row.entidad}</span>
              <span className="ij-preview-cell-cuantia">{row.cuantia}</span>
              <span className="ij-preview-cell-fecha">{row.cierre}</span>
              <span
                className={`ij-preview-status-dot ij-status-${row.estado}`}
                aria-hidden="true"
              />
            </div>
          ))}
        </div>
        <div className="ij-preview-foot">
          <span className="ij-preview-foot-ok">✓ CALIFICAS EN 2 DE 3</span> · según tu RUP
        </div>
      </div>
    );
  }

  if (active === 2) {
    return (
      <div className="ij-preview">
        <PreviewCorners />
        <div className="ij-preview-head">
          <span className="ij-preview-head-title">Requisitos extraídos</span>
          <span className="ij-preview-head-badge">104 pág · 38 s</span>
        </div>
        <div className="ij-preview-rows">
          {REQUISITOS_PREVIEW_ROWS.map((row) => (
            <div key={row.text} className="ij-preview-row ij-preview-row-requisitos">
              <span className={`ij-preview-glyph ij-glyph-${row.status}`} aria-hidden="true">
                {row.status === "ok" ? "✓" : row.status === "warn" ? "!" : "?"}
              </span>
              <span className="ij-preview-cell-text">{row.text}</span>
              <span className="ij-preview-cell-page">{row.page}</span>
            </div>
          ))}
        </div>
        <div className="ij-preview-foot">Cada requisito citado con su página y numeral.</div>
      </div>
    );
  }

  if (active === 3) {
    return (
      <div className="ij-preview">
        <PreviewCorners />
        <div className="ij-preview-head">
          <span className="ij-preview-head-title">Ejecución · contrato 2026-0418</span>
          <span className="ij-preview-head-badge ij-badge-accent">62 %</span>
        </div>
        <div className="ij-preview-rows">
          {EJECUCION_PREVIEW_ROWS.map((row) => (
            <div key={row.label} className="ij-preview-hito">
              <div className="ij-preview-hito-top">
                <span className="ij-preview-hito-label">{row.label}</span>
                <span className="ij-preview-hito-status">{row.status}</span>
              </div>
              <div className="ij-preview-bar-track">
                <div className="ij-preview-bar-fill" style={{ width: `${row.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="ij-preview-foot ij-preview-foot-warn">▸ Próximo vencimiento: 12 sep</div>
      </div>
    );
  }

  if (active === 4) {
    return (
      <div className="ij-preview">
        <PreviewCorners />
        <div className="ij-preview-head">
          <span className="ij-preview-head-title">Consulta de normativa</span>
        </div>
        <p className="ij-preview-question">{NORMATIVA_PREVIEW.question}</p>
        <p className="ij-preview-answer">{NORMATIVA_PREVIEW.answer}</p>
        <div className="ij-preview-chips">
          {NORMATIVA_PREVIEW.citations.map((c) => (
            <span key={c} className="ij-preview-chip">
              {c}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="ij-preview">
      <PreviewCorners />
      <div className="ij-preview-head">
        <span className="ij-preview-head-title">Ruta sugerida</span>
      </div>
      <div className="ij-preview-rows">
        {RUTA_PREVIEW_STEPS.map((step) => (
          <div key={step.n} className="ij-preview-step">
            <span className="ij-preview-step-n">{step.n}</span>
            <div>
              <div className="ij-preview-step-title">{step.title}</div>
              <p className="ij-preview-step-desc">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="ij-preview-foot">Sin cuenta · resultado en 2 min</div>
    </div>
  );
}

export default function IntentJourney({ waitlistStatus, waitlistError, onWaitlist }) {
  const [active, setActive] = useState(1);
  const panel = PANELS[active];

  return (
    <div className="ij-wrap">
      <style dangerouslySetInnerHTML={{ __html: INTENT_JOURNEY_CSS }} />

      <div className="ij-line">
        {NODES.map((node) => {
          const isActive = active === node.id;
          return (
            <button
              key={node.id}
              type="button"
              className="ij-node"
              onClick={() => setActive(node.id)}
              aria-pressed={isActive}
            >
              <span className="ij-node-circle">
                {isActive && (
                  <>
                    <span className="ij-node-ping" aria-hidden="true" />
                    <span className="ij-node-dot" aria-hidden="true" />
                  </>
                )}
              </span>
              <span className="ij-node-label">[ {node.n} ]</span>
              <span className="ij-node-title">{node.title}</span>
              <span className="ij-node-phase">{node.phase}</span>
              {isActive && <span className="ij-node-bar" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      <div className="ij-alt-row">
        <span className="ij-alt-label">Entrada alterna</span>
        <span className="ij-alt-dash" aria-hidden="true" />
        <button
          type="button"
          className="ij-alt-btn"
          onClick={() => setActive(ALT_ENTRY_ID)}
          aria-pressed={active === ALT_ENTRY_ID}
        >
          <span className="ij-alt-circle" aria-hidden="true" />
          {ALT_ENTRY_TITLE}
        </button>
      </div>

      <div className="ij-panel">
        <div>
          <h3 className="ij-panel-title">{panel.title}</h3>
          <p className="ij-panel-body">{panel.body}</p>
          <Link href={panel.href} className="bp-cta bp-cta-dark ij-panel-cta">
            [ {panel.cta} → ]
          </Link>
        </div>
        <PreviewBox active={active} />
      </div>

      <div className="ij-soon-row">
        <span className="ij-soon-label">Próximamente</span>
        <span className="ij-soon-title">Vendo o fabrico soluciones</span>
        <span className="ij-soon-desc">
          — oportunidades reales de comunidades y ESP que necesitan lo que ofreces.
        </span>
        {waitlistStatus === "done" ? (
          <span className="ij-soon-done">[ Te avisaremos ]</span>
        ) : (
          <button
            type="button"
            className="ij-soon-btn"
            onClick={onWaitlist}
            disabled={waitlistStatus === "loading"}
          >
            {waitlistStatus === "loading" ? "[ Guardando… ]" : "[ Avísame cuando abra ]"}
          </button>
        )}
        {waitlistStatus === "error" && waitlistError && (
          <span className="ij-soon-error">{waitlistError}</span>
        )}
      </div>
    </div>
  );
}
