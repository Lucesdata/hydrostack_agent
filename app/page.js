"use client";
import Link from "next/link";
import { useLang } from "@/lib/i18n";

const MODULES = [
  { slug: "fosa-septica", labelEs: "Fosa Séptica",      labelEn: "Septic Tank",      ready: true  },
  { slug: "imhoff",       labelEs: "Tanque Imhoff",     labelEn: "Imhoff Tank",      ready: false },
  { slug: "lodos",        labelEs: "Lodos Activados",   labelEn: "Activated Sludge", ready: false },
  { slug: "uasb",         labelEs: "Reactor UASB",      labelEn: "UASB Reactor",     ready: false },
  { slug: "filtro",       labelEs: "Filtro Percolador", labelEn: "Trickling Filter",  ready: false },
  { slug: "potable",      labelEs: "Potabilización",    labelEn: "Water Treatment",  ready: false },
];

const FEATURES = [
  { icon: "🌐", keyT: "feat1Title", keyD: "feat1Desc" },
  { icon: "📐", keyT: "feat2Title", keyD: "feat2Desc" },
  { icon: "📚", keyT: "feat3Title", keyD: "feat3Desc" },
  { icon: "🖨",  keyT: "feat4Title", keyD: "feat4Desc" },
];

const TERM_LINES = [
  ["Q_AR",  "0.0960", "m³/día"],
  ["Vl",    "0.14",   "m³"],
  ["Vs",    "0.12",   "m³"],
  ["Vn",    "0.04",   "m³"],
  ["Vtot",  "0.50",   "m³  ✓"],
  ["L",     "1.55",   "m"],
  ["W",     "0.77",   "m"],
  ["SRT",   "24",     "días ✓"],
  ["Re",    "42",     "— laminar ✓"],
  ["Fr",    "2.1e-4", "— subcrit. ✓"],
];

export default function LandingPage() {
  const { t, lang } = useLang();
  const tl = t.landing;

  return (
    <div style={S.page}>

      {/* ── Hero ── */}
      <section style={S.hero}>
        {/* Grid overlay inside hero */}
        <div style={S.heroGrid} aria-hidden="true"/>

        <div style={S.heroContent}>
          {/* Eyebrow */}
          <div style={S.eyebrow} className="fade-up">
            <span style={S.onlineDot} className="blink"/>
            <span style={S.eyebrowText}>hydrostack.io</span>
          </div>

          {/* Headline */}
          <h1 style={S.h1} className="fade-up-1">
            <span style={S.h1Accent}>Hydro</span>
            <span style={S.h1Rest}>Stack</span>
          </h1>

          <p style={S.tagline} className="fade-up-2">{tl.tagline}</p>
          <p style={S.subtitle} className="fade-up-3">{tl.subtitle}</p>

          {/* Status badges */}
          <div style={S.badgesRow} className="fade-up-3">
            {[t.badge.free, t.badge.norms, t.badge.edu].map((b, i) => (
              <span key={i} style={S.heroBadge}>{b}</span>
            ))}
          </div>

          {/* CTA */}
          <div style={S.ctaRow} className="fade-up-4">
            <Link href="/calculators" style={S.ctaBtn} className="btn-cta">
              {tl.cta} →
            </Link>
            <span style={S.ctaSub}>{tl.ctaSub}</span>
          </div>
        </div>

        {/* Terminal card */}
        <div style={S.heroRight} aria-hidden="true">
          <div style={S.terminalCard}>
            <div style={S.terminalBar}>
              <span style={{ ...S.termDot, background: "#ff5f57" }}/>
              <span style={{ ...S.termDot, background: "#ffbd2e" }}/>
              <span style={{ ...S.termDot, background: "#28ca41" }}/>
              <span style={S.termTitle}>fosa-septica.calc</span>
            </div>
            <div style={S.termBody}>
              {TERM_LINES.map(([k, v, u], i) => (
                <div key={i} style={S.termLine}>
                  <span style={S.termKey}>{k}</span>
                  <span style={S.termEq}>=</span>
                  <span style={S.termVal}>{v}</span>
                  <span style={S.termUnit}>{u}</span>
                </div>
              ))}
            </div>
            {/* Bottom glow line */}
            <div style={S.termGlow}/>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={S.section} id="about">
        <div style={S.sectionInner}>
          <div style={S.featureGrid}>
            {FEATURES.map((f, i) => (
              <div key={i} style={S.featureCard} className="panel">
                <div style={S.featureIcon}>{f.icon}</div>
                <div style={S.featureTitle}>{tl[f.keyT]}</div>
                <div style={S.featureDesc}>{tl[f.keyD]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Módulos ── */}
      <section style={S.modulesSection}>
        <div style={S.sectionInner}>
          <div style={S.sectionHeader}>
            <div style={S.sectionTag}>módulos</div>
            <h2 style={S.sectionTitle}>{tl.modulesTitle}</h2>
          </div>
          <div style={S.moduleGrid}>
            {MODULES.map((m, i) =>
              m.ready ? (
                <Link key={i} href={`/calculators/${m.slug}`} style={S.moduleCard(true)} className="tech-card">
                  <div style={S.moduleHex}>⬡</div>
                  <div style={S.moduleName}>{lang === "es" ? m.labelEs : m.labelEn}</div>
                  <div style={S.moduleReady}>
                    <span style={S.moduleReadyDot} className="blink"/>
                    v1.0 →
                  </div>
                </Link>
              ) : (
                <div key={i} style={S.moduleCard(false)}>
                  <div style={{ ...S.moduleHex, opacity: 0.25 }}>⬡</div>
                  <div style={{ ...S.moduleName, opacity: 0.35 }}>{lang === "es" ? m.labelEs : m.labelEn}</div>
                  <div style={S.moduleSoon}>{tl.modulesComingSoon}</div>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={S.footer}>
        <div style={S.footerInner}>
          <span style={S.footerLogo}>HydroStack</span>
          <span style={S.footerSep}>·</span>
          <span style={S.footerDesc}>{tl.footerDesc}</span>
          <span style={S.footerRight}>hydrostack.io</span>
        </div>
      </footer>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    fontFamily: "'IBM Plex Mono', monospace",
    position: "relative",
    zIndex: 1,
  },

  /* ── Hero ── */
  hero: {
    position: "relative",
    minHeight: "calc(100vh - 52px)",
    display: "flex",
    alignItems: "center",
    padding: "60px 28px",
    overflow: "hidden",
    background: "linear-gradient(135deg, #020C10 0%, #041820 55%, #020C10 100%)",
  },
  heroGrid: {
    position: "absolute", inset: 0,
    backgroundImage:
      "linear-gradient(rgba(0,245,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.04) 1px, transparent 1px)",
    backgroundSize: "48px 48px",
    opacity: 1,
    pointerEvents: "none",
  },
  heroContent: {
    position: "relative", zIndex: 2,
    maxWidth: "580px",
  },
  eyebrow: {
    display: "flex", alignItems: "center", gap: "8px",
    marginBottom: "20px",
  },
  onlineDot: {
    width: "6px", height: "6px", borderRadius: "50%",
    background: "#00FF88", boxShadow: "0 0 8px #00FF88",
    display: "inline-block", flexShrink: 0,
  },
  eyebrowText: {
    fontSize: "10px", letterSpacing: "0.2em",
    textTransform: "uppercase", color: "#4A7A8A",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  h1: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "clamp(42px, 7vw, 76px)",
    fontWeight: "900",
    lineHeight: 1,
    marginBottom: "16px",
  },
  h1Accent: { color: "#00F5FF", textShadow: "0 0 40px rgba(0,245,255,0.4)" },
  h1Rest:   { color: "#E8F8FF" },
  tagline: {
    fontSize: "15px", fontWeight: "500", color: "#7ab8c8",
    marginBottom: "10px", letterSpacing: "0.04em",
    fontFamily: "'Inter', sans-serif",
  },
  subtitle: {
    fontSize: "13px", color: "#4A7A8A", lineHeight: "1.75",
    maxWidth: "460px", marginBottom: "24px",
    fontFamily: "'Inter', sans-serif",
  },
  badgesRow: { display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "32px" },
  heroBadge: {
    fontSize: "8px", letterSpacing: "0.12em", textTransform: "uppercase",
    color: "#4A7A8A", border: "1px solid rgba(0,245,255,0.12)",
    padding: "4px 10px", borderRadius: "2px",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  ctaRow: { display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" },
  ctaBtn: {
    display: "inline-block", padding: "13px 28px",
    background: "transparent",
    border: "1px solid #00F5FF",
    color: "#00F5FF",
    borderRadius: "4px",
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "11px", fontWeight: "700",
    letterSpacing: "0.1em", textTransform: "uppercase",
    transition: "all 0.2s",
  },
  ctaSub: {
    fontSize: "9px", color: "#2a5070",
    fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.08em",
  },

  /* ── Terminal card ── */
  heroRight: {
    position: "absolute", right: "5%", top: "50%",
    transform: "translateY(-50%)", zIndex: 2,
  },
  terminalCard: {
    background: "rgba(4,24,32,0.9)",
    border: "1px solid rgba(0,245,255,0.15)",
    borderRadius: "8px", overflow: "hidden", width: "280px",
    boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 40px rgba(0,245,255,0.06)",
    position: "relative",
  },
  terminalBar: {
    background: "rgba(2,12,16,0.8)",
    padding: "8px 14px",
    display: "flex", alignItems: "center", gap: "6px",
    borderBottom: "1px solid rgba(0,245,255,0.08)",
  },
  termDot: { width: "8px", height: "8px", borderRadius: "50%" },
  termTitle: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "9px", color: "#4A7A8A",
    marginLeft: "6px", letterSpacing: "0.08em",
  },
  termBody: { padding: "14px 16px" },
  termLine: {
    display: "flex", gap: "6px", marginBottom: "5px",
    fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px",
  },
  termKey:  { color: "#4A7A8A", width: "48px" },
  termEq:   { color: "#1e3a55" },
  termVal:  { color: "#00F5FF", fontWeight: "700" },
  termUnit: { color: "#2a5070", fontSize: "8px", marginTop: "1px" },
  termGlow: {
    height: "1px",
    background: "linear-gradient(90deg, transparent, rgba(0,245,255,0.4), transparent)",
  },

  /* ── Features ── */
  section: { padding: "72px 28px" },
  sectionInner: { maxWidth: "1100px", margin: "0 auto" },
  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  featureCard: {
    background: "#041820",
    border: "1px solid rgba(0,245,255,0.12)",
    borderRadius: "8px", padding: "24px 20px",
    transition: "border-color 0.2s, background 0.2s",
  },
  featureIcon: { fontSize: "24px", marginBottom: "14px" },
  featureTitle: {
    fontSize: "12px", fontWeight: "700", color: "#E8F8FF",
    marginBottom: "8px", letterSpacing: "0.08em", textTransform: "uppercase",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  featureDesc: {
    fontSize: "12px", color: "#4A7A8A", lineHeight: "1.75",
    fontFamily: "'Inter', sans-serif",
  },

  /* ── Modules ── */
  modulesSection: {
    padding: "72px 28px",
    background: "rgba(0,0,0,0.25)",
    borderTop: "1px solid rgba(0,245,255,0.06)",
    borderBottom: "1px solid rgba(0,245,255,0.06)",
  },
  sectionHeader: { textAlign: "center", marginBottom: "40px" },
  sectionTag: {
    fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase",
    color: "#4A7A8A", fontFamily: "'IBM Plex Mono', monospace", marginBottom: "10px",
  },
  sectionTitle: {
    fontSize: "26px", fontWeight: "700", color: "#E8F8FF",
    fontFamily: "'Orbitron', sans-serif",
  },
  moduleGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: "12px",
  },
  moduleCard: (active) => ({
    background: active ? "rgba(0,245,255,0.05)" : "rgba(4,24,32,0.6)",
    border: active ? "1px solid rgba(0,245,255,0.22)" : "1px solid rgba(0,245,255,0.06)",
    borderRadius: "8px", padding: "22px 16px", textAlign: "center",
    cursor: active ? "pointer" : "default",
    transition: "all 0.25s", display: "block",
    textDecoration: "none",
  }),
  moduleHex: { fontSize: "28px", color: "#00F5FF", marginBottom: "8px" },
  moduleName: {
    fontSize: "11px", fontWeight: "600", color: "#E8F8FF",
    fontFamily: "'IBM Plex Mono', monospace", marginBottom: "10px",
    letterSpacing: "0.04em",
  },
  moduleReady: {
    display: "inline-flex", alignItems: "center", gap: "6px",
    fontSize: "9px", color: "#00F5FF",
    letterSpacing: "0.08em", fontFamily: "'IBM Plex Mono', monospace",
  },
  moduleReadyDot: {
    width: "4px", height: "4px", borderRadius: "50%",
    background: "#00FF88", boxShadow: "0 0 4px #00FF88", flexShrink: 0,
  },
  moduleSoon: {
    fontSize: "8px", color: "#2a5070",
    letterSpacing: "0.1em", textTransform: "uppercase",
    fontFamily: "'IBM Plex Mono', monospace",
  },

  /* ── Footer ── */
  footer: {
    borderTop: "1px solid rgba(0,245,255,0.08)",
    padding: "20px 28px",
    background: "rgba(2,12,16,0.8)",
  },
  footerInner: {
    maxWidth: "1100px", margin: "0 auto",
    display: "flex", alignItems: "center", gap: "12px",
  },
  footerLogo: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "12px", fontWeight: "700", color: "#00F5FF",
  },
  footerSep: { color: "#1a3a4a", fontSize: "12px" },
  footerDesc: {
    fontSize: "10px", color: "#2a5070",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  footerRight: {
    marginLeft: "auto", fontSize: "9px", color: "#1e3050",
    fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.1em",
  },
};
