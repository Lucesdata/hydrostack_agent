"use client";
import Link from "next/link";
import { useLang } from "@/src/lib/i18n";

/* --- Glifos SVG inline (referencia 1:1 con option-b-water.html) --- */

function GlyphCalc() {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" style={S.glyph}>
      <rect x="3" y="10" width="34" height="22" rx="2" />
      <line x1="20" y1="10" x2="20" y2="32" />
      <line x1="3" y1="18" x2="20" y2="18" strokeDasharray="2 2" opacity="0.5" />
      <line x1="20" y1="22" x2="37" y2="22" strokeDasharray="2 2" opacity="0.5" />
      <path d="M3 6 L8 6 L8 10" />
      <path d="M37 6 L32 6 L32 10" />
      <circle cx="14" cy="14" r="0.8" fill="currentColor" />
      <circle cx="28" cy="14" r="0.8" fill="currentColor" />
    </svg>
  );
}

function GlyphBuild() {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" style={S.glyph}>
      <path d="M20 6 L34 14 L34 28 L20 36 L6 28 L6 14 Z" />
      <path d="M20 6 L20 20 M6 14 L20 20 L34 14" />
      <line x1="11" y1="22" x2="11" y2="30" opacity="0.5" />
      <line x1="15" y1="24" x2="15" y2="32" opacity="0.5" />
      <line x1="19" y1="22" x2="19" y2="34" opacity="0.5" />
    </svg>
  );
}

function GlyphAgent() {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" style={S.glyph}>
      <path d="M6 10 L24 10 L24 24 L14 24 L9 28 L9 24 L6 24 Z" />
      <line x1="10" y1="14" x2="20" y2="14" opacity="0.6" />
      <line x1="10" y1="18" x2="18" y2="18" opacity="0.6" />
      <rect x="22" y="18" width="12" height="14" rx="1" />
      <line x1="25" y1="22" x2="31" y2="22" opacity="0.6" />
      <line x1="25" y1="25" x2="31" y2="25" opacity="0.6" />
      <line x1="25" y1="28" x2="29" y2="28" opacity="0.6" />
    </svg>
  );
}

function GlyphTender() {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" style={S.glyph}>
      <path d="M4 28 L10 22 L16 26 L24 14 L36 14" />
      <circle cx="10" cy="22" r="1.6" fill="currentColor" />
      <circle cx="16" cy="26" r="1.6" fill="currentColor" />
      <circle cx="24" cy="14" r="1.6" fill="currentColor" />
      <path d="M4 32 L36 32" opacity="0.4" />
      <path d="M30 30 L30 14" opacity="0.4" strokeDasharray="2 2" />
    </svg>
  );
}

const GLYPHS = { calc: GlyphCalc, build: GlyphBuild, agent: GlyphAgent, tender: GlyphTender };

const MODULES = [
  {
    n: "01",
    label: "CALCULADORAS",
    href: "/calculators",
    glyph: "calc",
    chipsKey: "m1",
    titleKey: "mod1Title",
    descKey: "mod1Desc",
    ctaKey: "mod1Cta",
    subRoutes: [
      { labelKey: "submod1a", href: "/calculators/geo" },
      { labelKey: "submod1b", href: "/calculators/fosa-septica" },
      { labelKey: "submod1c", href: "/calculators/mantenimiento" },
    ],
  },
  { n: "02", label: "BUILD",        href: "/build",        glyph: "build",  chipsKey: "m2", titleKey: "mod2Title", descKey: "mod2Desc", ctaKey: "mod2Cta", subRoutes: [] },
  { n: "03", label: "AGENTE",       href: "/chat",         glyph: "agent",  chipsKey: "m3", titleKey: "mod3Title", descKey: "mod3Desc", ctaKey: "mod3Cta", subRoutes: [] },
  { n: "04", label: "LICITACIONES", href: "/licitaciones", glyph: "tender", chipsKey: "m4", titleKey: "mod4Title", descKey: "mod4Desc", ctaKey: "mod4Cta", subRoutes: [] },
];

const LANDING_CSS = `
.ls-page { background: var(--bg); color: var(--ink-900); font-family: var(--font-sans); }
.ls-hero { position: relative; overflow: hidden; padding: clamp(96px, 12vw, 140px) 0 clamp(72px, 10vw, 100px); }
.ls-hero::before {
  content: ""; position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(15,118,110,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15,118,110,0.04) 1px, transparent 1px);
  background-size: 48px 48px;
  -webkit-mask-image: radial-gradient(ellipse at top right, rgba(0,0,0,0.6), transparent 65%);
  mask-image: radial-gradient(ellipse at top right, rgba(0,0,0,0.6), transparent 65%);
  pointer-events: none;
}
.ls-tag-dot { position: relative; width: 6px; height: 6px; border-radius: 50%; background: var(--accent); display: inline-block; }
.ls-tag-dot::after {
  content: ""; position: absolute; inset: -3px; border-radius: 50%;
  border: 1px solid var(--accent); opacity: .5;
  animation: ls-pulse 2.4s ease-out infinite;
}
@keyframes ls-pulse { 0% { transform: scale(.8); opacity: .8; } 100% { transform: scale(1.6); opacity: 0; } }
.ls-title em {
  font-style: normal; color: var(--accent); position: relative;
}
.ls-title em::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: -6px; height: 6px;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 6' preserveAspectRatio='none'><path d='M0,3 Q15,0 30,3 T60,3' stroke='%230F766E' stroke-width='1.2' fill='none' opacity='0.55'/></svg>");
  background-repeat: repeat-x; background-size: 60px 6px;
}
.ls-card {
  background: var(--surface); border: 1px solid var(--line); border-radius: 12px;
  padding: 24px; display: flex; flex-direction: column; gap: 14px;
  min-height: 260px; position: relative; overflow: hidden;
  transition: border-color .18s, transform .18s, box-shadow .18s;
}
.ls-card::after {
  content: ""; position: absolute; top: 0; left: 24px; right: 24px; height: 1px;
  background: linear-gradient(to right, var(--accent), transparent);
  opacity: 0; transition: opacity .18s;
  pointer-events: none;
}
.ls-card:hover {
  border-color: rgba(15,118,110,0.33);
  transform: translateY(-3px);
  box-shadow: var(--shadow-card-hover);
}
.ls-card:hover::after { opacity: 1; }
.ls-card:hover .ls-cta-arrow { transform: translateX(4px); }
.ls-cta-arrow { display: inline-block; transition: transform .18s; }
/* Stretched title link covers the whole card via ::before overlay.
   Sub-links / chips sit on top (z-index 2) to remain clickable. */
.ls-card-link {
  text-decoration: none; color: inherit;
  position: relative; z-index: 0;
}
.ls-card-link::before {
  content: ""; position: absolute; inset: 0; z-index: 0;
}
.ls-card-link:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.ls-sub, .ls-card-chips, .ls-card-cta { position: relative; z-index: 1; }
.ls-sub a { color: var(--ink-600); text-decoration: none; }
.ls-sub a:hover { color: var(--accent); }
.ls-footer-wave {
  position: absolute; top: -1px; left: 0; right: 0; height: 2px;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 2' preserveAspectRatio='none'><path d='M0,1 Q30,0 60,1 T120,1' stroke='%230F766E' stroke-width='0.8' fill='none' opacity='0.4'/></svg>");
  background-repeat: repeat-x; background-size: 120px 2px;
}
`;

export default function LandingPage() {
  const { t } = useLang();
  const tl = t.landing;

  return (
    <div style={S.page} className="ls-page">
      <style dangerouslySetInnerHTML={{ __html: LANDING_CSS }} />

      <header className="ls-hero">
        <div style={S.container}>
          <div style={S.mark}>
            <div style={S.markLogo}>H</div>
            <div style={S.markName}>HydroStack</div>
            <div style={S.markBar} />
            <div style={S.markLang}>ES · EN</div>
          </div>

          <span style={S.tag}>
            <span className="ls-tag-dot" />
            <span style={{ marginLeft: 8 }}>{tl.heroTag}</span>
          </span>

          <h1 className="ls-title" style={S.title}>
            {tl.heroTitleA}<em>{tl.heroTitleEm}</em>{tl.heroTitleB}
          </h1>

          <p style={S.lead}>{tl.heroLead}</p>

          <div style={S.meta}>
            {tl.meta.map((m, i) => (
              <div key={i} style={{ ...S.metaItem, ...(i === tl.meta.length - 1 ? S.metaItemLast : null) }}>
                <strong style={S.metaStrong}>{m.value}</strong> · {m.scope}
              </div>
            ))}
          </div>
        </div>
      </header>

      <section style={S.pillars}>
        <div style={S.container}>
          <div style={S.pillarsHead}>
            <div>
              <div style={S.pillarsLabel}>{tl.pillarsLabel}</div>
              <h2 style={S.pillarsH}>{tl.pillarsH}</h2>
            </div>
            <div style={S.pillarsSide}>{tl.pillarsFlow}</div>
          </div>

          <div style={S.grid}>
            {MODULES.map((m) => {
              const Glyph = GLYPHS[m.glyph];
              const chips = tl.chips[m.chipsKey];
              return (
                <article key={m.n} className="ls-card">
                  <div style={S.cardTop}>
                    <span style={S.cardNum}>{m.n} · {m.label}</span>
                    <Glyph />
                  </div>
                  <Link href={m.href} className="ls-card-link" style={S.cardTitle}>
                    {tl[m.titleKey]}
                  </Link>
                  <p style={S.cardDesc}>{tl[m.descKey]}</p>

                  {m.subRoutes.length > 0 && (
                    <div className="ls-sub" style={S.cardSub}>
                      {m.subRoutes.map((s, i) => (
                        <span key={s.href}>
                          {i > 0 && <span style={S.subSep}> · </span>}
                          <Link href={s.href}>{tl[s.labelKey]}</Link>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="ls-card-chips" style={S.chips}>
                    {chips.map((c, i) => <span key={i} style={S.chip}>{c}</span>)}
                  </div>

                  <span className="ls-card-cta" style={S.cardCta}>
                    {tl[m.ctaKey]} <span className="ls-cta-arrow">→</span>
                  </span>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <footer style={S.footer}>
        <div className="ls-footer-wave" />
        <div style={{ ...S.container, ...S.footerInner }}>
          <div style={S.footerLeft}>
            <span style={{ fontWeight: 600, color: "var(--ink-900)" }}>HydroStack</span>
            <span>·</span>
            <span>{tl.footerTagline}</span>
          </div>
          <div style={S.footerRight}>
            <span style={S.footerDot} />
            <span>{tl.footerPhase}</span>
            <span>·</span>
            <span>hydrostack.io</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

const S = {
  page: { minHeight: "100vh", position: "relative", zIndex: 1 },
  container: { maxWidth: 1100, margin: "0 auto", padding: "0 28px", position: "relative", zIndex: 1 },

  /* HERO */
  mark: { display: "flex", alignItems: "center", gap: 10, marginBottom: 28 },
  markLogo: {
    width: 28, height: 28, borderRadius: 7, background: "var(--accent)", color: "white",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 700, fontSize: 13, boxShadow: "var(--shadow-logo)",
  },
  markName: { fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" },
  markBar: { flex: 1, height: 1, background: "linear-gradient(to right, var(--accent-soft), transparent)", maxWidth: 120 },
  markLang: { fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-600)", letterSpacing: ".08em" },

  tag: {
    display: "inline-flex", alignItems: "center",
    fontFamily: "var(--font-mono)",
    fontSize: 11, color: "var(--accent)",
    letterSpacing: "0.18em", textTransform: "uppercase",
    marginBottom: 28, padding: "4px 12px 4px 8px",
    border: "1px solid var(--accent-soft)", borderRadius: 999,
    background: "var(--accent-faint)",
  },

  title: {
    fontSize: "var(--fs-hero)", fontWeight: 700,
    letterSpacing: "-0.028em", lineHeight: 1.04,
    color: "var(--ink-900)", marginBottom: 24, maxWidth: 760,
  },
  lead: { fontSize: 18, color: "var(--ink-600)", maxWidth: 600, lineHeight: 1.55, margin: 0 },

  meta: {
    marginTop: 36, display: "flex", gap: 0, flexWrap: "wrap",
    borderTop: "1px dashed rgba(15,118,110,0.2)",
    paddingTop: 20, maxWidth: 760,
  },
  metaItem: {
    fontFamily: "var(--font-mono)",
    fontSize: 11, color: "var(--ink-600)", letterSpacing: ".04em",
    padding: "4px 18px 4px 0", marginRight: 18,
    borderRight: "1px solid var(--line)",
  },
  metaItemLast: { borderRight: "none", marginRight: 0 },
  metaStrong: { color: "var(--ink-900)", fontWeight: 600 },

  /* PILLARS */
  pillars: { paddingBottom: "clamp(96px, 12vw, 140px)", position: "relative" },
  pillarsHead: {
    display: "flex", alignItems: "flex-end", justifyContent: "space-between",
    gap: 24, flexWrap: "wrap", marginBottom: 32,
  },
  pillarsLabel: {
    fontFamily: "var(--font-mono)",
    fontSize: 11, color: "var(--accent)", letterSpacing: ".15em", textTransform: "uppercase",
  },
  pillarsH: {
    fontSize: 24, fontWeight: 600, letterSpacing: "-0.015em",
    marginTop: 8, color: "var(--ink-900)", maxWidth: 520,
  },
  pillarsSide: {
    fontFamily: "var(--font-mono)",
    fontSize: 11, color: "var(--ink-600)", letterSpacing: ".04em",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(400px, 100%), 1fr))",
    gap: 14,
  },

  /* CARD */
  cardTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  cardNum: {
    fontFamily: "var(--font-mono)",
    fontSize: 11, color: "var(--accent)", letterSpacing: ".12em", fontWeight: 500,
  },
  glyph: { width: 36, height: 36, color: "var(--accent)", flexShrink: 0 },
  cardTitle: { fontSize: 18, fontWeight: 600, letterSpacing: "-0.012em", color: "var(--ink-900)" },
  cardDesc: { fontSize: 13.5, color: "var(--ink-600)", lineHeight: 1.55, flexGrow: 1, margin: 0 },
  cardSub: {
    fontFamily: "var(--font-mono)",
    fontSize: 11, color: "var(--ink-600)", display: "flex", flexWrap: "wrap", alignItems: "center",
  },
  subSep: { color: "var(--line)", margin: "0 4px" },
  chips: { display: "flex", gap: 6, flexWrap: "wrap" },
  chip: {
    fontFamily: "var(--font-mono)",
    fontSize: 10, padding: "3px 8px",
    background: "var(--surface-alt)", border: "1px solid var(--line)", borderRadius: 4,
    color: "var(--ink-600)", letterSpacing: ".03em",
  },
  cardCta: {
    marginTop: 4, fontSize: 13, fontWeight: 500, color: "var(--accent)",
    display: "flex", alignItems: "center", gap: 6,
  },

  /* FOOTER */
  footer: { borderTop: "1px solid var(--line-soft)", padding: "28px 0", background: "var(--surface)", position: "relative" },
  footerInner: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: 12,
    fontFamily: "var(--font-mono)",
    fontSize: 11, color: "var(--ink-600)", letterSpacing: ".04em",
  },
  footerLeft: { display: "flex", gap: 12, alignItems: "center" },
  footerRight: { display: "flex", gap: 14, alignItems: "center" },
  footerDot: {
    width: 6, height: 6, borderRadius: "50%", background: "var(--success)",
    boxShadow: "0 0 0 3px rgba(22,163,74,0.13)",
  },
};
