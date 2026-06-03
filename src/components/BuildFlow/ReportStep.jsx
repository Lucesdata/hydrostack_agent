"use client";

import { useEffect, useState } from "react";
import {
  getFormState,
  saveLastReport,
  getLastReport,
} from "@/src/lib/state/clientStore";

const GEO_LS_KEY = "hs_geo_data";

export default function ReportStep({ progress, lang = "es", onReportGenerated }) {
  const isEs = lang === "es";

  const [nombre, setNombre] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [propietario, setPropietario] = useState("");
  const [redactor, setRedactor] = useState("");
  const [matricula, setMatricula] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Pre-fill ubicacion from geo data, surface any existing report
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(GEO_LS_KEY);
      if (raw) {
        const geo = JSON.parse(raw);
        if (geo?.address && !ubicacion) setUbicacion(geo.address);
      }
    } catch {}
    const last = getLastReport();
    if (last) setResult({ download_url: last.url, report_id: last.reportId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit =
    progress.septic && nombre.trim().length > 0 && ubicacion.trim().length > 0;

  async function handleGenerate() {
    setError(null);
    setLoading(true);
    try {
      const formState = getFormState();
      const res = await fetch("/api/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proyecto: { nombre, ubicacion, propietario, redactor, matricula },
          formState,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const missing = Array.isArray(data?.missing_fields)
          ? ` (${data.missing_fields.join(", ")})`
          : "";
        setError(`${data?.error || "Error inesperado"}${missing}`);
        return;
      }
      setResult(data);
      if (data.download_url && data.report_id) {
        saveLastReport(data.download_url, data.report_id);
        onReportGenerated?.(data);
      }
    } catch (e) {
      setError(e?.message || "Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={S.wrap}>
      <div style={S.intro}>
        <div style={S.tag}>{isEs ? "paso 4 de 4" : "step 4 of 4"}</div>
        <h2 style={S.h2}>
          {isEs ? "Genera tu informe técnico" : "Generate your technical report"}
        </h2>
        <p style={S.lead}>
          {isEs
            ? "Combinamos los datos de los pasos anteriores en una memoria técnica PDF (A4) con cálculos, validación normativa y referencias."
            : "We combine the previous steps into an A4 technical memo with calculations, normative validation and references."}
        </p>
      </div>

      <SummaryGrid progress={progress} isEs={isEs} />

      {!progress.septic && (
        <div style={S.warnBox}>
          {isEs
            ? "Aún falta completar el paso 2 (Fosa Séptica). Vuelve a ese paso y haz clic en \"Calcular\" para guardar los datos."
            : "Step 2 (Septic Tank) is still missing. Go back and click \"Calculate\" to save the data."}
        </div>
      )}

      <div style={S.formCard}>
        <div style={S.formTitle}>
          {isEs ? "Datos del proyecto" : "Project details"}
        </div>
        <div style={S.formGrid}>
          <Field
            label={isEs ? "Nombre del proyecto *" : "Project name *"}
            value={nombre}
            onChange={setNombre}
            placeholder={isEs ? "Ej. Vivienda Rural Cota" : "e.g. Cota Rural Home"}
          />
          <Field
            label={isEs ? "Ubicación *" : "Location *"}
            value={ubicacion}
            onChange={setUbicacion}
            placeholder={isEs ? "Ej. Bogotá, Cundinamarca" : "e.g. Bogotá, Cundinamarca"}
          />
          <Field
            label={isEs ? "Propietario" : "Owner"}
            value={propietario}
            onChange={setPropietario}
            placeholder={isEs ? "Opcional" : "Optional"}
          />
          <Field
            label={isEs ? "Redactor / profesional" : "Responsible professional"}
            value={redactor}
            onChange={setRedactor}
            placeholder={isEs ? "Opcional" : "Optional"}
          />
          <Field
            label={isEs ? "Matrícula profesional" : "License number"}
            value={matricula}
            onChange={setMatricula}
            placeholder={isEs ? "Opcional — ej. MP 123456" : "Optional"}
          />
        </div>

        <button
          type="button"
          disabled={!canSubmit || loading}
          onClick={handleGenerate}
          style={S.cta(canSubmit && !loading)}
        >
          {loading
            ? isEs ? "Generando..." : "Generating..."
            : isEs ? "Generar informe PDF →" : "Generate PDF report →"}
        </button>

        {error && <div style={S.errorBox}>{error}</div>}

        {result?.download_url && (
          <div style={S.successBox}>
            <div style={S.successHead}>
              ✓ {isEs ? "Informe generado" : "Report generated"}
            </div>
            <a
              href={result.download_url}
              target="_blank"
              rel="noopener noreferrer"
              style={S.downloadBtn}
            >
              ⬇ {isEs ? "Descargar PDF" : "Download PDF"}
            </a>
            {result.report_id && (
              <div style={S.meta}>
                ID: {String(result.report_id).slice(0, 8)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryGrid({ progress, isEs }) {
  const items = [
    {
      key: "geo",
      icon: "📍",
      label: isEs ? "Ubicación" : "Location",
      done: progress.geo,
    },
    {
      key: "septic",
      icon: "🪣",
      label: isEs ? "Fosa Séptica" : "Septic Tank",
      done: progress.septic,
      required: true,
    },
    {
      key: "maintenance",
      icon: "🔧",
      label: isEs ? "Mantenimiento" : "Maintenance",
      done: progress.maintenance,
    },
  ];
  return (
    <div style={S.summaryGrid}>
      {items.map((it) => (
        <div key={it.key} style={S.summaryCard(it.done, it.required)}>
          <div style={S.summaryIcon}>{it.icon}</div>
          <div style={S.summaryLabel}>{it.label}</div>
          <div style={S.summaryStatus(it.done)}>
            {it.done
              ? "✓ " + (isEs ? "Listo" : "Done")
              : it.required
              ? isEs ? "Requerido" : "Required"
              : isEs ? "Opcional" : "Optional"}
          </div>
        </div>
      ))}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label style={S.fieldWrap}>
      <span style={S.fieldLabel}>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={S.fieldInput}
      />
    </label>
  );
}

const S = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: "22px",
    maxWidth: "780px",
  },
  intro: {},
  tag: {
    fontSize: "9px",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: "#4a7a8a",
    fontFamily: "'IBM Plex Mono', monospace",
    marginBottom: "8px",
  },
  h2: {
    fontSize: "22px",
    color: "#e8f8ff",
    margin: "0 0 8px 0",
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 700,
  },
  lead: {
    fontSize: "13px",
    color: "#7ab8c8",
    lineHeight: 1.6,
    margin: 0,
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "10px",
  },
  summaryCard: (done, required) => ({
    background: done ? "rgba(0,255,136,0.05)" : "rgba(4,24,32,0.5)",
    border: `1px solid ${done ? "rgba(0,255,136,0.25)" : required ? "rgba(255,176,32,0.2)" : "rgba(0,245,255,0.08)"}`,
    borderRadius: "8px",
    padding: "14px 14px",
  }),
  summaryIcon: { fontSize: "18px", marginBottom: "6px" },
  summaryLabel: {
    fontSize: "11px",
    color: "#e8f8ff",
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: "0.04em",
    marginBottom: "4px",
    fontWeight: 700,
  },
  summaryStatus: (done) => ({
    fontSize: "10px",
    color: done ? "#00FF88" : "#7ab8c8",
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: "0.04em",
  }),
  warnBox: {
    padding: "12px 14px",
    background: "rgba(255,176,32,0.08)",
    border: "1px solid rgba(255,176,32,0.3)",
    borderRadius: "6px",
    color: "#FFB020",
    fontSize: "12px",
    lineHeight: 1.55,
    fontFamily: "'IBM Plex Mono', monospace",
  },
  formCard: {
    background: "rgba(4,24,32,0.55)",
    border: "1px solid rgba(0,245,255,0.12)",
    borderRadius: "10px",
    padding: "22px 22px",
  },
  formTitle: {
    fontSize: "12px",
    color: "#e8f8ff",
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: "16px",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "14px",
    marginBottom: "20px",
  },
  fieldWrap: { display: "flex", flexDirection: "column", gap: "5px" },
  fieldLabel: {
    fontSize: "10px",
    letterSpacing: "0.08em",
    color: "#7ab8c8",
    fontFamily: "'IBM Plex Mono', monospace",
    textTransform: "uppercase",
  },
  fieldInput: {
    background: "rgba(0,10,14,0.7)",
    border: "1px solid rgba(0,245,255,0.18)",
    borderRadius: "5px",
    padding: "9px 11px",
    fontSize: "13px",
    color: "#e8f8ff",
    fontFamily: "'IBM Plex Mono', monospace",
    outline: "none",
  },
  cta: (enabled) => ({
    background: enabled ? "rgba(0,245,255,0.14)" : "rgba(0,245,255,0.04)",
    border: `1px solid ${enabled ? "rgba(0,245,255,0.4)" : "rgba(0,245,255,0.08)"}`,
    color: enabled ? "#00F5FF" : "#2a5070",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    padding: "12px 22px",
    borderRadius: "6px",
    cursor: enabled ? "pointer" : "not-allowed",
  }),
  errorBox: {
    marginTop: "14px",
    padding: "10px 12px",
    background: "rgba(255,80,80,0.08)",
    border: "1px solid rgba(255,80,80,0.3)",
    borderRadius: "5px",
    color: "#FF7878",
    fontSize: "12px",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  successBox: {
    marginTop: "18px",
    padding: "14px 16px",
    background: "rgba(0,255,136,0.06)",
    border: "1px solid rgba(0,255,136,0.3)",
    borderRadius: "8px",
  },
  successHead: {
    fontSize: "11px",
    color: "#00FF88",
    letterSpacing: "0.1em",
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 700,
    marginBottom: "10px",
  },
  downloadBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 18px",
    background: "rgba(0,255,136,0.12)",
    border: "1px solid rgba(0,255,136,0.4)",
    borderRadius: "5px",
    color: "#00FF88",
    fontSize: "12px",
    fontWeight: 700,
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: "0.04em",
    textDecoration: "none",
  },
  meta: {
    marginTop: "8px",
    fontSize: "10px",
    color: "#4a7a8a",
    fontFamily: "'IBM Plex Mono', monospace",
  },
};
