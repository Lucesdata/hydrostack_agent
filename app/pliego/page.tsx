"use client";

/**
 * /pliego — cableado UI de la extracción de pliegos (Hydro_Agent Capa 3),
 * integrado como pestaña de Licitaciones. Sube el Documento Base (+ opcional
 * Formulario 1 de presupuesto) y llama a POST /api/pliego/extract, que corre
 * el extractor híbrido: reglas primero, Gemini solo para lo que falte — ver
 * src/lib/pliego/extractPliegoHybrid.ts. Sin persistencia en DB, sin auth
 * extra — ver docs/architecture para el resto del mapa.
 */

import { useState } from "react";
import LicitacionesTabs from "@/src/components/secop/LicitacionesTabs";
import { formatCopFull } from "@/src/components/secop/format";
import type { PliegoExtraction } from "@/src/lib/pliego/schema";
import type { ValidationReport } from "@/src/lib/pliego/validate";

type Status = "idle" | "loading" | "error" | "done";
type CampoOrigen = "reglas" | "llm";

interface ExtractResponse {
  extraction: PliegoExtraction;
  validation: ValidationReport;
  origen: Record<"reglas_presupuesto" | "requisitos_habilitantes" | "capitulos", CampoOrigen>;
}

const CONFIANZA_LABEL: Record<string, string> = { alta: "Alta", media: "Media", baja: "Baja" };
const SEVERIDAD_LABEL: Record<string, string> = { alta: "Alta", media: "Media", baja: "Baja" };
const ORIGEN_LABEL: Record<CampoOrigen, string> = { reglas: "Reglas", llm: "LLM" };

export default function PliegoPage() {
  const [file, setFile] = useState<File | null>(null);
  const [formulario1, setFormulario1] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractResponse | null>(null);
  const [procesoId, setProcesoId] = useState("");
  const [linkStatus, setLinkStatus] = useState<"idle" | "linking" | "linked" | "error">("idle");

  async function handleLinkToProcess() {
    if (!result || !procesoId.trim()) return;
    setLinkStatus("linking");
    try {
      const res = await fetch("/api/eligibility/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ procesoId: procesoId.trim(), extraction: result.extraction }),
      });
      setLinkStatus(res.ok ? "linked" : "error");
    } catch {
      setLinkStatus("error");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setStatus("loading");
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (formulario1) formData.append("formulario1", formulario1);
      const res = await fetch("/api/pliego/extract", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || `Error ${res.status}`);
        setStatus("error");
        return;
      }
      setResult(body as ExtractResponse);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }

  return (
    <div className="clr-page">
      <div className="clr-container clr-pl-container">
        <LicitacionesTabs />
        <header className="clr-pl-header">
          <span className="clr-tag">Hydro_Agent · Capa 3</span>
          <h1 className="clr-h1">Extracción de pliegos</h1>
          <p className="clr-sub">
            Sube el Documento Base de un proceso SECOP II — y, si lo tienes, el Formulario 1 de
            presupuesto (Excel) — y el extractor híbrido saca presupuesto, causales de rechazo,
            requisitos habilitantes y lagunas del documento. Lo que puede resolverse con reglas
            deterministas (sin modelo) se resuelve así; el resto cae a Gemini.
          </p>
        </header>

        <form className="clr-pl-upload" onSubmit={handleSubmit}>
          <label className="clr-pl-file" htmlFor="pliego-file">
            <input
              id="pliego-file"
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={status === "loading"}
            />
            <span>{file ? file.name : "Elegir Documento Base (PDF)…"}</span>
          </label>
          <label className="clr-pl-file" htmlFor="formulario1-file">
            <input
              id="formulario1-file"
              type="file"
              accept=".xls,.xlsx"
              onChange={(e) => setFormulario1(e.target.files?.[0] ?? null)}
              disabled={status === "loading"}
            />
            <span>{formulario1 ? formulario1.name : "Formulario 1 (Excel, opcional)…"}</span>
          </label>
          <button type="submit" className="clr-pl-btn" disabled={!file || status === "loading"}>
            {status === "loading" ? "Analizando…" : "Analizar pliego"}
          </button>
        </form>

        {status === "loading" && (
          <p className="clr-pl-note">Puede tardar 10–40 segundos. No cierres esta pestaña.</p>
        )}

        {status === "error" && error && <div className="clr-pl-error">{error}</div>}

        {status === "done" && result && <PliegoResult data={result} />}

        {result && (
          <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
            <label htmlFor="pliego-proceso-id" style={{ fontSize: 12 }}>
              ID del proceso SECOP
            </label>
            <input
              id="pliego-proceso-id"
              placeholder="ID del proceso SECOP (ej. CO1.REQ.123456)"
              value={procesoId}
              onChange={(e) => {
                setProcesoId(e.target.value);
                if (linkStatus === "linked" || linkStatus === "error") setLinkStatus("idle");
              }}
            />
            <button type="button" onClick={handleLinkToProcess} disabled={!procesoId.trim() || linkStatus === "linking"}>
              {linkStatus === "linking" ? "Vinculando…" : "Vincular a este proceso"}
            </button>
            {linkStatus === "linked" && <span>Vinculado ✓ — ya se puede verificar habilitación en /licitaciones</span>}
            {linkStatus === "error" && <span>No se pudo vincular — intenta de nuevo.</span>}
          </div>
        )}
      </div>

      <style jsx>{`
        .clr-pl-container {
          max-width: 780px;
        }
        .clr-pl-header {
          margin-bottom: 28px;
        }
        .clr-pl-upload {
          display: flex;
          gap: 12px;
          align-items: center;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--radius-lg);
          padding: 16px;
          flex-wrap: wrap;
        }
        .clr-pl-file {
          flex: 1 1 260px;
          display: flex;
          align-items: center;
          border: 1px dashed var(--line);
          border-radius: 10px;
          padding: 10px 14px;
          font-family: var(--font-mono);
          font-size: 12.5px;
          color: var(--ink-600);
          cursor: pointer;
          background: var(--surface-alt);
          transition: border-color 0.15s;
        }
        .clr-pl-file:hover {
          border-color: var(--accent);
        }
        .clr-pl-file input {
          display: none;
        }
        .clr-pl-btn {
          font-family: var(--font-sans);
          font-weight: 600;
          font-size: 13.5px;
          padding: 11px 20px;
          border-radius: 10px;
          border: none;
          background: var(--accent);
          color: #fff;
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .clr-pl-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .clr-pl-note {
          margin-top: 12px;
          font-size: 12.5px;
          color: var(--ink-300);
          font-family: var(--font-mono);
        }
        .clr-pl-error {
          margin-top: 16px;
          padding: 14px 16px;
          border-radius: 10px;
          background: rgba(220, 38, 38, 0.08);
          border: 1px solid var(--danger, #dc2626);
          color: var(--danger, #dc2626);
          font-size: 13px;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}

function OrigenBadge({ origen }: { origen: CampoOrigen }) {
  return <span className={`clr-pl-origen clr-pl-origen-${origen}`}>{ORIGEN_LABEL[origen]}</span>;
}

function PliegoResult({ data }: { data: ExtractResponse }) {
  const { extraction: x, validation: v, origen } = data;
  const confianzaColor =
    x.verificacion.confianza_general === "alta"
      ? "#16A34A"
      : x.verificacion.confianza_general === "media"
        ? "#D97706"
        : "#DC2626";

  return (
    <div className="clr-pl-result">
      <section className="clr-pl-section">
        <h2 className="clr-pl-h2">Resumen</h2>
        <dl className="clr-pl-dl">
          <div>
            <dt>Proceso</dt>
            <dd>{x.proceso}</dd>
          </div>
          <div>
            <dt>Entidad</dt>
            <dd>{x.entidad}</dd>
          </div>
          <div>
            <dt>Objeto</dt>
            <dd>{x.objeto_contrato}</dd>
          </div>
          <div>
            <dt>Modalidad</dt>
            <dd>{x.modalidad_contratacion}</dd>
          </div>
          <div>
            <dt>Publicación</dt>
            <dd>{x.fecha_publicacion}</dd>
          </div>
          <div>
            <dt>Cierre</dt>
            <dd>{x.fecha_cierre}</dd>
          </div>
          <div>
            <dt>Presupuesto oficial</dt>
            <dd>
              {formatCopFull(x.presupuesto_oficial_cop)} {x.moneda}
            </dd>
          </div>
        </dl>
      </section>

      <section className="clr-pl-section">
        <h2 className="clr-pl-h2">Verificación del modelo</h2>
        <p>
          Confianza:{" "}
          <span
            className="clr-pl-badge"
            style={{ color: confianzaColor, borderColor: confianzaColor }}
          >
            {CONFIANZA_LABEL[x.verificacion.confianza_general] ?? x.verificacion.confianza_general}
          </span>
        </p>
        <p className="clr-pl-muted">{x.verificacion.justificacion_confianza}</p>
        {x.verificacion.campos_no_encontrados.length > 0 && (
          <p className="clr-pl-muted">
            Campos no encontrados en el documento: {x.verificacion.campos_no_encontrados.join(", ")}
          </p>
        )}
      </section>

      <section className="clr-pl-section">
        <h2 className="clr-pl-h2">
          Validación de consistencia{" "}
          {v.ok ? (
            <span className="clr-pl-ok">✓ consistente</span>
          ) : (
            <span className="clr-pl-warn">✗ {v.inconsistencias.length} inconsistencia(s)</span>
          )}
        </h2>
        {v.inconsistencias.length > 0 && (
          <ul className="clr-pl-list">
            {v.inconsistencias.map((i, idx) => (
              <li key={idx}>
                <b>{i.tipo}</b> — {i.ubicacion}: {i.detalle}
              </li>
            ))}
          </ul>
        )}
        {v.notas.length > 0 && (
          <ul className="clr-pl-list clr-pl-list-muted">
            {v.notas.map((n, idx) => (
              <li key={idx}>{n}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="clr-pl-section">
        <h2 className="clr-pl-h2">
          Causales de rechazo ({x.reglas_presupuesto.length}){" "}
          <OrigenBadge origen={origen.reglas_presupuesto} />
        </h2>
        <ul className="clr-pl-list">
          {x.reglas_presupuesto.map((r, idx) => (
            <li key={idx}>{r}</li>
          ))}
        </ul>
      </section>

      <section className="clr-pl-section">
        <h2 className="clr-pl-h2">
          Requisitos habilitantes <OrigenBadge origen={origen.requisitos_habilitantes} />
        </h2>
        <dl className="clr-pl-dl">
          <div>
            <dt>Experiencia específica</dt>
            <dd>{x.requisitos_habilitantes.experiencia_especifica}</dd>
          </div>
          <div>
            <dt>Capacidad financiera</dt>
            <dd>{x.requisitos_habilitantes.capacidad_financiera}</dd>
          </div>
          <div>
            <dt>Capacidad organizacional</dt>
            <dd>{x.requisitos_habilitantes.capacidad_organizacional}</dd>
          </div>
        </dl>
      </section>

      {x.cronograma.length > 0 && (
        <section className="clr-pl-section">
          <h2 className="clr-pl-h2">Cronograma</h2>
          <ul className="clr-pl-list">
            {x.cronograma.map((h, idx) => (
              <li key={idx}>
                <b>{h.hito}</b> — {h.fecha}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="clr-pl-section">
        <h2 className="clr-pl-h2">
          Presupuesto por capítulo ({x.capitulos.reduce((n, c) => n + c.items.length, 0)} ítems){" "}
          <OrigenBadge origen={origen.capitulos} />
        </h2>
        {x.capitulos.map((cap, ci) => (
          <div key={ci} className="clr-pl-cap">
            <h3>{cap.nombre}</h3>
            <div className="clr-pl-table-wrap">
              <table className="clr-pl-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Descripción</th>
                    <th>Cant.</th>
                    <th>V. unitario</th>
                    <th>V. total</th>
                  </tr>
                </thead>
                <tbody>
                  {cap.items.map((it, ii) => (
                    <tr key={ii}>
                      <td>{it.codigo}</td>
                      <td>{it.descripcion}</td>
                      <td>{it.cantidad}</td>
                      <td>{formatCopFull(it.valor_unitario)}</td>
                      <td>{formatCopFull(it.valor_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>

      {x.lagunas_pendientes.length > 0 && (
        <section className="clr-pl-section">
          <h2 className="clr-pl-h2">Lagunas pendientes del pliego</h2>
          <ul className="clr-pl-list">
            {x.lagunas_pendientes.map((l) => (
              <li key={l.id}>
                <span className="clr-pl-sev" data-sev={l.severidad}>
                  {SEVERIDAD_LABEL[l.severidad] ?? l.severidad}
                </span>{" "}
                <b>{l.tipo}</b> — {l.descripcion}
              </li>
            ))}
          </ul>
        </section>
      )}

      <style jsx>{`
        .clr-pl-result {
          margin-top: 28px;
        }
        .clr-pl-section {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--radius-lg, 14px);
          padding: 20px 22px;
          margin-bottom: 16px;
        }
        .clr-pl-h2 {
          font-family: var(--font-sans);
          font-size: 15px;
          font-weight: 700;
          color: var(--ink-900);
          margin: 0 0 12px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .clr-pl-origen {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 2px 7px;
          border-radius: 999px;
          border: 1px solid;
        }
        .clr-pl-origen-reglas {
          color: #16a34a;
          border-color: #16a34a;
          background: rgba(22, 163, 74, 0.08);
        }
        .clr-pl-origen-llm {
          color: var(--ink-300);
          border-color: var(--line);
          background: var(--surface-alt);
        }
        .clr-pl-dl {
          display: grid;
          gap: 8px;
        }
        .clr-pl-dl > div {
          display: flex;
          gap: 10px;
          font-size: 13px;
          line-height: 1.5;
        }
        .clr-pl-dl dt {
          flex: 0 0 170px;
          color: var(--ink-300);
          font-family: var(--font-mono);
          font-size: 11.5px;
        }
        .clr-pl-dl dd {
          margin: 0;
          color: var(--ink-900);
        }
        .clr-pl-muted {
          color: var(--ink-600);
          font-size: 12.5px;
          line-height: 1.5;
          margin: 6px 0 0;
        }
        .clr-pl-badge {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border: 1px solid;
          border-radius: 999px;
        }
        .clr-pl-ok {
          color: #16a34a;
          font-size: 12px;
          font-weight: 600;
        }
        .clr-pl-warn {
          color: #dc2626;
          font-size: 12px;
          font-weight: 600;
        }
        .clr-pl-list {
          margin: 0;
          padding-left: 18px;
          font-size: 12.5px;
          color: var(--ink-600);
          line-height: 1.7;
        }
        .clr-pl-list-muted {
          color: var(--ink-300);
        }
        .clr-pl-cap {
          margin-bottom: 18px;
        }
        .clr-pl-cap:last-child {
          margin-bottom: 0;
        }
        .clr-pl-cap h3 {
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-900);
          margin: 0 0 8px;
        }
        .clr-pl-table-wrap {
          overflow-x: auto;
        }
        .clr-pl-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .clr-pl-table th {
          text-align: left;
          font-family: var(--font-mono);
          font-size: 10.5px;
          color: var(--ink-300);
          padding: 6px 8px;
          border-bottom: 1px solid var(--line);
          white-space: nowrap;
        }
        .clr-pl-table td {
          padding: 6px 8px;
          border-bottom: 1px solid var(--line-soft);
          color: var(--ink-600);
          vertical-align: top;
        }
        .clr-pl-sev {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 1px 6px;
          border-radius: 4px;
        }
        .clr-pl-sev[data-sev="alta"] {
          background: rgba(220, 38, 38, 0.1);
          color: #dc2626;
        }
        .clr-pl-sev[data-sev="media"] {
          background: rgba(217, 119, 6, 0.1);
          color: #d97706;
        }
        .clr-pl-sev[data-sev="baja"] {
          background: rgba(22, 163, 74, 0.1);
          color: #16a34a;
        }
      `}</style>
    </div>
  );
}
