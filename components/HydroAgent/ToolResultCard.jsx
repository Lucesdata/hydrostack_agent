"use client";
import Link from "next/link";
import { useLang } from "@/lib/i18n";

/**
 * Renders the inline result of a tool call inside the chat.
 * Currently supports: `size_septic_tank`, `evaluate_soil_infiltration`.
 */
export default function ToolResultCard({ tool, args, result }) {
  const { t, lang } = useLang();
  const a = t.agent;

  if (tool === "size_septic_tank") {
    return <SepticCard args={args} result={result} a={a} />;
  }
  if (tool === "evaluate_soil_infiltration") {
    return <InfiltrationCard args={args} result={result} a={a} lang={lang} />;
  }
  return null;
}

function SepticCard({ args, result, a }) {
  const T = a?.tool?.sizeSeptic;
  if (!T) return null;

  if (!result?.ok) {
    return (
      <div style={S.card}>
        <div style={S.header}>
          <span style={S.tag}>tool · size_septic_tank</span>
          <span style={S.errorTag}>{T.errorTitle}</span>
        </div>
        <div style={S.errorBody}>{result?.error || a.toolError}</div>
      </div>
    );
  }

  const inputs  = result.inputs   || {};
  const norm    = result.norm     || {};
  const res     = result.results  || {};
  const checks  = result.checks   || {};

  return (
    <div style={S.card} role="region" aria-label={T.title}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <span style={S.toolDot} className="blink" aria-hidden="true" />
          <span style={S.tag}>tool · size_septic_tank</span>
        </div>
        <span style={S.normPill}>
          {norm.flag} {norm.name}
        </span>
      </div>

      <h3 style={S.title}>{T.title}</h3>
      <div style={S.subtitle}>{T.subtitle} · {norm.ref}</div>

      {/* Inputs */}
      <div style={S.sectionLabel}>{T.inputs}</div>
      <div style={S.kvGrid}>
        <KV k={T.users}      v={`${inputs.users}`} />
        <KV k={T.norm}       v={norm.flag + " " + norm.key?.toUpperCase()} />
        <KV k={T.temp}       v={`${inputs.temp_c} °C`} sub={norm.temp_band} />
        <KV k={T.dotacion}   v={`${inputs.dotacion_lpd} L/p·d`} />
        <KV k={T.retCoef}    v={inputs.return_coef} />
        <KV k={T.cleanYears} v={`${inputs.clean_years} a`} />
        <KV k={T.depth}      v={`${inputs.depth_m} m`} />
      </div>

      {/* Results */}
      <div style={S.sectionLabel}>{T.results}</div>
      <div style={S.kvGrid}>
        <KV k={T.qd}    v={`${res.Q_AR_m3_day} m³/d`} highlight />
        <KV k={T.vl}    v={`${res.Vl_m3} m³`} />
        <KV k={T.vs}    v={`${res.Vs_m3} m³`} />
        <KV k={T.vn}    v={`${res.Vn_m3} m³`} />
        <KV
          k={T.vtot}
          v={`${res.Vtot_m3} m³`}
          sub={`${res.Vtot_liters?.toLocaleString?.() ?? res.Vtot_liters} L`}
          highlight
        />
        <KV k={T.length}   v={`${res.length_m} m`} />
        <KV k={T.width}    v={`${res.width_m} m`} />
        <KV k={T.area}     v={`${res.area_m2} m²`} />
        <KV k={T.chambers} v={`${res.chambers}`} />
        <KV k={T.srt}      v={`${res.SRT_days} d`} />
      </div>
      {res.min_volume_applied && (
        <div style={S.warning}>⚠ {T.minVolApplied}</div>
      )}

      {/* Checks */}
      <div style={S.sectionLabel}>{T.checks}</div>
      <div style={S.checksRow}>
        <Check ok={checks.depth_ok}  label={T.checkDepth} />
        <Check ok={checks.width_ok}  label={T.checkWidth} />
        <Check ok={checks.length_ok} label={T.checkLength} />
        <Check ok={checks.srt_ok}    label={T.checkSrt} />
      </div>

      {/* Footer */}
      <div style={S.footer}>
        <Link href="/calculators/fosa-septica" style={S.openLink} className="btn-ghost">
          {T.openCalculator}
        </Link>
      </div>
    </div>
  );
}

function InfiltrationCard({ args, result, a, lang }) {
  const T = a?.tool?.infiltration;
  if (!T) return null;

  if (!result?.ok) {
    return (
      <div style={S.card}>
        <div style={S.header}>
          <span style={S.tag}>tool · evaluate_soil_infiltration</span>
          <span style={S.errorTag}>{T.errorTitle}</span>
        </div>
        <div style={S.errorBody}>{result?.error || a.toolError}</div>
      </div>
    );
  }

  const inputs = result.inputs  || {};
  const soil   = result.soil    || {};
  const res    = result.results;
  const recs   = result.recommendations || [];
  const soilLabel = lang === "en" ? soil.label_en : soil.label_es;

  return (
    <div style={S.card} role="region" aria-label={T.title}>
      <div style={S.header}>
        <div style={S.headerLeft}>
          <span style={S.toolDot} className="blink" aria-hidden="true" />
          <span style={S.tag}>tool · evaluate_soil_infiltration</span>
        </div>
        <span style={soil.suitable ? S.suitablePill : S.notSuitablePill}>
          {soil.suitable ? "✓ " + T.suitable : "✗ " + T.notSuitable}
        </span>
      </div>

      <h3 style={S.title}>{T.title}</h3>
      <div style={S.subtitle}>{T.subtitle}</div>

      {/* Inputs */}
      <div style={S.sectionLabel}>{T.inputs}</div>
      <div style={S.kvGrid}>
        <KV
          k={T.qd}
          v={`${inputs.Qd_m3_day} m³/d`}
          sub={inputs.qd_source === "from_users" ? T.qdSourceUsers : T.qdSourceDirect}
        />
        <KV k={T.soilType} v={soilLabel || soil.type} />
        <KV k={T.percTest} v={`${inputs.perc_test_min_per_cm} min/cm`} />
        <KV k={T.trenchWidth} v={`${inputs.trench_width_m} m`} />
      </div>

      {/* Results */}
      {res && (
        <>
          <div style={S.sectionLabel}>{T.results}</div>
          <div style={S.kvGrid}>
            <KV k={T.q_inf}      v={`${res.hydraulic_rate_l_m2_day} L/m²·d`} />
            <KV k={T.A_inf}      v={`${res.A_inf_m2} m²`} highlight />
            <KV k={T.L_tren}     v={`${res.L_trenches_m} m`} highlight />
            <KV k={T.n_trenches} v={`${res.n_trenches_25m}`} />
          </div>
        </>
      )}

      {/* Recommendations */}
      {recs.length > 0 && (
        <>
          <div style={S.sectionLabel}>{T.recommendations}</div>
          <ul style={S.recList}>
            {recs.map((r, i) => (
              <li key={i} style={S.recItem}>
                <span style={S.recDot} aria-hidden="true">▸</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
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

  warning: {
    marginTop: "10px",
    fontSize: "11px",
    color: "#FFB020",
    background: "rgba(255,176,32,0.08)",
    border: "1px solid rgba(255,176,32,0.25)",
    borderRadius: "4px",
    padding: "6px 10px",
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: "0.02em",
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
