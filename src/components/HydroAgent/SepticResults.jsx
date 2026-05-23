"use client";

// ─── Translations ─────────────────────────────────────────────────────────────

const T = {
  es: {
    title:        "DISEÑO PRELIMINAR — SISTEMA SÉPTICO",
    norm:         "Norma",
    flow:         "CAUDAL DIARIO",
    flowLine:     (n, d, q) => `${n} personas × ${d} L/p·día = ${q.toLocaleString()} L/día`,
    tank:         "TANQUE SÉPTICO",
    tankVol:      "Volumen neto",
    tankDims:     "Dimensiones (L×W×H)",
    tankRet:      "Retención hidráulica",
    tankClean:    "Limpieza recomendada",
    tankCleanVal: "cada 3 años",
    days:         "días",
    field:        "CAMPO DE INFILTRACIÓN",
    fieldArea:    "Área total",
    fieldSoil:    "Suelo / tasa absorción",
    fieldTrenches:(n, l, w) => `${n} zanja${n > 1 ? "s" : ""} × ${l} m × ${w} m`,
    fieldSpacing: "Separación mínima entre zanjas",
    warnings: {
      clay_soil:    "⚠ Suelo arcilloso — el campo de infiltración es grande. Considera un humedal construido como alternativa.",
      unknown_soil: "⚠ Suelo desconocido — se usaron valores conservadores. Un estudio de percolación ajustará el área real.",
      large_system: "⚠ Más de 100 personas — evalúa una PTAR en lugar de una fosa séptica convencional.",
    },
    note: "Diseño preliminar orientativo. Requiere estudio de suelo y revisión de un profesional antes de construir.",
    askMore: "¿Tienes preguntas sobre este diseño? Escríbelas abajo →",
  },
  en: {
    title:        "PRELIMINARY DESIGN — SEPTIC SYSTEM",
    norm:         "Standard",
    flow:         "DAILY FLOW",
    flowLine:     (n, d, q) => `${n} people × ${d} L/p·day = ${q.toLocaleString()} L/day`,
    tank:         "SEPTIC TANK",
    tankVol:      "Net volume",
    tankDims:     "Dimensions (L×W×H)",
    tankRet:      "Hydraulic retention",
    tankClean:    "Recommended cleaning",
    tankCleanVal: "every 3 years",
    days:         "days",
    field:        "DRAINAGE FIELD",
    fieldArea:    "Total area",
    fieldSoil:    "Soil / absorption rate",
    fieldTrenches:(n, l, w) => `${n} trench${n > 1 ? "es" : ""} × ${l} m × ${w} m`,
    fieldSpacing: "Min. spacing between trenches",
    warnings: {
      clay_soil:    "⚠ Clay soil — the drainage field is large. Consider a constructed wetland as an alternative.",
      unknown_soil: "⚠ Unknown soil — conservative values used. A percolation test will refine the actual area.",
      large_system: "⚠ More than 100 people — consider a WWTP instead of a conventional septic system.",
    },
    note: "Preliminary design for guidance only. A soil study and professional review are required before construction.",
    askMore: "Have questions about this design? Write them below →",
  },
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const sty = {
  wrap: {
    marginTop: "12px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "11px",
  },
  header: {
    fontSize: "10px",
    letterSpacing: "0.12em",
    color: "#00F5FF",
    borderBottom: "1px solid rgba(0,245,255,0.2)",
    paddingBottom: "8px",
    marginBottom: "12px",
  },
  normLine: {
    fontSize: "10px",
    color: "#4A7A8A",
    marginTop: "4px",
    letterSpacing: "0.04em",
  },
  section: {
    marginBottom: "14px",
  },
  sectionTitle: {
    fontSize: "9px",
    letterSpacing: "0.14em",
    color: "#4A7A8A",
    textTransform: "uppercase",
    marginBottom: "6px",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "12px",
    padding: "3px 0",
    borderBottom: "1px solid rgba(0,245,255,0.05)",
  },
  rowLabel: {
    color: "#4A7A8A",
    fontSize: "10px",
    flexShrink: 0,
  },
  rowValue: {
    color: "#7ab8c8",
    fontSize: "11px",
    textAlign: "right",
  },
  bigValue: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    padding: "6px 10px",
    background: "rgba(0,245,255,0.06)",
    border: "1px solid rgba(0,245,255,0.15)",
    borderRadius: "4px",
    marginBottom: "6px",
  },
  bigLabel: {
    color: "#4A7A8A",
    fontSize: "10px",
  },
  bigNum: {
    color: "#00F5FF",
    fontSize: "15px",
    fontWeight: 700,
    letterSpacing: "0.04em",
  },
  warning: {
    padding: "7px 10px",
    background: "rgba(255,180,0,0.06)",
    border: "1px solid rgba(255,180,0,0.2)",
    borderRadius: "4px",
    color: "#c8a440",
    fontSize: "10px",
    lineHeight: 1.5,
    marginBottom: "8px",
  },
  divider: {
    borderTop: "1px solid rgba(0,245,255,0.08)",
    marginBottom: "12px",
  },
  note: {
    fontSize: "9px",
    color: "#2a5070",
    lineHeight: 1.6,
    borderTop: "1px solid rgba(0,245,255,0.06)",
    paddingTop: "10px",
    marginTop: "4px",
  },
  askMore: {
    fontSize: "10px",
    color: "#4A7A8A",
    marginTop: "10px",
    fontStyle: "italic",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SepticResults({ results, lang = "es", ubicacion }) {
  const t = T[lang] || T.es;
  const { tank, field, warnings } = results;

  return (
    <div style={sty.wrap}>
      {/* Header */}
      <div style={sty.header}>
        {t.title}
        <div style={sty.normLine}>{t.norm}: {results.normLabel}{ubicacion ? ` · ${ubicacion}` : ""}</div>
      </div>

      {/* Daily flow */}
      <div style={sty.section}>
        <div style={sty.sectionTitle}>{t.flow}</div>
        <div style={{ ...sty.row, borderBottom: "none" }}>
          <span style={sty.rowLabel}>{t.flowLine(results.personas, results.dotacion, results.qDaily)}</span>
        </div>
      </div>

      <div style={sty.divider} />

      {/* Septic tank */}
      <div style={sty.section}>
        <div style={sty.sectionTitle}>{t.tank}</div>
        <div style={sty.bigValue}>
          <span style={sty.bigLabel}>{t.tankVol}</span>
          <span style={sty.bigNum}>{tank.volumeM3} m³</span>
        </div>
        <div style={sty.row}>
          <span style={sty.rowLabel}>{t.tankDims}</span>
          <span style={sty.rowValue}>{tank.dims.L} × {tank.dims.W} × {tank.dims.H} m</span>
        </div>
        <div style={sty.row}>
          <span style={sty.rowLabel}>{t.tankRet}</span>
          <span style={sty.rowValue}>{results.tr} {t.days}</span>
        </div>
        <div style={{ ...sty.row, borderBottom: "none" }}>
          <span style={sty.rowLabel}>{t.tankClean}</span>
          <span style={sty.rowValue}>{t.tankCleanVal}</span>
        </div>
      </div>

      <div style={sty.divider} />

      {/* Drainage field */}
      <div style={sty.section}>
        <div style={sty.sectionTitle}>{t.field}</div>
        <div style={sty.bigValue}>
          <span style={sty.bigLabel}>{t.fieldArea}</span>
          <span style={sty.bigNum}>{field.area} m²</span>
        </div>
        <div style={sty.row}>
          <span style={sty.rowLabel}>{t.fieldSoil}</span>
          <span style={sty.rowValue}>{field.soilRate} L/m²·día</span>
        </div>
        <div style={{ ...sty.row, borderBottom: "none" }}>
          <span style={sty.rowLabel}>{t.fieldTrenches(field.nTrenches, field.trenchLen, field.trenchW)}</span>
          <span style={sty.rowValue}>{t.fieldSpacing}: 1.5 m</span>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div style={{ marginBottom: "10px" }}>
          {warnings.map(w => (
            <div key={w} style={sty.warning}>{t.warnings[w]}</div>
          ))}
        </div>
      )}

      {/* Footer note */}
      <div style={sty.note}>{t.note}</div>
      <div style={sty.askMore}>{t.askMore}</div>
    </div>
  );
}
