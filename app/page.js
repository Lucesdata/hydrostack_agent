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
  const isEs = lang === "es";

  return (
    <div style={S.page}>

      {/* ── HERO: el flujo guiado es la entrada principal ── */}
      <section style={S.hero}>
        <div style={S.heroInner}>
          <div style={S.heroTag}>
            {isEs ? "construye tu sistema · 4 pasos · informe pdf" : "build your system · 4 steps · pdf report"}
          </div>
          <h1 style={S.heroTitle}>
            {isEs
              ? "De los datos del predio al informe técnico — en un solo flujo."
              : "From site data to the technical report — in one flow."}
          </h1>
          <p style={S.heroLead}>
            {isEs
              ? "Te llevamos paso a paso: ubicación, dimensionamiento de la fosa séptica, plan de mantenimiento y la memoria técnica firmable en PDF."
              : "We walk you through: location, septic tank sizing, maintenance plan and the signable technical PDF memo."}
          </p>
          <div style={S.heroSteps}>
            <span style={S.heroStep}>① 📍 {isEs ? "Ubicación" : "Location"}</span>
            <span style={S.heroArrow}>→</span>
            <span style={S.heroStep}>② 🪣 {isEs ? "Fosa Séptica" : "Septic Tank"}</span>
            <span style={S.heroArrow}>→</span>
            <span style={S.heroStep}>③ 🔧 {isEs ? "Mantenimiento" : "Maintenance"}</span>
            <span style={S.heroArrow}>→</span>
            <span style={S.heroStepFinal}>④ 📄 {isEs ? "Informe PDF" : "PDF Report"}</span>
          </div>
          <Link href="/build" style={S.heroBtn}>
            {isEs ? "Empezar el flujo guiado" : "Start the guided flow"} →
          </Link>
        </div>
      </section>

      {/* ── Asistente IA: ayuda secundaria, claramente al servicio del flujo ── */}
      <section style={S.assistantWrap}>
        <div style={S.assistantInner}>
          <div style={S.assistantHead}>
            <div style={S.assistantTag}>
              {isEs ? "o si prefieres conversar" : "or if you prefer to chat"}
            </div>
            <h2 style={S.assistantTitle}>
              {isEs
                ? "Asistente IA — resuelve dudas técnicas mientras avanzas"
                : "AI Assistant — answers technical questions as you go"}
            </h2>
            <p style={S.assistantSub}>
              {isEs
                ? "El asistente entiende tu progreso, sugiere próximos pasos y puede dimensionar el sistema por ti. Los resultados se guardan y aparecen en el flujo guiado."
                : "The assistant tracks your progress, suggests next steps and can size the system for you. Results sync into the guided flow."}
            </p>
          </div>
          <HydroAgent variant="landing" showOpenFull />
        </div>
      </section>

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

  /* HERO — entrada principal al flujo guiado */
  hero: {
    padding: "clamp(40px, 7vw, 72px) clamp(16px, 5vw, 28px) clamp(28px, 5vw, 40px)",
    borderBottom: "1px solid rgba(0,245,255,0.08)",
  },
  heroInner: {
    maxWidth: "920px",
    margin: "0 auto",
    textAlign: "center",
  },
  heroTag: {
    fontSize: "10px",
    letterSpacing: "0.25em",
    textTransform: "uppercase",
    color: "#00F5FF",
    fontFamily: "'IBM Plex Mono', monospace",
    marginBottom: "16px",
  },
  heroTitle: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "clamp(22px, 3.4vw, 34px)",
    color: "#E8F8FF",
    margin: "0 0 14px 0",
    fontWeight: 700,
    lineHeight: 1.25,
  },
  heroLead: {
    fontSize: "14px",
    color: "#7ab8c8",
    fontFamily: "'Inter', system-ui, sans-serif",
    lineHeight: 1.6,
    maxWidth: "640px",
    margin: "0 auto 24px",
  },
  heroSteps: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    marginBottom: "26px",
  },
  heroStep: {
    fontSize: "11px",
    color: "#a0c8d8",
    fontFamily: "'IBM Plex Mono', monospace",
    padding: "6px 10px",
    background: "rgba(0,245,255,0.05)",
    border: "1px solid rgba(0,245,255,0.15)",
    borderRadius: "4px",
    letterSpacing: "0.04em",
  },
  heroStepFinal: {
    fontSize: "11px",
    color: "#00FF88",
    fontFamily: "'IBM Plex Mono', monospace",
    padding: "6px 10px",
    background: "rgba(0,255,136,0.08)",
    border: "1px solid rgba(0,255,136,0.3)",
    borderRadius: "4px",
    letterSpacing: "0.04em",
    fontWeight: 700,
  },
  heroArrow: { color: "#3a5a70", fontSize: "12px" },
  heroBtn: {
    display: "inline-block",
    background: "rgba(0,245,255,0.18)",
    border: "1px solid rgba(0,245,255,0.55)",
    color: "#00F5FF",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "14px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    padding: "14px 28px",
    borderRadius: "6px",
    textDecoration: "none",
    boxShadow: "0 0 24px rgba(0,245,255,0.18)",
  },

  /* Asistente — sección secundaria */
  assistantWrap: {
    padding: "clamp(32px, 5vw, 56px) clamp(16px, 5vw, 28px) 12px",
  },
  assistantInner: {
    maxWidth: "1100px",
    margin: "0 auto",
  },
  assistantHead: {
    textAlign: "center",
    marginBottom: "22px",
    maxWidth: "640px",
    marginInline: "auto",
  },
  assistantTag: {
    fontSize: "9px",
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: "#4a7a8a",
    fontFamily: "'IBM Plex Mono', monospace",
    marginBottom: "8px",
  },
  assistantTitle: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "clamp(16px, 2.2vw, 20px)",
    color: "#E8F8FF",
    margin: "0 0 8px 0",
    fontWeight: 700,
  },
  assistantSub: {
    fontSize: "13px",
    color: "#7ab8c8",
    fontFamily: "'Inter', system-ui, sans-serif",
    lineHeight: 1.55,
    margin: 0,
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
