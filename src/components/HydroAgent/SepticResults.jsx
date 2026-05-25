"use client";

// ─── Translations ─────────────────────────────────────────────────────────────

// Next-steps content keyed by region. Detection is a simple string match on ubicacion.
const NEXT_STEPS = {
  colombia: {
    es: [
      "Contratar un ingeniero sanitario o civil matriculado para firmar el diseño definitivo",
      "Realizar estudio de percolación del suelo con profesional certificado (IGAC o equivalente)",
      "Tramitar concepto favorable del PSMV o autorización de la CAR/CVC según tu municipio",
      "Solicitar licencia de construcción ante la Curaduría Urbana o la oficina de planeación municipal",
      "Contratar obra con empresa o maestro de obra que tenga experiencia en saneamiento rural",
    ],
    en: [
      "Hire a licensed sanitary or civil engineer to sign the final design",
      "Conduct a soil percolation study with a certified professional",
      "Obtain approval from the municipal PSMV or regional CAR/CVC authority",
      "Apply for a construction permit at the local planning or curaduría office",
      "Hire a contractor experienced in rural sanitation systems",
    ],
  },
  españa: {
    es: [
      "Encargar proyecto técnico firmado por arquitecto o ingeniero (CTE DB-HS 5)",
      "Solicitar licencia de obra menor o mayor en tu ayuntamiento",
      "Contratar empresa instaladora autorizada por tu comunidad autónoma",
      "Comunicar la instalación a la Confederación Hidrográfica si hay zona sensible",
      "Solicitar inspección de obra terminada para la cédula de habitabilidad",
    ],
    en: [
      "Commission a technical project signed by a licensed architect or engineer (CTE DB-HS 5)",
      "Apply for a minor or major works permit at your town hall",
      "Hire an installer authorized by your autonomous community",
      "Notify the Hydrographic Confederation if near a sensitive water zone",
      "Request final inspection for the habitation certificate",
    ],
  },
  usa: {
    es: [
      "Realizar prueba de percolación (perc test) con ingeniero autorizado por el condado",
      "Presentar el diseño al Departamento de Salud del condado para aprobación",
      "Contratar instalador de sistemas sépticos con licencia estatal",
      "Solicitar inspección final del condado antes del tapado del sistema",
      "Mantener registros del sistema para futuras inspecciones y venta de la propiedad",
    ],
    en: [
      "Conduct a percolation test with a county-licensed engineer or soil scientist",
      "Submit the design to the county Health Department for approval",
      "Hire a state-licensed septic system installer",
      "Request the county's final inspection before backfilling the system",
      "Keep system records for future inspections and property sale",
    ],
  },
  default: {
    es: [
      "Contratar un ingeniero sanitario o ambiental titulado para revisar y firmar el diseño",
      "Realizar estudio de percolación del suelo antes de dimensionar el campo definitivo",
      "Verificar los permisos y aprobaciones exigidos por tu municipio o autoridad ambiental local",
      "Contratar empresa o profesional con experiencia en instalación de sistemas sépticos",
      "Planificar inspección y limpieza del tanque cada 2–3 años según uso",
    ],
    en: [
      "Hire a licensed sanitary or environmental engineer to review and sign the final design",
      "Conduct a soil percolation test before finalizing the drainage field dimensions",
      "Verify the permits and approvals required by your local municipality or environmental authority",
      "Hire a contractor experienced in septic system installation",
      "Plan for tank inspection and pump-out every 2–3 years depending on use",
    ],
  },
};

function getNextSteps(ubicacion, lang) {
  if (!ubicacion) return NEXT_STEPS.default[lang] ?? NEXT_STEPS.default.es;
  const u = ubicacion.toLowerCase();
  if (u.includes("colombia") || u.includes("bogot") || u.includes("medell") || u.includes("cali") || u.includes("barranquill") || u.includes("cartagena")) {
    return NEXT_STEPS.colombia[lang] ?? NEXT_STEPS.colombia.es;
  }
  if (u.includes("españa") || u.includes("spain") || u.includes("madrid") || u.includes("barcelona") || u.includes("valencia") || u.includes("sevilla")) {
    return NEXT_STEPS.españa[lang] ?? NEXT_STEPS.españa.es;
  }
  if (u.includes("usa") || u.includes("united states") || u.includes("estados unidos") || u.includes("florida") || u.includes("texas") || u.includes("california")) {
    return NEXT_STEPS.usa[lang] ?? NEXT_STEPS.usa.es;
  }
  return NEXT_STEPS.default[lang] ?? NEXT_STEPS.default.es;
}

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
    note: "Diseño preliminar orientativo. Requiere estudio de suelo y firma de ingeniero antes de construir.",
    nextStepsTitle: "PRÓXIMOS PASOS",
    askMore: "¿Tienes preguntas sobre este diseño o los pasos a seguir? Escríbelas abajo →",
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
    note: "Preliminary design for guidance only. A soil study and engineer sign-off are required before construction.",
    nextStepsTitle: "NEXT STEPS",
    askMore: "Have questions about this design or the steps ahead? Write them below →",
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
  nextStepsSection: {
    marginTop: "14px",
    paddingTop: "12px",
    borderTop: "1px solid rgba(0,245,255,0.10)",
  },
  nextStepsTitle: {
    fontSize: "9px",
    letterSpacing: "0.14em",
    color: "#00F5FF",
    textTransform: "uppercase",
    marginBottom: "10px",
  },
  nextStepItem: {
    display: "flex",
    gap: "10px",
    alignItems: "flex-start",
    padding: "5px 0",
    borderBottom: "1px solid rgba(0,245,255,0.04)",
  },
  nextStepNum: {
    color: "#00F5FF",
    fontSize: "9px",
    fontWeight: 700,
    flexShrink: 0,
    marginTop: "1px",
    minWidth: "14px",
  },
  nextStepText: {
    color: "#7ab8c8",
    fontSize: "11px",
    lineHeight: 1.55,
    fontFamily: "'Inter', sans-serif",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SepticResults({ results, lang = "es", ubicacion }) {
  const t = T[lang] || T.es;
  const { tank, field, warnings } = results;
  const nextSteps = getNextSteps(ubicacion, lang);

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

      {/* Next steps */}
      <div style={sty.nextStepsSection}>
        <div style={sty.nextStepsTitle}>{t.nextStepsTitle}</div>
        {nextSteps.map((step, i) => (
          <div key={i} style={sty.nextStepItem}>
            <span style={sty.nextStepNum}>{i + 1}.</span>
            <span style={sty.nextStepText}>{step}</span>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div style={{ ...sty.note, marginTop: "14px" }}>{t.note}</div>
      <div style={sty.askMore}>{t.askMore}</div>
    </div>
  );
}
