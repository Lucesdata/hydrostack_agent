"use client";

const STEPS = [
  { n: 1, key: "geo",         icon: "📍", titleEs: "Ubicación",     titleEn: "Location" },
  { n: 2, key: "septic",      icon: "🪣", titleEs: "Fosa Séptica",  titleEn: "Septic Tank" },
  { n: 3, key: "maintenance", icon: "🔧", titleEs: "Mantenimiento", titleEn: "Maintenance" },
  { n: 4, key: "report",      icon: "📄", titleEs: "Informe PDF",   titleEn: "PDF Report" },
];

export default function Stepper({
  current,
  progress,
  lastReport,
  onJump,
  lang = "es",
}) {
  const isEs = lang === "es";

  const statusFor = (step) => {
    if (step.n === current) return "current";
    if (step.key === "geo" && progress.geo) return "complete";
    if (step.key === "septic" && progress.septic) return "complete";
    if (step.key === "maintenance" && progress.maintenance) return "complete";
    if (step.key === "report" && lastReport) return "complete";
    return "pending";
  };

  const canJumpTo = (step) => {
    // Jump back to anything already started/visited, or forward only to the
    // immediate next step (not skipping over incomplete required steps).
    if (step.n <= current) return true;
    if (step.n === current + 1) return true;
    return statusFor(step) === "complete";
  };

  const reportState = (() => {
    if (lastReport) return "generated";
    if (progress.allReady) return "ready";
    return "locked";
  })();

  return (
    <aside style={S.wrap}>
      <div style={S.tag}>{isEs ? "tu sistema" : "your system"}</div>
      <h2 style={S.title}>{isEs ? "Mi solución" : "My solution"}</h2>

      <ol style={S.list}>
        {STEPS.map((step) => {
          const status = statusFor(step);
          const clickable = canJumpTo(step);
          return (
            <li
              key={step.key}
              style={S.item(status, clickable)}
              onClick={() => clickable && onJump?.(step.n)}
            >
              <span style={S.dot(status)}>
                {status === "complete" ? "✓" : step.n}
              </span>
              <div style={S.itemBody}>
                <div style={S.itemIcon}>{step.icon}</div>
                <div style={S.itemTitle(status)}>
                  {isEs ? step.titleEs : step.titleEn}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div style={S.divider} />

      <div style={S.reportBox(reportState)}>
        <div style={S.reportTag}>
          {isEs ? "Informe final" : "Final report"}
        </div>
        {reportState === "generated" && (
          <a
            href={lastReport.url}
            target="_blank"
            rel="noopener noreferrer"
            style={S.reportLink}
          >
            ⬇ {isEs ? "Descargar PDF" : "Download PDF"}
          </a>
        )}
        {reportState === "ready" && (
          <div style={S.reportHint}>
            {isEs
              ? "Datos listos — ve al paso 4 para generar."
              : "Data ready — go to step 4 to generate."}
          </div>
        )}
        {reportState === "locked" && (
          <div style={S.reportHintMuted}>
            {isEs
              ? "Completa Fosa Séptica para habilitar."
              : "Complete Septic Tank to unlock."}
          </div>
        )}
      </div>
    </aside>
  );
}

const S = {
  wrap: {
    position: "sticky",
    top: "72px",
    alignSelf: "flex-start",
    width: "260px",
    flexShrink: 0,
    background: "rgba(4,24,32,0.65)",
    border: "1px solid rgba(0,245,255,0.12)",
    borderRadius: "10px",
    padding: "20px 18px",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  tag: {
    fontSize: "9px",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#4a7a8a",
    marginBottom: "6px",
  },
  title: {
    fontSize: "15px",
    color: "#e8f8ff",
    margin: "0 0 18px 0",
    fontWeight: 700,
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  item: (status, clickable) => ({
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 10px",
    borderRadius: "6px",
    cursor: clickable ? "pointer" : "not-allowed",
    background:
      status === "current" ? "rgba(0,245,255,0.08)" : "transparent",
    border:
      status === "current"
        ? "1px solid rgba(0,245,255,0.3)"
        : "1px solid transparent",
    opacity: clickable ? 1 : 0.45,
    transition: "background 0.15s, border-color 0.15s",
  }),
  dot: (status) => ({
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: 700,
    background:
      status === "complete"
        ? "#00FF88"
        : status === "current"
        ? "rgba(0,245,255,0.2)"
        : "rgba(255,255,255,0.05)",
    color:
      status === "complete"
        ? "#031018"
        : status === "current"
        ? "#00F5FF"
        : "#4a7a8a",
    border:
      status === "current" ? "1px solid #00F5FF" : "1px solid transparent",
    flexShrink: 0,
  }),
  itemBody: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minWidth: 0,
  },
  itemIcon: { fontSize: "14px" },
  itemTitle: (status) => ({
    fontSize: "12px",
    color:
      status === "current"
        ? "#e8f8ff"
        : status === "complete"
        ? "#8ad8c8"
        : "#7ab8c8",
    fontWeight: status === "current" ? 700 : 500,
    letterSpacing: "0.04em",
  }),
  divider: {
    height: "1px",
    background: "rgba(0,245,255,0.1)",
    margin: "20px 0 16px 0",
  },
  reportBox: (state) => ({
    padding: "14px 12px",
    borderRadius: "8px",
    background:
      state === "generated"
        ? "rgba(0,255,136,0.07)"
        : state === "ready"
        ? "rgba(0,245,255,0.06)"
        : "rgba(255,255,255,0.02)",
    border:
      state === "generated"
        ? "1px solid rgba(0,255,136,0.3)"
        : state === "ready"
        ? "1px solid rgba(0,245,255,0.25)"
        : "1px solid rgba(255,255,255,0.06)",
  }),
  reportTag: {
    fontSize: "9px",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#4a7a8a",
    marginBottom: "8px",
  },
  reportLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    fontWeight: 700,
    color: "#00FF88",
    textDecoration: "none",
    letterSpacing: "0.04em",
  },
  reportHint: {
    fontSize: "11px",
    color: "#00F5FF",
    lineHeight: 1.5,
  },
  reportHintMuted: {
    fontSize: "11px",
    color: "#4a7a8a",
    lineHeight: 1.5,
  },
};
