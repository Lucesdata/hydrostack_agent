"use client";
import Link from "next/link";
import { useLang } from "@/src/lib/i18n";
import HydroAgent from "@/src/components/HydroAgent";

const MODULES = [
  { slug: "fosa-septica", labelEs: "Fosa Séptica",      labelEn: "Septic Tank",      ready: true  },
  { slug: "imhoff",       labelEs: "Tanque Imhoff",     labelEn: "Imhoff Tank",      ready: false },
  { slug: "lodos",        labelEs: "Lodos Activados",   labelEn: "Activated Sludge", ready: false },
  { slug: "uasb",         labelEs: "Reactor UASB",      labelEn: "UASB Reactor",     ready: false },
  { slug: "filtro",       labelEs: "Filtro Percolador", labelEn: "Trickling Filter", ready: false },
  { slug: "potable",      labelEs: "Potabilización",    labelEn: "Water Treatment",  ready: false },
];

const FEATURES = [
  { icon: "🌐", keyT: "feat1Title", keyD: "feat1Desc" },
  { icon: "📐", keyT: "feat2Title", keyD: "feat2Desc" },
  { icon: "📚", keyT: "feat3Title", keyD: "feat3Desc" },
  { icon: "🖨", keyT: "feat4Title", keyD: "feat4Desc" },
];

export default function LandingPage() {
  const { t, lang } = useLang();
  const tl = t.landing;

  return (
    <div style={S.page}>

      {/* ── Hydro_Agent: centerpiece ── */}
      <HydroAgent variant="landing" showOpenFull />

      {/* ── Below-the-fold: secondary content ── */}
      <section style={S.section} id="features">
        <div style={S.sectionInner}>
          <div style={S.sectionHeader}>
            <div style={S.sectionTag}>capacidades</div>
            <h2 style={S.sectionTitle}>HydroStack</h2>
            <p style={S.sectionSub}>{tl.subtitle}</p>
          </div>
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

      <section style={S.modulesSection} id="modules">
        <div style={S.sectionInner}>
          <div style={S.sectionHeader}>
            <div style={S.sectionTag}>módulos</div>
            <h2 style={S.sectionTitle}>{tl.modulesTitle}</h2>
          </div>
          <div style={S.moduleGrid}>
            {MODULES.map((m, i) =>
              m.ready ? (
                <Link
                  key={i}
                  href={`/calculators/${m.slug}`}
                  style={S.moduleCard(true)}
                  className="tech-card"
                >
                  <div style={S.moduleHex}>⬡</div>
                  <div style={S.moduleName}>{lang === "es" ? m.labelEs : m.labelEn}</div>
                  <div style={S.moduleReady}>
                    <span style={S.moduleReadyDot} className="blink" aria-hidden="true" />
                    v1.0 →
                  </div>
                </Link>
              ) : (
                <div key={i} style={S.moduleCard(false)}>
                  <div style={{ ...S.moduleHex, opacity: 0.25 }}>⬡</div>
                  <div style={{ ...S.moduleName, opacity: 0.35 }}>
                    {lang === "es" ? m.labelEs : m.labelEn}
                  </div>
                  <div style={S.moduleSoon}>{tl.modulesComingSoon}</div>
                </div>
              )
            )}
          </div>
        </div>
      </section>

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

  /* Below-the-fold sections */
  section: {
    padding: "clamp(48px, 9vw, 80px) clamp(16px, 5vw, 28px)",
    borderTop: "1px solid rgba(0,245,255,0.06)",
  },
  sectionInner: { maxWidth: "1100px", margin: "0 auto" },
  sectionHeader: { textAlign: "center", marginBottom: "32px" },
  sectionTag: {
    fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase",
    color: "#4A7A8A", fontFamily: "'IBM Plex Mono', monospace",
    marginBottom: "10px",
  },
  sectionTitle: {
    fontSize: "clamp(22px, 3vw, 28px)",
    fontWeight: 700, color: "#E8F8FF",
    fontFamily: "'Orbitron', sans-serif",
    marginBottom: "8px",
  },
  sectionSub: {
    fontSize: "13px", color: "#7ab8c8",
    fontFamily: "'Inter', sans-serif",
    maxWidth: "600px", margin: "0 auto",
    lineHeight: 1.6,
  },

  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  featureCard: {
    background: "#041820",
    border: "1px solid rgba(0,245,255,0.12)",
    borderRadius: "8px",
    padding: "24px 20px",
    transition: "border-color 0.2s, background 0.2s",
  },
  featureIcon: { fontSize: "24px", marginBottom: "14px" },
  featureTitle: {
    fontSize: "12px", fontWeight: 700, color: "#E8F8FF",
    marginBottom: "8px", letterSpacing: "0.08em", textTransform: "uppercase",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  featureDesc: {
    fontSize: "12px", color: "#4A7A8A", lineHeight: 1.75,
    fontFamily: "'Inter', sans-serif",
  },

  modulesSection: {
    padding: "clamp(48px, 9vw, 80px) clamp(16px, 5vw, 28px)",
    background: "rgba(0,0,0,0.25)",
    borderTop: "1px solid rgba(0,245,255,0.06)",
    borderBottom: "1px solid rgba(0,245,255,0.06)",
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
    fontSize: "11px", fontWeight: 600, color: "#E8F8FF",
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

  footer: {
    borderTop: "1px solid rgba(0,245,255,0.08)",
    padding: "20px clamp(16px, 5vw, 28px)",
    background: "rgba(2,12,16,0.8)",
  },
  footerInner: {
    maxWidth: "1100px", margin: "0 auto",
    display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap",
  },
  footerLogo: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "12px", fontWeight: 700, color: "#00F5FF",
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
