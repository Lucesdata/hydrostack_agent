"use client";
import Link from "next/link";
import { useLang } from "@/src/lib/i18n";

const MODULES = [
  { n: "01", glyph: "⬡", key: "mod1", href: "/calculators" },
  { n: "02", glyph: "◈", key: "mod2", href: "/build" },
  { n: "03", glyph: "◉", key: "mod3", href: "/chat" },
  { n: "04", glyph: "⊞", key: "mod4", href: "/licitaciones" },
];

const HUB_CSS = `
.hub-card{
  background: linear-gradient(160deg, #041820, #061218);
  border: 1px solid rgba(0,245,255,0.12);
  border-radius: 8px;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: .5rem;
  min-height: 190px;
  text-decoration: none;
  color: inherit;
  transition: transform .18s, border-color .18s, box-shadow .18s;
}
.hub-card::before{
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 2px;
  background: #00F5FF;
  opacity: .55;
}
.hub-card:hover{
  transform: translateY(-3px);
  border-color: #00F5FF;
  box-shadow: 0 6px 24px rgba(0,245,255,0.08);
}
.hub-card:hover .hub-card-cta{
  color: #E8F8FF;
}
`;

export default function LandingPage() {
  const { t } = useLang();
  const tl = t.landing;

  return (
    <div style={S.page}>
      <style dangerouslySetInnerHTML={{ __html: HUB_CSS }} />

      <section style={S.hero}>
        <div style={S.heroInner}>
          <div style={S.heroTag}>{tl.hubTag}</div>
          <h1 style={S.heroTitle}>{tl.hubTitle}</h1>
          <p style={S.heroLead}>{tl.hubLead}</p>
        </div>
      </section>

      <section style={S.gridWrap}>
        <div style={S.grid}>
          {MODULES.map((m) => {
            const mod = tl[m.key];
            return (
              <Link key={m.n} href={m.href} className="hub-card">
                <div style={S.cardTop}>
                  <span style={S.cardNumber}>{m.n}</span>
                  <span style={S.cardGlyph}>{m.glyph}</span>
                </div>
                <div style={S.cardName}>{mod.title}</div>
                <div style={S.cardDesc}>{mod.desc}</div>
                <div className="hub-card-cta" style={S.cardCta}>
                  → {tl.cardCta}
                </div>
              </Link>
            );
          })}
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

  hero: {
    padding: "clamp(48px, 8vw, 80px) clamp(16px, 5vw, 28px) clamp(28px, 4vw, 40px)",
  },
  heroInner: {
    maxWidth: "720px",
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
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "clamp(24px, 3.6vw, 38px)",
    color: "#E8F8FF",
    margin: "0 0 12px 0",
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: "0.02em",
  },
  heroLead: {
    fontSize: "14px",
    color: "#7ab8c8",
    fontFamily: "'IBM Plex Mono', monospace",
    lineHeight: 1.55,
    maxWidth: "640px",
    margin: "0 auto",
  },

  gridWrap: {
    padding: "clamp(8px, 2vw, 16px) clamp(16px, 5vw, 28px) clamp(48px, 8vw, 72px)",
  },
  grid: {
    maxWidth: "900px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(380px, 100%), 1fr))",
    gap: "1.25rem",
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "0.25rem",
  },
  cardNumber: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "28px",
    fontWeight: 700,
    color: "rgba(0,245,255,0.35)",
    lineHeight: 1,
    letterSpacing: "0.02em",
  },
  cardGlyph: {
    fontSize: "22px",
    color: "#00F5FF",
    opacity: 0.7,
    lineHeight: 1,
  },
  cardName: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "1.05rem",
    fontWeight: 700,
    color: "#E8F8FF",
    letterSpacing: "0.02em",
    marginTop: "0.5rem",
  },
  cardDesc: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "12px",
    color: "#4A7A8A",
    lineHeight: 1.5,
  },
  cardCta: {
    marginTop: "auto",
    paddingTop: "0.75rem",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "12px",
    color: "#00F5FF",
    letterSpacing: "0.08em",
    transition: "color .18s",
  },

  footer: {
    borderTop: "1px solid rgba(0,245,255,0.08)",
    padding: "20px clamp(16px, 5vw, 28px)",
    background: "rgba(2,12,16,0.8)",
  },
  footerInner: {
    maxWidth: "1100px",
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  footerLogo: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "12px",
    fontWeight: 700,
    color: "#00F5FF",
  },
  footerSep: { color: "#1a3a4a", fontSize: "12px" },
  footerDesc: {
    fontSize: "10px",
    color: "#2a5070",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  footerRight: {
    marginLeft: "auto",
    fontSize: "9px",
    color: "#1e3050",
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: "0.1em",
  },
};
