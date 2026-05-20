"use client";
import Link from "next/link";
import { useLang } from "@/lib/i18n";

/**
 * Renders the inline result of a tool call inside the chat.
 * Supports the modular tool suite: calculate_septic_tank,
 * calculate_drainage_field, validate_against_cte, generate_pdf_report.
 */

const L = {
  es: {
    inputs: "Datos", results: "Resultados", checks: "Verificaciones",
    errorTitle: "Error", openCalc: "Abrir calculadora",
    septicTitle: "Fosa Séptica", septicSub: "Dimensionado · CTE DB-HS 5",
    qd: "Caudal diario", vutil: "Volumen útil", vtotal: "Volumen total",
    trh: "Retención", chambers: "Compartimentos", dims: "Dim. L×An×Al",
    altoTotal: "Altura total", warnings: "Avisos CTE",
    drainTitle: "Campo de Drenaje", drainSub: "Infiltración · CTE DB-HS 5 Anejo G",
    tipoSistema: "Tipo de sistema", perm: "Permeabilidad (K)", carga: "Carga hidráulica",
    superficie: "Superficie infiltración", profundidad: "Profundidad",
    longZanjas: "Longitud de zanjas", numZanjas: "Nº de zanjas",
    sepZanjas: "Separación", anchoZanja: "Ancho de zanja",
    validTitle: "Validación Normativa", validSub: "CTE DB-HS 5 · RD 1620/2007",
    cumple: "CUMPLE NORMATIVA", noCumple: "NO CUMPLE", blockers: "Bloqueantes",
    advert: "Advertencias", allOk: "Sin bloqueantes ni advertencias.",
    pdfTitle: "Memoria Técnica", pdfSub: "Informe PDF generado",
    download: "Descargar PDF", reportId: "ID del informe",
  },
  en: {
    inputs: "Data", results: "Results", checks: "Checks",
    errorTitle: "Error", openCalc: "Open calculator",
    septicTitle: "Septic Tank", septicSub: "Sizing · CTE DB-HS 5",
    qd: "Daily flow", vutil: "Useful volume", vtotal: "Total volume",
    trh: "Retention", chambers: "Chambers", dims: "Dim. L×W×H",
    altoTotal: "Total height", warnings: "CTE notices",
    drainTitle: "Drainage Field", drainSub: "Infiltration · CTE DB-HS 5 Annex G",
    tipoSistema: "System type", perm: "Permeability (K)", carga: "Hydraulic load",
    superficie: "Infiltration area", profundidad: "Depth",
    longZanjas: "Trench length", numZanjas: "Trench count",
    sepZanjas: "Spacing", anchoZanja: "Trench width",
    validTitle: "Regulatory Validation", validSub: "CTE DB-HS 5 · RD 1620/2007",
    cumple: "MEETS CODE", noCumple: "DOES NOT MEET CODE", blockers: "Blocking issues",
    advert: "Warnings", allOk: "No blocking issues or warnings.",
    pdfTitle: "Technical Report", pdfSub: "PDF report generated",
    download: "Download PDF", reportId: "Report ID",
  },
};

export default function ToolResultCard({ tool, args, result }) {
  const { lang } = useLang();
  const tx = L[lang === "en" ? "en" : "es"];

  if (tool === "calculate_septic_tank") return <SepticCard result={result} tx={tx} />;
  if (tool === "calculate_drainage_field") return <DrainageCard result={result} tx={tx} />;
  if (tool === "validate_against_cte") return <ValidationCard result={result} tx={tx} />;
  if (tool === "generate_pdf_report") return <PdfCard result={result} tx={tx} />;
  return null;
}

function ToolError({ toolName, message, tx }) {
  return (
    <div style={S.card}>
      <div style={S.header}>
        <span style={S.tag}>tool · {toolName}</span>
        <span style={S.errorTag}>{tx.errorTitle}</span>
      </div>
      <div style={S.errorBody}>{message || "—"}</div>
    </div>
  );
}

function CardShell({ toolName, pill, pillStyle, title, subtitle, children }) {
  return (
    <div style={S.card} role="region" aria-label={title}>
      <div style={S.header}>
        <div style={S.headerLeft}>
          <span style={S.toolDot} className="blink" aria-hidden="true" />
          <span style={S.tag}>tool · {toolName}</span>
        </div>
        {pill && <span style={pillStyle || S.normPill}>{pill}</span>}
      </div>
      <h3 style={S.title}>{title}</h3>
      <div style={S.subtitle}>{subtitle}</div>
      {children}
    </div>
  );
}

function SepticCard({ result, tx }) {
  if (!result || result.error) {
    return <ToolError toolName="calculate_septic_tank" message={result?.error} tx={tx} />;
  }
  const d = result.dimensiones || {};
  const v = result.validacion_cte || {};
  const avisos = Array.isArray(v.avisos) ? v.avisos : [];

  return (
    <CardShell
      toolName="calculate_septic_tank"
      pill="🇪🇸 CTE DB-HS 5"
      title={tx.septicTitle}
      subtitle={tx.septicSub}
    >
      <div style={S.sectionLabel}>{tx.results}</div>
      <div style={S.kvGrid}>
        <KV k={tx.qd} v={`${fmt(result.caudal_diario_litros)} L/d`} highlight />
        <KV k={tx.vutil} v={`${fmt(result.volumen_util_litros)} L`} />
        <KV
          k={tx.vtotal}
          v={`${fmt(result.volumen_total_litros)} L`}
          sub={result.volumen_total_litros ? `${(result.volumen_total_litros / 1000).toFixed(2)} m³` : undefined}
          highlight
        />
        <KV k={tx.trh} v={`${result.tiempo_retencion_dias} d`} />
        <KV k={tx.chambers} v={`${result.num_compartimentos}`} />
        <KV k={tx.dims} v={`${d.largo_m}×${d.ancho_m}×${d.alto_util_m} m`} />
        <KV k={tx.altoTotal} v={`${d.alto_total_m} m`} />
      </div>

      <div style={S.sectionLabel}>{tx.checks}</div>
      <div style={S.checksRow}>
        <Check ok={v.cumple_minimo_he} label="h-e" />
        <Check ok={v.cumple_retencion} label="TRH" />
        <Check ok={v.cumple_profundidad} label={tx.profundidad} />
      </div>

      {avisos.length > 0 && (
        <>
          <div style={S.sectionLabel}>{tx.warnings}</div>
          <ul style={S.recList}>
            {avisos.map((r, i) => (
              <li key={i} style={S.recItem}>
                <span style={S.recDot} aria-hidden="true">▸</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div style={S.footer}>
        <Link href="/calculators/fosa-septica" style={S.openLink} className="btn-ghost">
          {tx.openCalc}
        </Link>
      </div>
    </CardShell>
  );
}

function DrainageCard({ result, tx }) {
  if (!result || result.error) {
    return <ToolError toolName="calculate_drainage_field" message={result?.error} tx={tx} />;
  }
  const d = result.dimensiones || {};
  const val = result.validacion || {};
  const blockers = Array.isArray(val.bloqueantes) ? val.bloqueantes : [];
  const notices = Array.isArray(val.avisos) ? val.avisos : [];
  const suitable = val.ok !== false;

  return (
    <CardShell
      toolName="calculate_drainage_field"
      pill={suitable ? "✓ OK" : "✗"}
      pillStyle={suitable ? S.suitablePill : S.notSuitablePill}
      title={tx.drainTitle}
      subtitle={tx.drainSub}
    >
      <div style={S.sectionLabel}>{tx.results}</div>
      <div style={S.kvGrid}>
        <KV k={tx.tipoSistema} v={String(result.tipo_sistema || "—").replace(/_/g, " ")} />
        <KV k={tx.perm} v={`${result.permeabilidad_suelo_m_dia} m/d`} />
        <KV k={tx.carga} v={`${result.carga_hidraulica_m_dia} m/d`} />
        <KV k={tx.superficie} v={`${d.superficie_infiltracion_m2} m²`} highlight />
        <KV k={tx.profundidad} v={`${d.profundidad_m} m`} />
        {d.longitud_total_zanjas_m != null && (
          <>
            <KV k={tx.longZanjas} v={`${d.longitud_total_zanjas_m} m`} highlight />
            <KV k={tx.numZanjas} v={`${d.num_zanjas}`} />
            <KV k={tx.sepZanjas} v={`${d.separacion_zanjas_m} m`} />
            <KV k={tx.anchoZanja} v={`${d.ancho_zanja_m} m`} />
          </>
        )}
      </div>

      {(blockers.length > 0 || notices.length > 0) && (
        <>
          <div style={S.sectionLabel}>{blockers.length > 0 ? tx.blockers : tx.advert}</div>
          <ul style={S.recList}>
            {[...blockers, ...notices].map((r, i) => (
              <li key={i} style={S.recItem}>
                <span style={S.recDot} aria-hidden="true">▸</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </CardShell>
  );
}

function ValidationCard({ result, tx }) {
  if (!result || result.error) {
    return <ToolError toolName="validate_against_cte" message={result?.error} tx={tx} />;
  }
  const cumple = result.cumple === true;
  const blockers = Array.isArray(result.bloqueantes) ? result.bloqueantes : [];
  const warnings = Array.isArray(result.advertencias) ? result.advertencias : [];

  return (
    <CardShell
      toolName="validate_against_cte"
      pill={cumple ? "✓ " + tx.cumple : "✗ " + tx.noCumple}
      pillStyle={cumple ? S.suitablePill : S.notSuitablePill}
      title={tx.validTitle}
      subtitle={tx.validSub}
    >
      {blockers.length > 0 && (
        <>
          <div style={{ ...S.sectionLabel, color: "#ff6060" }}>{tx.blockers}</div>
          <ul style={S.recList}>
            {blockers.map((b, i) => (
              <li key={i} style={S.recItem}>
                <span style={{ ...S.recDot, color: "#ff6060" }} aria-hidden="true">▸</span>
                <span><strong>[{b.codigo}] {b.articulo}</strong> — {b.descripcion}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {warnings.length > 0 && (
        <>
          <div style={{ ...S.sectionLabel, color: "#FFB020" }}>{tx.advert}</div>
          <ul style={S.recList}>
            {warnings.map((w, i) => (
              <li key={i} style={S.recItem}>
                <span style={{ ...S.recDot, color: "#FFB020" }} aria-hidden="true">▸</span>
                <span><strong>[{w.codigo}] {w.articulo}</strong> — {w.descripcion}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {blockers.length === 0 && warnings.length === 0 && (
        <div style={{ ...S.checkOk, marginTop: "4px" }}>
          <span style={{ fontWeight: 700 }}>✓</span>
          <span>{tx.allOk}</span>
        </div>
      )}
    </CardShell>
  );
}

function PdfCard({ result, tx }) {
  if (!result || result.error) {
    return <ToolError toolName="generate_pdf_report" message={result?.error} tx={tx} />;
  }
  return (
    <CardShell
      toolName="generate_pdf_report"
      title={tx.pdfTitle}
      subtitle={tx.pdfSub}
    >
      <div style={S.kvGrid}>
        <KV k={tx.reportId} v={String(result.report_id || "—").slice(0, 8)} />
      </div>
      {result.download_url && (
        <div style={S.footer}>
          <a href={result.download_url} target="_blank" rel="noopener noreferrer"
             style={S.openLink} className="btn-ghost">
            ⬇ {tx.download}
          </a>
        </div>
      )}
    </CardShell>
  );
}

function fmt(n) {
  if (typeof n !== "number") return n ?? "—";
  return n.toLocaleString("es-ES");
}

function KV({ k, v, sub, highlight }) {
  return (
    <div style={highlight ? S.kvHi : S.kv}>
      <div style={S.kvKey}>{k}</div>
      <div style={highlight ? S.kvValHi : S.kvVal}>{v}</div>
      {sub && <div style={S.kvSub}>{sub}</div>}
    </div>
  );
}

function Check({ ok, label }) {
  return (
    <div style={ok ? S.checkOk : S.checkFail}>
      <span aria-hidden="true" style={{ fontWeight: 700 }}>{ok ? "✓" : "✗"}</span>
      <span>{label}</span>
    </div>
  );
}

const S = {
  card: {
    border: "1px solid rgba(0,245,255,0.22)",
    borderRadius: "8px",
    background: "rgba(2,12,16,0.85)",
    padding: "14px 18px",
    marginBottom: "8px",
    boxShadow: "0 8px 32px rgba(0,245,255,0.04)",
    fontFamily: "'Inter', sans-serif",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: "10px",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: "8px" },
  toolDot: {
    width: "6px", height: "6px", borderRadius: "50%",
    background: "#00F5FF", boxShadow: "0 0 6px #00F5FF",
  },
  tag: {
    fontSize: "9px",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#00F5FF",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  errorTag: {
    fontSize: "10px",
    color: "#ff6060",
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  errorBody: {
    fontSize: "12px",
    color: "#ff9999",
    fontFamily: "'IBM Plex Mono', monospace",
    padding: "8px 0",
  },
  normPill: {
    fontSize: "10px",
    color: "#7ab8c8",
    border: "1px solid rgba(0,245,255,0.18)",
    borderRadius: "999px",
    padding: "2px 10px",
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: "0.06em",
  },
  suitablePill: {
    fontSize: "10px",
    color: "#00FF88",
    background: "rgba(0,255,136,0.08)",
    border: "1px solid rgba(0,255,136,0.30)",
    borderRadius: "999px",
    padding: "2px 10px",
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  notSuitablePill: {
    fontSize: "10px",
    color: "#ff6060",
    background: "rgba(255,80,80,0.08)",
    border: "1px solid rgba(255,80,80,0.30)",
    borderRadius: "999px",
    padding: "2px 10px",
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  recList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  recItem: {
    display: "flex",
    gap: "8px",
    fontSize: "12px",
    color: "#c8e8f0",
    fontFamily: "'Inter', sans-serif",
    lineHeight: 1.6,
    background: "rgba(4,24,32,0.5)",
    border: "1px solid rgba(0,245,255,0.08)",
    borderRadius: "4px",
    padding: "8px 10px",
  },
  recDot: {
    color: "#00F5FF",
    flexShrink: 0,
    fontWeight: 700,
  },
  title: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#E8F8FF",
    margin: 0,
    fontFamily: "'Orbitron', sans-serif",
    letterSpacing: "0.02em",
  },
  subtitle: {
    fontSize: "11px",
    color: "#4A7A8A",
    marginTop: "4px",
    marginBottom: "14px",
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: "0.04em",
  },
  sectionLabel: {
    fontSize: "9px",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#4A7A8A",
    margin: "10px 0 8px",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  kvGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: "8px",
  },
  kv: {
    background: "rgba(4,24,32,0.6)",
    border: "1px solid rgba(0,245,255,0.08)",
    borderRadius: "4px",
    padding: "8px 10px",
  },
  kvHi: {
    background: "rgba(0,245,255,0.06)",
    border: "1px solid rgba(0,245,255,0.25)",
    borderRadius: "4px",
    padding: "8px 10px",
  },
  kvKey: {
    fontSize: "9px",
    color: "#4A7A8A",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    fontFamily: "'IBM Plex Mono', monospace",
    marginBottom: "3px",
  },
  kvVal: {
    fontSize: "13px",
    color: "#E8F8FF",
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 500,
  },
  kvValHi: {
    fontSize: "14px",
    color: "#00F5FF",
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 700,
  },
  kvSub: {
    fontSize: "9px",
    color: "#2a5070",
    marginTop: "2px",
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: "0.04em",
  },
  checksRow: {
    display: "flex", flexWrap: "wrap", gap: "8px",
  },
  checkOk: {
    display: "inline-flex", alignItems: "center", gap: "6px",
    background: "rgba(0,255,136,0.06)",
    border: "1px solid rgba(0,255,136,0.25)",
    color: "#00FF88",
    fontSize: "10px",
    padding: "4px 10px",
    borderRadius: "999px",
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: "0.04em",
  },
  checkFail: {
    display: "inline-flex", alignItems: "center", gap: "6px",
    background: "rgba(255,80,80,0.08)",
    border: "1px solid rgba(255,80,80,0.30)",
    color: "#ff6060",
    fontSize: "10px",
    padding: "4px 10px",
    borderRadius: "999px",
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: "0.04em",
  },
  footer: {
    marginTop: "14px",
    paddingTop: "10px",
    borderTop: "1px solid rgba(0,245,255,0.08)",
    display: "flex", justifyContent: "flex-end",
  },
  openLink: {
    background: "transparent",
    border: "1px solid rgba(0,245,255,0.25)",
    color: "#00F5FF",
    padding: "5px 12px",
    borderRadius: "3px",
    fontSize: "9px",
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    textDecoration: "none",
    cursor: "pointer",
    transition: "all 0.2s",
  },
};
