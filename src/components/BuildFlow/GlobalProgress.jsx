"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getBuildProgress,
  getLastReport,
} from "@/src/lib/state/clientStore";
import { useLang } from "@/src/lib/i18n";

/**
 * Floating widget that surfaces the build-flow progress + report CTA on every
 * page (except /build itself, where the sidebar already shows this).
 *
 * Auto-hides while the user has no progress yet, so empty states stay clean.
 * Stays visible — but minimised — once data exists, so the user always sees
 * the path back to the final report regardless of where they navigated.
 */

const STEPS = [
  { key: "geo",         labelEs: "Ubicación",     labelEn: "Location",    icon: "📍" },
  { key: "septic",      labelEs: "Fosa",          labelEn: "Septic",      icon: "🪣" },
  { key: "maintenance", labelEs: "Mantenimiento", labelEn: "Maintenance", icon: "🔧" },
];

export default function GlobalProgress() {
  const pathname = usePathname() || "";
  const { lang } = useLang();
  const isEs = lang === "es";

  const [progress, setProgress] = useState({
    geo: false,
    septic: false,
    maintenance: false,
    allReady: false,
  });
  const [lastReport, setLastReport] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setProgress(getBuildProgress());
      setLastReport(getLastReport());
    };
    refresh();
    setMounted(true);

    window.addEventListener("storage", refresh);
    const id = window.setInterval(refresh, 1500);
    return () => {
      window.removeEventListener("storage", refresh);
      window.clearInterval(id);
    };
  }, []);

  // Hide on /build (the wizard already shows this), during SSR, and while empty.
  if (!mounted) return null;
  if (pathname.startsWith("/build")) return null;
  const anyProgress = progress.geo || progress.septic || progress.maintenance || lastReport;
  if (!anyProgress) return null;

  const completed =
    (progress.geo ? 1 : 0) +
    (progress.septic ? 1 : 0) +
    (progress.maintenance ? 1 : 0);
  const total = STEPS.length;

  const reportState = lastReport
    ? "generated"
    : progress.allReady
    ? "ready"
    : "locked";

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        style={S.pill(reportState)}
        aria-label={isEs ? "Abrir mi solución" : "Open my solution"}
      >
        <span style={S.pillDots}>
          {STEPS.map((s) => (
            <span key={s.key} style={S.pillDot(progress[s.key])} />
          ))}
          <span style={S.pillDot(!!lastReport)} />
        </span>
        <span style={S.pillText}>
          {isEs ? "Mi solución" : "My solution"}
        </span>
      </button>
    );
  }

  return (
    <div style={S.card(reportState)} role="complementary">
      <div style={S.head}>
        <div style={S.headLeft}>
          <span style={S.tag}>
            {isEs ? "mi solución" : "my solution"}
          </span>
          <span style={S.count}>
            {completed}/{total} {isEs ? "pasos" : "steps"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          style={S.collapseBtn}
          aria-label={isEs ? "Minimizar" : "Minimise"}
        >
          –
        </button>
      </div>

      <div style={S.steps}>
        {STEPS.map((s) => (
          <div key={s.key} style={S.step(progress[s.key])}>
            <span style={S.stepIcon}>{s.icon}</span>
            <span style={S.stepLabel(progress[s.key])}>
              {isEs ? s.labelEs : s.labelEn}
            </span>
            <span style={S.stepMark(progress[s.key])}>
              {progress[s.key] ? "✓" : "○"}
            </span>
          </div>
        ))}
      </div>

      <div style={S.cta(reportState)}>
        {reportState === "generated" ? (
          <a
            href={lastReport.url}
            target="_blank"
            rel="noopener noreferrer"
            style={S.ctaLinkOk}
          >
            ⬇ {isEs ? "Descargar informe" : "Download report"}
          </a>
        ) : reportState === "ready" ? (
          <Link href="/build" style={S.ctaLinkReady}>
            {isEs ? "Generar informe" : "Generate report"} →
          </Link>
        ) : (
          <Link href="/build" style={S.ctaLinkMuted}>
            {isEs ? "Continuar en el flujo" : "Continue the flow"} →
          </Link>
        )}
      </div>
    </div>
  );
}

const S = {
  card: (state) => ({
    position: "fixed",
    right: "20px",
    bottom: "20px",
    zIndex: 50,
    width: "260px",
    background: "rgba(4,16,24,0.92)",
    backdropFilter: "blur(8px)",
    border: `1px solid ${
      state === "generated"
        ? "rgba(0,255,136,0.4)"
        : state === "ready"
        ? "rgba(0,245,255,0.4)"
        : "rgba(0,245,255,0.18)"
    }`,
    borderRadius: "10px",
    padding: "12px 14px",
    fontFamily: "'IBM Plex Mono', monospace",
    boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
  }),
  head: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "10px",
  },
  headLeft: { display: "flex", alignItems: "baseline", gap: "10px" },
  tag: {
    fontSize: "9px",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#4a7a8a",
  },
  count: {
    fontSize: "10px",
    color: "#7ab8c8",
    fontWeight: 700,
  },
  collapseBtn: {
    background: "transparent",
    border: "1px solid rgba(0,245,255,0.2)",
    color: "#7ab8c8",
    width: "20px",
    height: "20px",
    borderRadius: "4px",
    lineHeight: "16px",
    padding: 0,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  steps: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    marginBottom: "10px",
  },
  step: (done) => ({
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "5px 6px",
    borderRadius: "4px",
    background: done ? "rgba(0,255,136,0.05)" : "transparent",
  }),
  stepIcon: { fontSize: "12px", width: "14px" },
  stepLabel: (done) => ({
    fontSize: "11px",
    color: done ? "#8ad8c8" : "#7ab8c8",
    flex: 1,
  }),
  stepMark: (done) => ({
    fontSize: "11px",
    color: done ? "#00FF88" : "#3a5a70",
    fontWeight: 700,
  }),
  cta: (state) => ({
    paddingTop: "8px",
    borderTop: `1px solid ${
      state === "generated"
        ? "rgba(0,255,136,0.2)"
        : "rgba(0,245,255,0.12)"
    }`,
  }),
  ctaLinkOk: {
    display: "block",
    textAlign: "center",
    padding: "8px 10px",
    background: "rgba(0,255,136,0.14)",
    border: "1px solid rgba(0,255,136,0.45)",
    borderRadius: "5px",
    color: "#00FF88",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textDecoration: "none",
  },
  ctaLinkReady: {
    display: "block",
    textAlign: "center",
    padding: "8px 10px",
    background: "rgba(0,245,255,0.14)",
    border: "1px solid rgba(0,245,255,0.45)",
    borderRadius: "5px",
    color: "#00F5FF",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textDecoration: "none",
  },
  ctaLinkMuted: {
    display: "block",
    textAlign: "center",
    padding: "8px 10px",
    background: "rgba(0,245,255,0.05)",
    border: "1px solid rgba(0,245,255,0.18)",
    borderRadius: "5px",
    color: "#7ab8c8",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textDecoration: "none",
  },
  // Collapsed pill
  pill: (state) => ({
    position: "fixed",
    right: "20px",
    bottom: "20px",
    zIndex: 50,
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 14px 8px 10px",
    background: "rgba(4,16,24,0.92)",
    backdropFilter: "blur(8px)",
    border: `1px solid ${
      state === "generated"
        ? "rgba(0,255,136,0.45)"
        : "rgba(0,245,255,0.3)"
    }`,
    borderRadius: "999px",
    color: "#e2f0f7",
    cursor: "pointer",
    fontFamily: "'IBM Plex Mono', monospace",
    boxShadow: "0 8px 18px rgba(0,0,0,0.45)",
  }),
  pillDots: { display: "inline-flex", gap: "3px" },
  pillDot: (done) => ({
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: done ? "#00FF88" : "#3a5a70",
    display: "inline-block",
  }),
  pillText: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.06em",
  },
};
