"use client";

import Link from "next/link";
import { useLang } from "@/src/lib/i18n";

/**
 * Shown on top of individual /calculators/* pages to remind the user that
 * this calculator is part of the guided flow toward the final PDF report.
 * Links back to /build with the matching step preselected (best-effort).
 */

const STEP_INFO = {
  1: { es: "Ubicación",     en: "Location",    icon: "📍" },
  2: { es: "Fosa Séptica",  en: "Septic Tank", icon: "🪣" },
  3: { es: "Mantenimiento", en: "Maintenance", icon: "🔧" },
};

const NEXT_STEP = {
  1: { es: "Fosa Séptica → /calculators/fosa-septica", en: "Septic Tank → /calculators/fosa-septica", href: "/calculators/fosa-septica" },
  2: { es: "Mantenimiento → /calculators/mantenimiento", en: "Maintenance → /calculators/mantenimiento", href: "/calculators/mantenimiento" },
  3: { es: "Informe PDF → /build", en: "PDF Report → /build", href: "/build" },
};

export default function CalculatorContextBanner({ step }) {
  const { lang } = useLang();
  const isEs = lang === "es";
  const info = STEP_INFO[step];
  const next = NEXT_STEP[step];
  if (!info) return null;

  return (
    <div style={S.wrap}>
      <div style={S.inner}>
        <Link href="/build" style={S.flowLink}>
          ← {isEs ? "Volver al flujo guiado" : "Back to guided flow"}
        </Link>

        <div style={S.center}>
          <span style={S.crumb}>
            {[1, 2, 3, 4].map((n) => (
              <span key={n} style={S.dot(n === step, n < step)}>
                {n}
              </span>
            ))}
          </span>
          <span style={S.label}>
            {info.icon} {isEs ? `Paso ${step} de 4 · ${info.es}` : `Step ${step} of 4 · ${info.en}`}
          </span>
        </div>

        {next && (
          <Link href={next.href} style={S.nextLink}>
            {isEs ? "Siguiente" : "Next"} →
          </Link>
        )}
      </div>
    </div>
  );
}

const S = {
  wrap: {
    background: "linear-gradient(120deg, rgba(0,245,255,0.06), rgba(0,255,136,0.03))",
    borderBottom: "1px solid rgba(0,245,255,0.18)",
    padding: "10px clamp(14px, 4vw, 24px)",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  inner: {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
  },
  flowLink: {
    fontSize: "11px",
    color: "#7ab8c8",
    textDecoration: "none",
    letterSpacing: "0.06em",
    fontWeight: 600,
  },
  center: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flex: "1 1 auto",
    justifyContent: "center",
    minWidth: 0,
    flexWrap: "wrap",
  },
  crumb: { display: "inline-flex", gap: "5px" },
  dot: (current, complete) => ({
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    fontSize: "10px",
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: current
      ? "rgba(0,245,255,0.2)"
      : complete
      ? "#00FF88"
      : "rgba(255,255,255,0.05)",
    color: current ? "#00F5FF" : complete ? "#031018" : "#4a7a8a",
    border: current ? "1px solid #00F5FF" : "1px solid transparent",
  }),
  label: {
    fontSize: "11px",
    color: "#e2f0f7",
    fontWeight: 700,
    letterSpacing: "0.04em",
  },
  nextLink: {
    fontSize: "11px",
    color: "#00F5FF",
    textDecoration: "none",
    letterSpacing: "0.08em",
    fontWeight: 700,
    background: "rgba(0,245,255,0.08)",
    border: "1px solid rgba(0,245,255,0.3)",
    borderRadius: "4px",
    padding: "6px 12px",
  },
};
