"use client";
// Reemplaza app/page.js completo con este archivo.
// Requiere: src/components/landing/ProcesosTicker.jsx y LandingCards.jsx (sin cambios).
// Elimina el uso de ScrollFilmBackground/FILM_CLIPS — el fondo cinemático se
// sustituye por el sistema "blueprint" (grilla + diagrama + nivel de agua) de abajo.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ProcesosTicker from "@/src/components/landing/ProcesosTicker";
import LandingCards from "@/src/components/landing/LandingCards";
import PlantaHero from "@/src/components/landing/PlantaHero";
import S2WhyAquaLicita from "@/src/components/landing/S2WhyAquaLicita";
import S3EverythingInOne from "@/src/components/landing/S3EverythingInOne";
import S4Invitation from "@/src/components/landing/S4Invitation";
import S5DarkClosing from "@/src/components/landing/S5DarkClosing";
import S6Footer from "@/src/components/landing/S6Footer";

const PROBLEM_SOLUTION = [
  {
    n: "01",
    icon: "doc-x",
    pain: "No sabes si calificas hasta que ya invertiste tiempo en la propuesta.",
    label: "Pre-evaluación RUP",
    answer:
      "AquaLicita cruza tu RUP con los requisitos habilitantes antes de que escribas una sola página.",
  },
  {
    n: "02",
    icon: "search-stack",
    pain: "El pliego tiene decenas de páginas y los requisitos habilitantes se pierden entre ellas.",
    label: "Decodificación de pliegos",
    answer:
      "El asistente extrae requisitos legales, técnicos y financieros y te los muestra como checklist.",
  },
  {
    n: "03",
    icon: "dimension",
    pain: "Un error en el presupuesto descalifica la oferta, sin importar cuánto sabes del proyecto.",
    label: "Estructuración",
    answer: "Te ayudamos a armar el presupuesto con las cotas y validaciones del sector agua.",
  },
];

const CREDENTIALS = [
  {
    label: "Experiencia",
    title: "11 años en agua y saneamiento",
    body: "Un ingeniero especialista con licencia profesional vigente, no una startup de software.",
  },
  {
    label: "Proyecto",
    title: "3 planes directores en Cali",
    body: "Alcantarillado de tres corregimientos, con modelado hidráulico y gemelo digital.",
  },
  {
    label: "Resultado",
    title: "Un pliego de 100 páginas, en minutos",
    body: "Requisitos legales y técnicos extraídos y citados, listos para verificar.",
  },
];

const INTENT_ROUTES = [
  {
    n: "01",
    title: "Busco contratos",
    desc: "Procesos activos de agua y saneamiento, con verificación de si calificas.",
    href: "/licitaciones",
    cta: "BUSCAR PROCESOS",
  },
  {
    n: "02",
    title: "Tengo un pliego que descifrar",
    desc: "Requisitos habilitantes, técnicos y legales, extraídos como checklist.",
    href: "/pliego",
    cta: "DECODIFICAR PLIEGO",
  },
  {
    n: "03",
    title: "Tengo un problema de agua o vertimientos",
    desc: "Te orientamos paso a paso hacia una solución técnica y cómo contratarla.",
    href: "/soluciones",
    cta: "VER EL CAMINO",
  },
  {
    n: "04",
    title: "Gané un contrato, ¿ahora qué?",
    desc: "Acompañamiento en ejecución: actas, pólizas, informes, liquidación.",
    href: "/asistente/ejecucion",
    cta: "EMPEZAR",
  },
  {
    n: "05",
    title: "Opero un acueducto o una ESP",
    desc: "Dudas de normativa (RAS, Res. 0330, CRA, SUI) con respuestas citadas.",
    href: "/asistente/operacion",
    cta: "CONSULTAR",
  },
];

/* ── CSS: animaciones + reset de la sección (todo lo que no puede ir inline) ── */
const BLUEPRINT_CSS = `
@keyframes bp-scroll { from{transform:translateX(0)} to{transform:translateX(-50%)} }
@keyframes bp-ripple { 0%{transform:translate(-50%,-50%) scale(0.2);opacity:.55} 100%{transform:translate(-50%,-50%) scale(2.6);opacity:0} }
@keyframes bp-flash { 0%{opacity:1;filter:brightness(1.9)} 60%{opacity:.5} 100%{opacity:0} }
.bp-page a { text-decoration: none; cursor: pointer; }

.bp-h1 {
  font-family: var(--font-ibm-plex-sans-condensed), var(--font-inter), sans-serif;
  font-size: clamp(32px, 4.2vw, 46px);
  line-height: 1.15;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #0A1F1C;
  margin: 0 0 20px;
  max-width: 520px;
}

/* Hero rediseño 2026-08-15: mask reveal por línea + subrayado trazado en la palabra clave */
.hero-mask { display: block; overflow: hidden; }
.hero-mask > span {
  display: block;
  transform: translateY(110%);
  animation: hero-riseLine .9s cubic-bezier(.16,1,.3,1) forwards;
}
.hero-mask-1 > span { animation-delay: .2s; }
.hero-mask-2 > span { animation-delay: .32s; }
@keyframes hero-riseLine { to { transform: translateY(0); } }

.hero-draw {
  position: relative;
  display: inline-block;
  color: #0369A1;
}
.hero-draw::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: 0.04em;
  height: 0.08em;
  width: 100%;
  background: #0369A1;
  border-radius: 2px;
  transform: scaleX(0);
  transform-origin: left;
  animation: hero-drawLine .75s cubic-bezier(.16,1,.3,1) 1.3s forwards;
}
@keyframes hero-drawLine { to { transform: scaleX(1); } }

.hero-fade-up {
  opacity: 0;
  transform: translateY(14px);
  animation: hero-fadeUp .7s cubic-bezier(.16,1,.3,1) forwards;
}
@keyframes hero-fadeUp { to { opacity: 1; transform: translateY(0); } }

/* Panel de evaluación: wrapper externo hace la entrada (fade+scale), la
   tarjeta interna hace el hover — separados para que no se pisen las dos
   transiciones de "transform" (ver nota técnica del rediseño). */
.hero-panel-enter {
  opacity: 0;
  transform: translateY(18px) scale(0.98);
  animation: hero-panelIn .8s cubic-bezier(.16,1,.3,1) 1.15s forwards;
}
@keyframes hero-panelIn { to { opacity: 1; transform: translateY(0) scale(1); } }

@media (prefers-reduced-motion: reduce) {
  .hero-mask > span, .hero-fade-up, .hero-panel-enter {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .hero-draw::after { animation: none !important; transform: scaleX(1) !important; }
}

.bp-card { position: relative; overflow: hidden; cursor: pointer; transition: border-color .16s ease, background .16s ease, transform .16s ease; }
.bp-card:hover { border-color: #0369A1; transform: translateY(-2px); }
.bp-card-seal {
  position: absolute; top: -10px; right: 14px; width: 46px; height: 46px; border-radius: 50%;
  border: 1.5px dashed #0369A1; display: flex; align-items: center; justify-content: center;
  background: rgba(252,252,249,0.95); font: 600 7px/1.15 var(--font-jetbrains-mono),monospace; letter-spacing: .05em;
  color: #0369A1; text-align: center; transform: scale(0.5) rotate(-10deg); opacity: 0;
  transition: transform .35s cubic-bezier(.34,1.56,.64,1), opacity .25s ease; pointer-events: none;
}
.bp-card-dark .bp-card-seal { border-color: #7DD3FC; color: #7DD3FC; }
.bp-card:hover .bp-card-seal { transform: scale(1) rotate(-10deg); opacity: 1; }
.bp-card-arrow { display: inline-block; transition: transform .25s cubic-bezier(.22,1,.36,1); }
.bp-card:hover .bp-card-arrow { transform: translateX(4px); }

.bp-cta {
  cursor: pointer;
  clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
  padding: 13px 26px 13px 24px;
  transition: background .16s ease;
}
.bp-cta:hover { background: #0369A1 !important; }
.bp-cta-dark:hover { background: #0A1F1C !important; }
.bp-cta:focus-visible { outline: 2px solid #0369A1; outline-offset: 3px; background: #0369A1; }
.bp-cta-dark:focus-visible { outline: 2px solid #0A1F1C; outline-offset: 3px; background: #0A1F1C; }

.bp-hero-wrap { position: relative; isolation: isolate; overflow: hidden; padding: clamp(56px,7vw,88px) clamp(24px,4vw,48px) 64px; }
.bp-hero-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(420px, 100%), 1fr)); gap: 48px; align-items: start; }
.bp-probhow-wrap { padding: 64px clamp(24px,4vw,48px); border-top: 1px dashed #DADAD2; }
.bp-ps-row { display: grid; grid-template-columns: 1fr 56px 1fr; grid-template-areas: "pain connector answer"; align-items: center; padding: 24px 0; }
.bp-ps-row + .bp-ps-row { border-top: 1px dashed #DADAD2; }
.bp-ps-pain { grid-area: pain; display: flex; align-items: flex-start; justify-content: flex-end; gap: 12px; }
.bp-ps-pain-text { text-align: right; }
.bp-ps-connector { grid-area: connector; display: flex; align-items: center; justify-content: center; }
.bp-ps-answer { grid-area: answer; padding-left: 22px; }
.bp-pillars-wrap { padding: 64px clamp(24px,4vw,48px); border-top: 1px dashed #DADAD2; }
.bp-credentials-strip { display: flex; flex-wrap: wrap; }
@media (max-width: 900px) {
  .bp-credentials-strip > div { flex-basis: 100%; border-left: none !important; padding: 16px 0 !important; border-top: 1px solid #DADAD2; }
  .bp-credentials-strip > div:first-child { border-top: none; padding-top: 0 !important; }
}
.bp-closing-wrap { padding: 56px clamp(24px,4vw,48px); border-top: 1px dashed #DADAD2; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
.bp-footer-wrap { padding: 20px clamp(24px,4vw,48px); border-top: 1px solid #DADAD2; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; font: 11px var(--font-jetbrains-mono),monospace; color: #525B5A; }

@media (max-width: 900px) {
  .bp-hero-grid { gap: 36px; }
  .bp-ps-row { grid-template-columns: 1fr; grid-template-areas: "pain" "answer"; row-gap: 12px; padding: 20px 0; }
  .bp-ps-connector { display: none; }
  .bp-ps-pain { justify-content: flex-start; }
  .bp-ps-pain-text { text-align: left; }
  .bp-ps-answer { padding-left: 0; }
}
@media (max-width: 640px) {
  .bp-hero-wrap { padding-top: 48px; padding-bottom: 40px; }
  .bp-probhow-wrap { padding-top: 48px; padding-bottom: 48px; }
  .bp-pillars-wrap { padding-top: 48px; padding-bottom: 48px; }
  .bp-closing-wrap { padding-top: 40px; padding-bottom: 40px; }
  .bp-footer-wrap { padding: 20px; }
}
`;

/* ── Iconos monoline (plano técnico) para la fila dolor→respuesta ── */
const PAIN_ICON_PATHS = {
  "doc-x": (
    <>
      <path d="M5 2.5h6l3 3v12H5z" />
      <path d="M11 2.5v3h3" />
      <path d="M8 10.5l4 4M12 10.5l-4 4" />
    </>
  ),
  "search-stack": (
    <>
      <rect x="2.3" y="5.2" width="9" height="10.5" />
      <rect x="4.7" y="2.5" width="9" height="10.5" />
      <circle cx="14.6" cy="14.6" r="2.5" />
      <path d="M16.5 16.5l1.6 1.6" />
    </>
  ),
  dimension: (
    <>
      <path d="M2 6.5v7M18 6.5v7" />
      <path d="M2 10h5.5M12.5 10H18" />
      <path d="M8 8.3l1.5 3.4M10.5 8.3L9 11.7" />
    </>
  ),
};

function PainIcon({ type }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="#0369A1"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, marginTop: 1 }}
      aria-hidden="true"
    >
      {PAIN_ICON_PATHS[type]}
    </svg>
  );
}

function ConnectorArrow() {
  return (
    <svg width="56" height="20" viewBox="0 0 56 20" style={{ display: "block" }} aria-hidden="true">
      <line x1="4" y1="10" x2="42" y2="10" stroke="#0369A1" strokeWidth="1" strokeDasharray="4 4" />
      <polyline
        points="37,5 46,10 37,15"
        fill="none"
        stroke="#0369A1"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── Hook: progreso de scroll + revelado por sección para el fondo "blueprint" ── */
function useBlueprintFX() {
  const heroRef = useRef(null);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [parallax, setParallax] = useState(0);
  const [visible, setVisible] = useState({
    hero: false,
  });

  useEffect(() => {
    const handleScroll = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setScrollProgress(Math.min(1, Math.max(0, window.scrollY / max)));
      setParallax(window.scrollY * -0.06);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    handleScroll();

    let io;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            if (e.target === heroRef.current) {
              setVisible((v) => ({ ...v, hero: true }));
            }
            io.unobserve(e.target);
          });
        },
        { threshold: 0.3 }
      );
      if (heroRef.current) io.observe(heroRef.current);
    } else {
      setVisible({ hero: true });
    }
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (io) io.disconnect();
    };
  }, []);

  const p = scrollProgress;
  return {
    refs: { heroRef },
    h1Weight: visible.hero ? 700 : 500,
    gridTransform: `translate3d(0, ${parallax.toFixed(1)}px, 0)`,
    scanTopPct: (p * 100).toFixed(1),
    lineADashoffset: visible.hero ? 0 : 560,
    waterFillOpacity: (0.08 + p * 0.18).toFixed(3),
    depthLabel: (p * 6).toFixed(1) + "m",
  };
}

/* ── Fondo del hero: "infinity cove" — foco de luz cálido con profundidad
   fotográfica de estudio. Solo dentro de .bp-hero-wrap (position:relative +
   isolation:isolate), capas en z-index negativo de atrás hacia adelante. ── */
function HeroCove() {
  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: -3,
          background:
            "radial-gradient(circle at 56% 40%, #ffffff 0%, #FBFAF5 24%, #F0F3F2 44%, #dfe9ee 62%, #c3d8e4 82%, #a9c8db 100%)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 180,
          zIndex: -3,
          background: "linear-gradient(to bottom, rgba(252,252,249,0), #FCFCF9)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-8%",
          right: "-8%",
          top: "40%",
          bottom: 0,
          zIndex: -2,
          background:
            "radial-gradient(ellipse 70% 100% at 50% 0%, rgba(0,0,0,.16) 0%, rgba(0,0,0,.08) 35%, transparent 70%)",
          filter: "blur(50px)",
          opacity: 0.35,
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: -2,
          backgroundImage:
            "linear-gradient(rgba(19,77,116,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(19,77,116,.05) 1px,transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(circle at 55% 45%, #000 0%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(circle at 55% 45%, #000 0%, transparent 78%)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: -1,
          opacity: 0.03,
          mixBlendMode: "multiply",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "180px 180px",
          pointerEvents: "none",
        }}
      />
    </>
  );
}

function BlueprintBackground({ fx }) {
  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: -160,
          left: 0,
          right: 0,
          bottom: -160,
          backgroundImage:
            "linear-gradient(rgba(3,105,161,0.055) 1px,transparent 1px),linear-gradient(90deg,rgba(3,105,161,0.055) 1px,transparent 1px)",
          backgroundSize: "32px 32px",
          pointerEvents: "none",
          zIndex: 0,
          transform: fx.gridTransform,
          willChange: "transform",
        }}
      />

      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          top: `${fx.scanTopPct}vh`,
          bottom: 0,
          pointerEvents: "none",
          zIndex: 0,
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 14'><path d='M0,7 Q30,1 60,7 T120,7' stroke='%230369A1' stroke-width='0.6' fill='none'/></svg>\")",
          backgroundRepeat: "repeat",
          backgroundSize: "120px 14px",
          opacity: fx.waterFillOpacity,
          animation: "bp-scroll 22s linear infinite",
          transition: "top .08s linear",
        }}
      />
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          height: 2,
          background: "linear-gradient(90deg,transparent,rgba(3,105,161,0.35),transparent)",
          pointerEvents: "none",
          zIndex: 0,
          top: `${fx.scanTopPct}vh`,
          transition: "top .08s linear",
        }}
      />
      {[14, 50, 84].map((leftPct, i) => (
        <div
          key={leftPct}
          style={{
            position: "fixed",
            left: `${leftPct}%`,
            top: `${fx.scanTopPct}vh`,
            width: 16,
            height: 16,
            borderRadius: "50%",
            border: "1px solid rgba(3,105,161,0.5)",
            pointerEvents: "none",
            zIndex: 0,
            transition: "top .08s linear",
            animation: `bp-ripple 2.6s ease-out ${i * 0.9}s infinite`,
          }}
        />
      ))}

      <div
        style={{
          position: "fixed",
          left: 10,
          top: 72,
          bottom: 16,
          width: 1,
          background:
            "repeating-linear-gradient(180deg,rgba(3,105,161,0.3) 0 1px,transparent 1px 40px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "fixed",
          left: 6,
          top: `${fx.scanTopPct}vh`,
          pointerEvents: "none",
          zIndex: 0,
          transition: "top .08s linear",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderTop: "4px solid transparent",
            borderBottom: "4px solid transparent",
            borderLeft: "6px solid #0369A1",
          }}
        />
        <span
          style={{
            font: "10px var(--font-jetbrains-mono),monospace",
            color: "#0369A1",
            background: "rgba(252,252,249,0.85)",
            padding: "1px 4px",
            borderRadius: 2,
          }}
        >
          {fx.depthLabel}
        </span>
      </div>
    </>
  );
}

export default function LandingPage() {
  const fx = useBlueprintFX();
  const { heroRef } = fx.refs;

  const [waitlistStatus, setWaitlistStatus] = useState("idle"); // idle | loading | done | error
  const [waitlistError, setWaitlistError] = useState(null);

  async function handleWaitlist() {
    setWaitlistStatus("loading");
    setWaitlistError(null);
    try {
      const res = await fetch("/api/mercado/waitlist", { method: "POST" });
      if (res.status === 401) {
        window.location.href = "/login?next=" + encodeURIComponent("/#asistentes-proyecto");
        return;
      }
      if (!res.ok) {
        setWaitlistStatus("error");
        setWaitlistError("No se pudo guardar tu interés. Intenta de nuevo.");
        return;
      }
      setWaitlistStatus("done");
    } catch {
      setWaitlistStatus("error");
      setWaitlistError("No se pudo guardar tu interés. Intenta de nuevo.");
    }
  }

  return (
    <div
      className="bp-page"
      style={{
        position: "relative",
        background: "#FCFCF9",
        fontFamily: "var(--font-inter), sans-serif",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: BLUEPRINT_CSS }} />
      <BlueprintBackground fx={fx} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1440, margin: "0 auto" }}>
        <ProcesosTicker />

        <div ref={heroRef} className="bp-hero-wrap">
          <HeroCove />
          <div className="bp-hero-grid" style={{ position: "relative" }}>
            <div style={{ position: "relative" }}>
              <div
                style={{
                  display: "inline-block",
                  padding: "8px 14px",
                  background: "rgba(3, 105, 161, 0.08)",
                  color: "#0369A1",
                  borderRadius: 4,
                  marginBottom: 24,
                  font: "11px var(--font-jetbrains-mono),monospace",
                  fontWeight: 600,
                  letterSpacing: ".05em",
                  textTransform: "uppercase",
                }}
              >
                AGUA Y SANEAMIENTO · COLOMBIA
              </div>
              <h1 className="bp-h1">
                <span className="hero-mask hero-mask-1">
                  <span>
                    Todo tu trabajo de <span className="hero-draw">agua</span>,
                  </span>
                </span>
                <span className="hero-mask hero-mask-2">
                  <span>en un solo lugar.</span>
                </span>
              </h1>
              <p
                style={{
                  font: "15px/1.6 var(--font-inter)",
                  color: "#525B5A",
                  marginTop: 20,
                  marginBottom: 30,
                  maxWidth: 520,
                }}
              >
                Desde una duda de norma hasta un pliego de cien páginas. Incluye los procesos de
                agua y saneamiento del SECOP II, con las compuertas de elegibilidad revisadas una
                por una.
              </p>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  marginTop: 30,
                  marginBottom: 20,
                }}
              >
                <Link
                  href="/licitaciones"
                  className="bp-cta bp-cta-dark hero-fade-up"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    background: "#0369A1",
                    color: "#fff",
                    font: "600 13px var(--font-jetbrains-mono),monospace",
                    letterSpacing: ".04em",
                    animationDelay: ".9s",
                  }}
                >
                  [ Prueba un proceso ]
                </Link>
                <button
                  className="hero-fade-up"
                  onClick={() => {}}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    background: "transparent",
                    color: "#0369A1",
                    border: "1px solid #0369A1",
                    padding: "11px 20px",
                    borderRadius: 2,
                    font: "600 13px var(--font-jetbrains-mono),monospace",
                    letterSpacing: ".04em",
                    cursor: "pointer",
                    animationDelay: ".92s",
                  }}
                >
                  [ Ver cómo funciona ]
                </button>
              </div>

              <div
                className="hero-fade-up"
                style={{
                  display: "flex",
                  gap: 24,
                  font: "11px var(--font-jetbrains-mono),monospace",
                  color: "#6B746F",
                  animationDelay: ".95s",
                  marginBottom: 32,
                }}
              >
                <span>✓ Sin cuenta</span>
                <span>✓ Resultado en 2 minutos</span>
              </div>
              {/* Entrada al diagnóstico: para quien todavía no sabe si su
                  empresa está en condiciones de presentarse. */}
              <div
                className="hero-fade-up"
                style={{
                  font: "12px/1.6 var(--font-inter)",
                  color: "#525B5A",
                  animationDelay: ".97s",
                  marginBottom: 32,
                }}
              >
                ¿Aún no sabes si tu empresa puede presentarse?{" "}
                <Link
                  href="/diagnostico"
                  style={{ color: "#0369A1", borderBottom: "1px solid rgba(3,105,161,.35)" }}
                >
                  Descubre qué te falta
                </Link>
              </div>
              <svg
                viewBox="0 0 520 16"
                width="520"
                height="16"
                style={{
                  display: "block",
                  marginTop: 20,
                  overflow: "visible",
                  maxWidth: "100%",
                  marginBottom: 48,
                }}
              >
                <line
                  x1="0"
                  y1="8"
                  x2="520"
                  y2="8"
                  stroke="#0369A1"
                  strokeWidth="1"
                  strokeDasharray="560"
                  strokeDashoffset={fx.lineADashoffset}
                  style={{ transition: "stroke-dashoffset 1.3s cubic-bezier(0.22,1,0.36,1)" }}
                />
                <line x1="0" y1="2" x2="0" y2="14" stroke="#0369A1" strokeWidth="1" />
                <line x1="520" y1="2" x2="520" y2="14" stroke="#0369A1" strokeWidth="1" />
              </svg>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "32px",
                  textAlign: "center",
                }}
              >
                <div>
                  <div
                    style={{
                      font: "600 28px var(--font-jetbrains-mono),monospace",
                      color: "#0369A1",
                      marginBottom: 8,
                    }}
                  >
                    127
                  </div>
                  <div
                    style={{
                      font: "11px var(--font-jetbrains-mono),monospace",
                      color: "#6B746F",
                      textTransform: "uppercase",
                      letterSpacing: ".05em",
                    }}
                  >
                    Procesos nuevos · 7 días
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      font: "600 28px var(--font-jetbrains-mono),monospace",
                      color: "#0369A1",
                      marginBottom: 8,
                    }}
                  >
                    $4.2B
                  </div>
                  <div
                    style={{
                      font: "11px var(--font-jetbrains-mono),monospace",
                      color: "#6B746F",
                      textTransform: "uppercase",
                      letterSpacing: ".05em",
                    }}
                  >
                    En juego · este mes
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      font: "600 28px var(--font-jetbrains-mono),monospace",
                      color: "#0369A1",
                      marginBottom: 8,
                    }}
                  >
                    11
                  </div>
                  <div
                    style={{
                      font: "11px var(--font-jetbrains-mono),monospace",
                      color: "#6B746F",
                      textTransform: "uppercase",
                      letterSpacing: ".05em",
                    }}
                  >
                    Años en agua y saneamiento
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      font: "600 28px var(--font-jetbrains-mono),monospace",
                      color: "#0369A1",
                      marginBottom: 8,
                    }}
                  >
                    24/7
                  </div>
                  <div
                    style={{
                      font: "11px var(--font-jetbrains-mono),monospace",
                      color: "#6B746F",
                      textTransform: "uppercase",
                      letterSpacing: ".05em",
                    }}
                  >
                    Actualización SECOP II
                  </div>
                </div>
              </div>
            </div>

            <PlantaHero />
          </div>
        </div>

        {/* S2 — Por qué AquaLicita */}
        <S2WhyAquaLicita />

        {/* S3 — Todo en un solo lugar */}
        <S3EverythingInOne />

        {/* S4 — Banda de invitación */}
        <S4Invitation />

        {/* S5 — Banda oscura de cierre */}
        <S5DarkClosing />

        {/* S6 — Pie */}
        <S6Footer />

        {/* EXTRA: Sección de INTENT_ROUTES (¿En qué momento estás?) */}
        <div className="bp-pillars-wrap" id="asistentes-proyecto" style={{ paddingTop: 80 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
            <span style={{ width: 8, height: 8, background: "#0369A1" }} />
            <span
              style={{
                font: "11px var(--font-jetbrains-mono),monospace",
                color: "#0369A1",
                letterSpacing: ".12em",
                textTransform: "uppercase",
              }}
            >
              ¿En qué momento estás?
            </span>
          </div>
          <div className="bp-pillars-grid">
            {INTENT_ROUTES.map((c) => (
              <Link
                key={c.n}
                href={c.href}
                className="bp-card"
                style={{
                  border: "1px solid #DADAD2",
                  padding: 22,
                  background: "#fff",
                  color: "#0A1F1C",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  minHeight: 180,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: -1,
                    left: -1,
                    width: 10,
                    height: 10,
                    borderTop: "2px solid #0369A1",
                    borderLeft: "2px solid #0369A1",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    bottom: -1,
                    right: -1,
                    width: 10,
                    height: 10,
                    borderBottom: "2px solid #0369A1",
                    borderRight: "2px solid #0369A1",
                  }}
                />
                <span
                  style={{ font: "10px var(--font-jetbrains-mono),monospace", color: "#6B746F" }}
                >
                  [ {c.n} ]
                </span>
                <div style={{ font: "600 16px/1.3 var(--font-inter)" }}>{c.title}</div>
                <p
                  style={{
                    font: "13px/1.5 var(--font-inter)",
                    color: "#525B5A",
                    flexGrow: 1,
                    margin: 0,
                  }}
                >
                  {c.desc}
                </p>
                <span
                  style={{
                    font: "600 12px var(--font-jetbrains-mono),monospace",
                    color: "#0369A1",
                  }}
                >
                  [ {c.cta} <span className="bp-card-arrow">→</span> ]
                </span>
              </Link>
            ))}

            <div
              aria-live="polite"
              style={{
                padding: 22,
                minHeight: 180,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <span
                style={{
                  font: "10px var(--font-jetbrains-mono),monospace",
                  color: "#6B746F",
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                }}
              >
                Próximamente
              </span>
              <div style={{ font: "500 14px var(--font-inter)", color: "#0A1F1C" }}>
                Vendo o fabrico soluciones
              </div>
              <p style={{ font: "13px/1.5 var(--font-inter)", color: "#525B5A", margin: 0 }}>
                Oportunidades reales de comunidades y ESP que necesitan lo que ofreces.
              </p>
              {waitlistStatus === "done" ? (
                <span
                  style={{
                    font: "600 12px var(--font-jetbrains-mono),monospace",
                    color: "#16A34A",
                  }}
                >
                  [ Te avisaremos ]
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleWaitlist}
                  disabled={waitlistStatus === "loading"}
                  style={{
                    alignSelf: "flex-start",
                    cursor: waitlistStatus === "loading" ? "not-allowed" : "pointer",
                    background: "transparent",
                    border: "1px solid #0369A1",
                    padding: "6px 12px",
                    font: "600 12px var(--font-jetbrains-mono),monospace",
                    color: "#0369A1",
                  }}
                >
                  {waitlistStatus === "loading" ? "[ Guardando… ]" : "[ Avísame cuando abra ]"}
                </button>
              )}
              {waitlistStatus === "error" && waitlistError && (
                <span style={{ font: "11px var(--font-inter)", color: "#DC2626" }}>
                  {waitlistError}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
