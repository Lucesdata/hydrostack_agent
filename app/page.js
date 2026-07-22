"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import ProcesosTicker from "@/src/components/landing/ProcesosTicker";
import LandingCards from "@/src/components/landing/LandingCards";

/* --- Glifos SVG inline (referencia 1:1 con option-b-water.html) --- */

function GlyphCalc({ size = 36 }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ ...S.glyph, width: size, height: size }}>
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

function GlyphBuild({ size = 36 }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ ...S.glyph, width: size, height: size }}>
      <path d="M20 6 L34 14 L34 28 L20 36 L6 28 L6 14 Z" />
      <path d="M20 6 L20 20 M6 14 L20 20 L34 14" />
      <line x1="11" y1="22" x2="11" y2="30" opacity="0.5" />
      <line x1="15" y1="24" x2="15" y2="32" opacity="0.5" />
      <line x1="19" y1="22" x2="19" y2="34" opacity="0.5" />
    </svg>
  );
}

function GlyphAgent({ size = 36 }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ ...S.glyph, width: size, height: size }}>
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

function GlyphTender({ size = 36 }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ ...S.glyph, width: size, height: size }}>
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
  { n: "01", label: "CALCULADORAS", href: "/calculators", glyph: "calc" },
  { n: "02", label: "BUILD",        href: "/build",        glyph: "build" },
  { n: "03", label: "AGENTE",       href: "/chat",         glyph: "agent" },
  { n: "04", label: "LICITACIONES", href: "/licitaciones", glyph: "tender" },
];

// Franja de herramientas de soporte del cierre: Licitaciones ya es el mensaje
// central de la landing, así que no vuelve a aparecer acá. `GlyphTender`
// queda definido arriba sin uso — no se borra (ver spec 2026-07-13).
const TOOLS_LITE = MODULES.filter((m) => m.glyph !== "tender");

const TOOL_COPY = {
  calc:  { title: "Calculadoras", desc: "Dimensiona fosa séptica, campo de drenaje y mantenimiento." },
  build: { title: "Build",        desc: "Diseño 3D guiado con geolocalización real." },
  agent: { title: "Agente",       desc: "Resuelve dudas técnicas y normativas en lenguaje natural." },
};

const PROBLEM_POINTS = [
  "No sabes si calificas hasta que ya invertiste tiempo en la propuesta.",
  "El pliego tiene decenas de páginas y los requisitos habilitantes se pierden entre ellas.",
  "Un error en el presupuesto descalifica la oferta, sin importar cuánto sabes del proyecto.",
];

/* ── Demo viva del hero: evaluaciones de ejemplo que rotan ──────────────── */
// Datos ficticios pero verosímiles. Reusa el sistema .clr-verdict-* de
// globals.css. El ciclo se detiene si el usuario prefiere reducir movimiento.
const DEMO_EVALS = [
  {
    entidad: "Aguas de Cartagena", valor: "$2.310 M", meta: "PTAR · Cartagena, Bolívar",
    overall: { tone: "warn", label: "Casi calificas — te falta 1 requisito" },
    gates: [
      { tone: "pass", glyph: "✓", label: "Experiencia acreditada" },
      { tone: "pass", glyph: "✓", label: "Capacidad financiera" },
      { tone: "warn", glyph: "!", label: "Clasificación UNSPSC parcial" },
    ],
  },
  {
    entidad: "ESP Pasto", valor: "$1.450 M", meta: "Alcantarillado · Pasto, Nariño",
    overall: { tone: "pass", label: "Calificas — puedes ofertar" },
    gates: [
      { tone: "pass", glyph: "✓", label: "Experiencia acreditada" },
      { tone: "pass", glyph: "✓", label: "Capacidad financiera" },
      { tone: "pass", glyph: "✓", label: "Clasificación UNSPSC" },
    ],
  },
  {
    entidad: "EPM", valor: "$7.120 M", meta: "Acueducto rural · Medellín, Antioquia",
    overall: { tone: "fail", label: "No calificas para este proceso" },
    gates: [
      { tone: "pass", glyph: "✓", label: "Experiencia acreditada" },
      { tone: "fail", glyph: "✕", label: "Capacidad financiera insuficiente" },
      { tone: "pass", glyph: "✓", label: "Clasificación UNSPSC" },
    ],
  },
];

function HeroDemoCard() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % DEMO_EVALS.length), 7000);
    return () => clearInterval(t);
  }, []);

  const ev = DEMO_EVALS[idx];
  const nGates = ev.gates.length;

  return (
    <div className="ls-demo-card ls-demo-enter" aria-label="Ejemplo de evaluación de elegibilidad">
      <div className="ls-demo-head">
        <span className="ls-tag-dot" />
        <span style={{ marginLeft: 8 }}>Evaluación · RUP vs pliego</span>
      </div>

      {/* key={idx} re-monta el bloque en cada ciclo y re-dispara la animación */}
      <div key={idx} className="ls-demo-body">
        <div className="ls-demo-proc">
          <div className="ls-demo-proc-top">
            <strong>{ev.entidad}</strong>
            <span className="ls-demo-valor">{ev.valor}</span>
          </div>
          <span className="ls-demo-meta">{ev.meta}</span>
        </div>

        <div className="clr-verdict">
          <div className="clr-verdict-gates" style={{ flexDirection: "column", gap: 6 }}>
            {ev.gates.map((g, i) => (
              <span
                key={i}
                className={`clr-verdict-gate clr-verdict-gate--${g.tone} ls-demo-gate`}
                style={{ animationDelay: `${0.3 + i * 0.55}s` }}
              >
                <span className="clr-verdict-glyph">{g.glyph}</span>
                {g.label}
              </span>
            ))}
          </div>
          <span
            className={`clr-verdict-overall clr-verdict-overall--${ev.overall.tone} ls-demo-gate`}
            style={{ animationDelay: `${0.3 + nGates * 0.55 + 0.25}s` }}
          >
            <span className="clr-verdict-dot" />
            {ev.overall.label}
          </span>
        </div>
      </div>

      <Link href="/licitaciones" className="ls-demo-link">
        Evalúa un proceso real <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}

const HOW_STEPS = [
  "Explora los procesos activos en agua y saneamiento directamente en HydroStack, sin loguearte en SECOP.",
  "Evalúa tu RUP contra los requisitos habilitantes del proceso que elijas.",
  "Si te falta algo, ves exactamente qué es: experiencia, capacidad financiera, clasificación.",
  "HydroStack decodifica el pliego y te ayuda a estructurar el presupuesto.",
];

const LANDING_CSS = `
.ls-page {
  background: #07111F;
  color: #EAF6FB;
  --ls-ink-900: #EAF6FB;
  --ls-ink-600: #9FC3D6;
  font-family: var(--font-sans);
  cursor: auto;
}
.ls-hero { position: relative; overflow: hidden; padding: clamp(96px, 12vw, 140px) 0 clamp(72px, 10vw, 100px); }
.ls-hero::before {
  content: ""; position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(125,211,252,0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(125,211,252,0.07) 1px, transparent 1px);
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
.ls-cta-btn {
  display: inline-flex; align-items: center; gap: 8px;
  margin-top: 8px; padding: 13px 24px;
  background: var(--accent); color: #fff;
  font-weight: 600; font-size: 14px;
  border-radius: 10px; text-decoration: none;
  transition: transform .18s, box-shadow .18s;
}
.ls-cta-btn:hover { transform: translateY(-2px); box-shadow: var(--shadow-card-hover); }
.ls-tool-link { text-decoration: none; color: inherit; transition: opacity .18s; }
.ls-tool-link:hover { opacity: .8; }
.ls-tool-link:hover .ls-tool-title { color: var(--accent); }
.ls-hero-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 56px;
  align-items: center;
}
@media (min-width: 960px) {
  .ls-hero-grid { grid-template-columns: 1.12fr 0.88fr; }
  /* !important: el font-size llega inline desde S.title y hay que ganarle
     solo cuando el hero es de dos columnas. */
  .ls-title { font-size: clamp(34px, 3.8vw, 48px) !important; }
}
.ls-demo-card {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  box-shadow: 0 24px 48px -32px rgba(3,105,161,0.25);
  max-width: 440px;
  overflow: hidden;
}
.ls-demo-card::before {
  content: ""; position: absolute; top: 0; left: 24px; right: 24px; height: 1px;
  background: linear-gradient(to right, var(--accent), transparent);
}
.ls-demo-head {
  display: inline-flex; align-items: center;
  font-family: var(--font-mono);
  font-size: 10px; color: var(--accent);
  letter-spacing: 0.16em; text-transform: uppercase;
}
.ls-demo-body { display: flex; flex-direction: column; gap: 16px; min-height: 176px; }
.ls-demo-proc { display: flex; flex-direction: column; gap: 3px; }
.ls-demo-proc-top {
  display: flex; align-items: baseline; justify-content: space-between; gap: 12px;
  font-size: 15.5px; color: var(--ink-900);
}
.ls-demo-valor {
  font-family: var(--font-mono);
  font-size: 13px; font-weight: 600; color: var(--accent);
  white-space: nowrap;
}
.ls-demo-meta {
  font-family: var(--font-mono);
  font-size: 11px; color: var(--ink-600); letter-spacing: 0.03em;
}
.ls-demo-gate { animation: ls-demo-in .45s ease both; }
@keyframes ls-demo-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.ls-demo-link {
  font-size: 13.5px; font-weight: 500; color: var(--accent);
  text-decoration: none;
  display: inline-flex; align-items: center; gap: 6px;
  border-top: 1px solid var(--line-soft);
  padding-top: 14px;
}
.ls-demo-link:hover { text-decoration: underline; }
.ls-demo-enter { animation: fadeUp .6s .35s ease both; }

/* Reveals al scroll (IntersectionObserver añade .is-visible) */
.ls-reveal {
  opacity: 0;
  transform: translateY(18px);
  transition: opacity .6s ease, transform .6s ease;
}
.ls-reveal.is-visible { opacity: 1; transform: none; }
/* El CTA del cierre lleva .ls-reveal: sin esta regla, transform:none de
   .is-visible (posterior en el archivo) pisaría el lift del hover. */
.ls-cta-btn.ls-reveal.is-visible:hover { transform: translateY(-2px); }

/* Micro-interacción de glifos */
.ls-tool-link svg { transition: transform .25s ease; }
.ls-tool-link:hover svg { transform: translateY(-3px) scale(1.05); }
.ls-footer-wave {
  position: absolute; top: -1px; left: 0; right: 0; height: 2px;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 2' preserveAspectRatio='none'><path d='M0,1 Q30,0 60,1 T120,1' stroke='%230369A1' stroke-width='0.8' fill='none' opacity='0.4'/></svg>");
  background-repeat: repeat-x; background-size: 120px 2px;
}
`;

export default function LandingPage() {
  // Reveals al scroll. Si no hay IntersectionObserver o el usuario prefiere
  // reducir movimiento, todo se muestra de inmediato.
  useEffect(() => {
    const els = document.querySelectorAll(".ls-reveal");
    if (
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div style={S.page} className="ls-page">
      <style dangerouslySetInnerHTML={{ __html: LANDING_CSS }} />

      <ProcesosTicker />

      <header className="ls-hero">
        <div style={S.container}>
          <div className="ls-hero-grid">
          <div>
          {/* Mini-bloque de marca (logo H + HydroStack + "ES · EN") retirado:
              es redundante con el logo del Navbar (app/layout.js) y el texto
              "ES · EN" quedaría inconsistente sin selector real.
              Ver docs/superpowers/specs/2026-07-13-landing-secop-reposition-design.md.
          <div style={S.mark}>
            <div style={S.markLogo}>H</div>
            <div style={S.markName}>HydroStack</div>
            <div style={S.markBar} />
            <div style={S.markLang}>ES · EN</div>
          </div>
          */}

          <span className="fade-up" style={S.tag}>
            <span className="ls-tag-dot" />
            <span style={{ marginLeft: 8 }}>SECOP · Agua y saneamiento</span>
          </span>

          <h1 className="ls-title fade-up-1" style={S.title}>
            <span style={S.titleLine}>Plataforma de tratamiento de aguas.</span>
            <span style={{ ...S.titleLine, ...S.titleLineDim }}>Contratos con el Estado.</span>
            <span style={{ ...S.titleLine, ...S.titleLineDim }}>Compite, evalúate.</span>
          </h1>

          <p className="fade-up-2" style={S.subhead}>
            HydroStack cruza tu RUP (Registro Único de Proponentes) con los pliegos
            de SECOP y te dice si calificas — antes de invertir una hora en la propuesta.
          </p>

          <Link href="/licitaciones" className="ls-cta-btn fade-up-3">
            Prueba un proceso
          </Link>

          {/* Badges normativos restaurados en versión compacta como señal de
              confianza (critique 2026-07-16). */}
          <div className="fade-up-4" style={S.meta}>
            {[
              { value: "Res. 0330/2017", scope: "CO" },
              { value: "CTE DB-HS 5",    scope: "ES" },
              { value: "ASTM D6391",     scope: "US" },
              { value: "SECOP II",       scope: "datos.gov.co" },
            ].map((m, i) => (
              <div key={i} style={S.metaItem}>
                <strong style={S.metaStrong}>{m.value}</strong> · {m.scope}
              </div>
            ))}
          </div>
          </div>

          <HeroDemoCard />
          </div>
        </div>
      </header>

      <LandingCards />

      <section style={S.problem}>
        <div style={S.container}>
          <h2 style={S.srOnly}>El problema</h2>
          <div style={S.problemGrid}>
            {PROBLEM_POINTS.map((p, i) => (
              <div key={i} className="ls-reveal" style={{ ...S.problemItem, transitionDelay: `${i * 0.09}s` }}>
                <span style={S.problemNum}>{String(i + 1).padStart(2, "0")}</span>
                <p style={S.problemText}>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={S.how}>
        <div style={S.container}>
          <h2 className="ls-reveal" style={S.howLabel}>▸ Cómo funciona</h2>
          <ol style={S.howList}>
            {HOW_STEPS.map((s, i) => (
              <li key={i} className="ls-reveal" style={{ ...S.howItem, transitionDelay: `${i * 0.09}s` }}>
                <span style={S.howNum}>{String(i + 1).padStart(2, "0")}</span>
                <p style={S.howText}>{s}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section style={S.pillars}>
        <div style={S.container}>
          <h2 className="ls-reveal" style={S.pillarsH}>Una vez identificas el proceso, HydroStack te acompaña con:</h2>

          <div style={S.toolsRow}>
            {TOOLS_LITE.map((m, i) => {
              const Glyph = GLYPHS[m.glyph];
              const copy = TOOL_COPY[m.glyph];
              return (
                <Link key={m.n} href={m.href} className="ls-tool-link ls-reveal" style={{ ...S.toolItem, transitionDelay: `${i * 0.09}s` }}>
                  <Glyph size={28} />
                  <span className="ls-tool-title" style={S.toolTitle}>{copy.title}</span>
                  <p style={S.toolDesc}>{copy.desc}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section style={S.closing}>
        <div style={{ ...S.container, ...S.closingInner }}>
          <h2 className="ls-reveal" style={S.closingH}>
            Deja de descubrir tarde que no calificabas.
          </h2>
          <p className="ls-reveal" style={{ ...S.closingSub, transitionDelay: "0.09s" }}>
            Procesos activos de agua y saneamiento, evaluados contra tu RUP.
          </p>
          <Link href="/licitaciones" className="ls-cta-btn ls-reveal" style={{ transitionDelay: "0.18s" }}>
            Prueba un proceso
          </Link>
        </div>
      </section>

      <footer style={S.footer}>
        <div className="ls-footer-wave" />
        <div style={{ ...S.container, ...S.footerInner }}>
          <div style={S.footerLeft}>
            <span style={{ fontWeight: 600, color: "var(--ink-900)" }}>HydroStack</span>
            <span>·</span>
            <span>Plataforma de contratación pública · Agua y saneamiento</span>
          </div>
          <div style={S.footerRight}>
            <span style={S.footerDot} />
            <span>Datos SECOP II · actualización diaria</span>
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
  srOnly: {
    position: "absolute", width: 1, height: 1, padding: 0, margin: -1,
    overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", border: 0,
  },

  /* HERO */
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
    letterSpacing: "-0.028em", lineHeight: 1.18,
    color: "var(--ls-ink-900)", marginBottom: 28, maxWidth: 760,
  },
  titleLine: { display: "block" },
  titleLineDim: { color: "var(--ls-ink-600)" },

  subhead: {
    fontSize: 17, color: "var(--ls-ink-600)", lineHeight: 1.6,
    maxWidth: 560, margin: "0 0 28px",
  },

  meta: {
    display: "flex", flexWrap: "wrap", gap: "6px 22px",
    marginTop: 32,
    fontFamily: "var(--font-mono)",
    fontSize: 11, color: "var(--ls-ink-600)", letterSpacing: ".04em",
  },
  metaItem: { whiteSpace: "nowrap" },
  metaStrong: { color: "var(--ls-ink-900)", fontWeight: 600 },

  /* PROBLEMA */
  problem: { padding: "56px 0", borderTop: "1px solid var(--line-soft)" },
  problemGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))",
    gap: 28,
  },
  problemItem: { display: "flex", flexDirection: "column", gap: 10 },
  problemNum: {
    fontFamily: "var(--font-mono)",
    fontSize: 11, color: "var(--accent)", letterSpacing: ".12em", fontWeight: 600,
  },
  problemText: { fontSize: 15.5, color: "var(--ls-ink-900)", lineHeight: 1.55, margin: 0, maxWidth: 320 },

  /* CÓMO FUNCIONA */
  how: { padding: "56px 0", borderTop: "1px solid var(--line-soft)", background: "var(--surface-alt)" },
  howLabel: {
    fontFamily: "var(--font-mono)",
    fontSize: 11, color: "var(--accent)", letterSpacing: ".15em", textTransform: "uppercase",
    marginBottom: 24,
  },
  howList: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 0 },
  howItem: {
    display: "flex", gap: 18, alignItems: "flex-start",
    padding: "16px 0", borderLeft: "1px dashed var(--line)", paddingLeft: 20,
  },
  howNum: {
    fontFamily: "var(--font-mono)",
    fontSize: 12, color: "var(--accent)", fontWeight: 600, flexShrink: 0, width: 22,
  },
  howText: { fontSize: 15, color: "var(--ink-900)", lineHeight: 1.55, margin: 0, maxWidth: 560 },

  /* HERRAMIENTAS DE SOPORTE */
  pillars: { padding: "clamp(72px, 10vw, 110px) 0", position: "relative" },
  pillarsH: {
    fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em",
    color: "var(--ls-ink-900)", maxWidth: 560, marginBottom: 36,
  },
  toolsRow: { display: "flex", flexWrap: "wrap", gap: 40 },
  toolItem: { display: "flex", flexDirection: "column", gap: 8, minWidth: 200, flex: "1 1 200px" },
  toolTitle: { fontSize: 15, fontWeight: 600, color: "var(--ls-ink-900)" },
  toolDesc: { fontSize: 13, color: "var(--ls-ink-600)", lineHeight: 1.5, margin: 0 },
  glyph: { color: "var(--accent)", flexShrink: 0 },

  /* CIERRE */
  closing: { padding: "clamp(56px, 8vw, 80px) 0", borderTop: "1px solid var(--line-soft)" },
  closingInner: {
    display: "flex", flexDirection: "column", alignItems: "center",
    textAlign: "center", gap: 10,
  },
  closingH: {
    fontSize: "var(--fs-lg)", fontWeight: 700, letterSpacing: "-0.02em",
    color: "var(--ls-ink-900)", margin: 0,
  },
  closingSub: {
    fontSize: 15, color: "var(--ls-ink-600)", margin: "0 0 14px", lineHeight: 1.55,
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
