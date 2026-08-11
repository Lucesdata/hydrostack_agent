"use client";
// Reemplaza app/page.js completo con este archivo.
// Requiere: src/components/landing/ProcesosTicker.jsx y LandingCards.jsx (sin cambios).
// Elimina el uso de ScrollFilmBackground/FILM_CLIPS — el fondo cinemático se
// sustituye por el sistema "blueprint" (grilla + diagrama + nivel de agua) de abajo.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ProcesosTicker from "@/src/components/landing/ProcesosTicker";
import LandingCards from "@/src/components/landing/LandingCards";

const PROBLEM_SOLUTION = [
  {
    n: "01",
    icon: "doc-x",
    pain: "No sabes si calificas hasta que ya invertiste tiempo en la propuesta.",
    label: "Pre-evaluación RUP",
    answer:
      "HydroStack cruza tu RUP con los requisitos habilitantes antes de que escribas una sola página.",
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
    answer:
      "Te ayudamos a armar el presupuesto con las cotas y validaciones del sector agua.",
  },
];

const INTENT_ROUTES = [
  {
    n: "01",
    title: "Quiero ganar contratos",
    desc: "Busca procesos activos de agua y saneamiento y verifica si calificas.",
    href: "/licitaciones",
    cta: "BUSCAR PROCESOS",
  },
  {
    n: "02",
    title: "Necesito estructurar o entender un pliego",
    desc: "Decodifica requisitos habilitantes, técnicos y legales en minutos.",
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
];

const PILLARS = [
  {
    n: "02",
    title: "Planes directores de alcantarillado en Cali",
    desc: "3 corregimientos, modelado hidráulico y gemelo digital.",
    href: "/nosotros",
  },
  {
    n: "03",
    title: "Lee un pliego de 100 páginas en minutos",
    desc: "El asistente extrae los requisitos legales y técnicos automáticamente.",
    href: "/pliego",
  },
  {
    n: "04",
    title: "Un ingeniero especialista, no una startup",
    desc: "11 años en agua y saneamiento, licencia profesional vigente.",
    href: "/nosotros",
    dark: true,
  },
];

/* ── CSS: animaciones + reset de la sección (todo lo que no puede ir inline) ── */
const BLUEPRINT_CSS = `
@keyframes bp-scroll { from{transform:translateX(0)} to{transform:translateX(-50%)} }
@keyframes bp-ripple { 0%{transform:translate(-50%,-50%) scale(0.2);opacity:.55} 100%{transform:translate(-50%,-50%) scale(2.6);opacity:0} }
@keyframes bp-flash { 0%{opacity:1;filter:brightness(1.9)} 60%{opacity:.5} 100%{opacity:0} }
.bp-page { cursor: crosshair; }
.bp-page a { text-decoration: none; cursor: pointer; }

.bp-h1 {
  font-family: var(--font-inter), sans-serif;
  font-size: 46px;
  line-height: 1.15;
  font-weight: 500;
  letter-spacing: -0.02em;
  color: #0A1F1C;
  margin: 0 0 20px;
  max-width: 520px;
  transition: font-variation-settings 1.1s cubic-bezier(.16,1,.3,1);
}

.bp-card { position: relative; overflow: hidden; cursor: pointer; transition: border-color .2s, background .2s; }
.bp-card:hover { border-color: #0369A1; }
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
  transition: background .2s;
}
.bp-cta:hover { background: #0369A1 !important; }
.bp-cta-dark:hover { background: #0A1F1C !important; }
.bp-cta:focus-visible { outline: 2px solid #0369A1; outline-offset: 3px; background: #0369A1; }
.bp-cta-dark:focus-visible { outline: 2px solid #0A1F1C; outline-offset: 3px; background: #0A1F1C; }

.bp-hero-wrap { position: relative; padding: 88px 48px 64px; }
.bp-hero-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 48px; align-items: start; }
.bp-coord-label { position: absolute; top: 88px; right: 48px; font: 10px var(--font-jetbrains-mono),monospace; color: #6B746F; }
.bp-probhow-wrap { padding: 64px 48px; border-top: 1px dashed #DADAD2; }
.bp-ps-row { display: grid; grid-template-columns: 1fr 56px 1fr; grid-template-areas: "pain connector answer"; align-items: center; padding: 24px 0; }
.bp-ps-row + .bp-ps-row { border-top: 1px dashed #DADAD2; }
.bp-ps-pain { grid-area: pain; display: flex; align-items: flex-start; justify-content: flex-end; gap: 12px; }
.bp-ps-pain-text { text-align: right; }
.bp-ps-connector { grid-area: connector; display: flex; align-items: center; justify-content: center; }
.bp-ps-answer { grid-area: answer; padding-left: 22px; }
.bp-pillars-wrap { padding: 64px 48px; border-top: 1px dashed #DADAD2; }
.bp-pillars-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
.bp-closing-wrap { padding: 56px 48px; border-top: 1px dashed #DADAD2; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
.bp-footer-wrap { padding: 20px 48px; border-top: 1px solid #DADAD2; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; font: 11px var(--font-jetbrains-mono),monospace; color: #525B5A; }

@media (max-width: 1100px) {
  .bp-pillars-grid { grid-template-columns: repeat(2,1fr); }
}
@media (max-width: 900px) {
  .bp-hero-grid { grid-template-columns: 1fr; gap: 36px; }
  .bp-ps-row { grid-template-columns: 1fr; grid-template-areas: "pain" "answer"; row-gap: 12px; padding: 20px 0; }
  .bp-ps-connector { display: none; }
  .bp-ps-pain { justify-content: flex-start; }
  .bp-ps-pain-text { text-align: left; }
  .bp-ps-answer { padding-left: 0; }
}
@media (max-width: 640px) {
  .bp-hero-wrap { padding: 48px 20px 40px; }
  .bp-probhow-wrap { padding: 48px 20px; }
  .bp-pillars-wrap { padding: 48px 20px; }
  .bp-pillars-grid { grid-template-columns: 1fr; }
  .bp-closing-wrap { padding: 40px 20px; }
  .bp-footer-wrap { padding: 20px; }
  .bp-coord-label { display: none; }
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
      <line
        x1="4"
        y1="10"
        x2="42"
        y2="10"
        stroke="#0369A1"
        strokeWidth="1"
        strokeDasharray="4 4"
      />
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
  const statsRef = useRef(null);
  const problemRef = useRef(null);
  const howRef = useRef(null);
  const pillarsRef = useRef(null);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [parallax, setParallax] = useState(0);
  const [visible, setVisible] = useState({
    hero: false,
    stats: false,
    problem: false,
    how: false,
    pillars: false,
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

    const targets = [
      [heroRef, "hero"],
      [statsRef, "stats"],
      [problemRef, "problem"],
      [howRef, "how"],
      [pillarsRef, "pillars"],
    ];
    let io;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            const hit = targets.find(([ref]) => ref.current === e.target);
            if (hit) setVisible((v) => ({ ...v, [hit[1]]: true }));
            io.unobserve(e.target);
          });
        },
        { threshold: 0.3 }
      );
      targets.forEach(([ref]) => ref.current && io.observe(ref.current));
    } else {
      setVisible({ hero: true, stats: true, problem: true, how: true, pillars: true });
    }
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (io) io.disconnect();
    };
  }, []);

  const p = scrollProgress;
  return {
    refs: { heroRef, statsRef, problemRef, howRef, pillarsRef },
    h1Weight: visible.hero ? 700 : 500,
    gridTransform: `translate3d(0, ${parallax.toFixed(1)}px, 0)`,
    scanTopPct: (p * 100).toFixed(1),
    lineADashoffset: visible.hero ? 0 : 560,
    lineBScale: visible.stats ? 1 : 0,
    lineCDashoffset: visible.problem ? 0 : 500,
    lineDDashoffset: visible.how ? 0 : 500,
    inletOpacity: visible.hero ? 0.16 : 0.045,
    tankOpacity: visible.stats ? 0.16 : 0.045,
    drainOpacity: visible.problem || visible.how ? 0.16 : 0.045,
    outletOpacity: visible.pillars ? 0.16 : 0.045,
    waterFillOpacity: (0.08 + p * 0.18).toFixed(3),
    depthLabel: (p * 6).toFixed(1) + "m",
    inletFlashStyle: visible.hero
      ? { opacity: 1, animation: "bp-flash 1s ease-out forwards" }
      : { opacity: 0 },
    tankFlashStyle: visible.stats
      ? { opacity: 1, animation: "bp-flash 1s ease-out forwards" }
      : { opacity: 0 },
    drainFlashStyle:
      visible.problem || visible.how
        ? { opacity: 1, animation: "bp-flash 1s ease-out forwards" }
        : { opacity: 0 },
    outletFlashStyle: visible.pillars
      ? { opacity: 1, animation: "bp-flash 1s ease-out forwards" }
      : { opacity: 0 },
  };
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

      <svg
        aria-hidden="true"
        role="presentation"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100vh",
          pointerEvents: "none",
          zIndex: 0,
        }}
        fill="none"
        stroke="#0369A1"
        strokeWidth="1.4"
      >
        <g style={{ opacity: fx.inletOpacity, transition: "opacity 1s ease" }}>
          <line x1="0" y1="120" x2="220" y2="120" />
          <line x1="0" y1="150" x2="180" y2="150" />
          <path d="M180,150 L220,150 L220,120" />
          <circle cx="60" cy="120" r="3" fill="#0369A1" stroke="none" />
          <circle cx="140" cy="150" r="3" fill="#0369A1" stroke="none" />
          <circle r="2.6" fill="#0369A1" stroke="none">
            <animateMotion dur="4.5s" repeatCount="indefinite" path="M0,120 L220,120 L220,140" />
          </circle>
          <circle r="2.2" fill="#0369A1" stroke="none">
            <animateMotion
              dur="4.5s"
              begin="2.2s"
              repeatCount="indefinite"
              path="M0,150 L180,150 L220,150 L220,140"
            />
          </circle>
          <text
            x="20"
            y="105"
            fontFamily="var(--font-jetbrains-mono),monospace"
            fontSize="12"
            fill="#0369A1"
            stroke="none"
          >
            Ø160mm
          </text>
          <path
            d="M0,120 L220,120 L220,140"
            stroke="#7DD3FC"
            strokeWidth="2.4"
            style={fx.inletFlashStyle}
          />
        </g>
        <g style={{ opacity: fx.tankOpacity, transition: "opacity 1s ease" }}>
          <rect x="220" y="140" width="360" height="260" rx="6" />
          <line x1="220" y1="200" x2="580" y2="200" strokeDasharray="4 6" />
          <line x1="220" y1="280" x2="580" y2="280" strokeDasharray="4 6" />
          <line x1="400" y1="140" x2="400" y2="400" strokeDasharray="2 8" strokeWidth="1" />
          <circle r="2.6" fill="#0369A1" stroke="none">
            <animateMotion dur="5s" repeatCount="indefinite" path="M230,200 L570,200" />
          </circle>
          <circle r="2.6" fill="#0369A1" stroke="none">
            <animateMotion
              dur="5s"
              begin="2.5s"
              repeatCount="indefinite"
              path="M570,280 L230,280"
            />
          </circle>
          <text
            x="232"
            y="130"
            fontFamily="var(--font-jetbrains-mono),monospace"
            fontSize="12"
            fill="#0369A1"
            stroke="none"
          >
            H:2.4m
          </text>
          <text
            x="232"
            y="418"
            fontFamily="var(--font-jetbrains-mono),monospace"
            fontSize="12"
            fill="#0369A1"
            stroke="none"
          >
            V:12m³
          </text>
          <rect
            x="220"
            y="140"
            width="360"
            height="260"
            rx="6"
            stroke="#7DD3FC"
            strokeWidth="2"
            style={fx.tankFlashStyle}
          />
        </g>
        <g style={{ opacity: fx.drainOpacity, transition: "opacity 1s ease" }}>
          <line x1="640" y1="430" x2="1080" y2="430" />
          <line x1="640" y1="470" x2="1080" y2="470" />
          <line x1="640" y1="510" x2="1080" y2="510" />
          <line x1="700" y1="410" x2="700" y2="530" strokeWidth="1" strokeDasharray="2 6" />
          <line x1="800" y1="410" x2="800" y2="530" strokeWidth="1" strokeDasharray="2 6" />
          <line x1="900" y1="410" x2="900" y2="530" strokeWidth="1" strokeDasharray="2 6" />
          <line x1="1000" y1="410" x2="1000" y2="530" strokeWidth="1" strokeDasharray="2 6" />
          <circle r="2.4" fill="#0369A1" stroke="none">
            <animateMotion dur="4s" repeatCount="indefinite" path="M650,430 L1070,430" />
          </circle>
          <circle r="2.4" fill="#0369A1" stroke="none">
            <animateMotion
              dur="4s"
              begin="1.3s"
              repeatCount="indefinite"
              path="M650,470 L1070,470"
            />
          </circle>
          <circle r="2.4" fill="#0369A1" stroke="none">
            <animateMotion
              dur="4s"
              begin="2.6s"
              repeatCount="indefinite"
              path="M650,510 L1070,510"
            />
          </circle>
          <text
            x="650"
            y="398"
            fontFamily="var(--font-jetbrains-mono),monospace"
            fontSize="12"
            fill="#0369A1"
            stroke="none"
          >
            L:440mm
          </text>
          <path
            d="M640,430 L1080,430 M640,470 L1080,470 M640,510 L1080,510"
            stroke="#7DD3FC"
            strokeWidth="2.2"
            style={fx.drainFlashStyle}
          />
        </g>
        <g style={{ opacity: fx.outletOpacity, transition: "opacity 1s ease" }}>
          <line x1="1140" y1="600" x2="1140" y2="760" />
          <path d="M1122,742 L1140,764 L1158,742" />
          <circle cx="1140" cy="620" r="3" fill="#0369A1" stroke="none" />
          <circle r="2.6" fill="#0369A1" stroke="none">
            <animateMotion dur="3.5s" repeatCount="indefinite" path="M1140,600 L1140,758" />
          </circle>
          <text
            x="1090"
            y="600"
            fontFamily="var(--font-jetbrains-mono),monospace"
            fontSize="12"
            fill="#0369A1"
            stroke="none"
          >
            Ø200mm
          </text>
          <path
            d="M1140,600 L1140,760"
            stroke="#7DD3FC"
            strokeWidth="2.4"
            style={fx.outletFlashStyle}
          />
        </g>
      </svg>

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
  const { heroRef, statsRef, problemRef, howRef, pillarsRef } = fx.refs;

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
          <span className="bp-coord-label">x:1440 y:0</span>
          <div className="bp-hero-grid">
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                <span style={{ width: 8, height: 8, background: "#0369A1" }} />
                <span
                  style={{
                    font: "11px var(--font-jetbrains-mono),monospace",
                    color: "#0369A1",
                    letterSpacing: ".12em",
                    textTransform: "uppercase",
                  }}
                >
                  Fig. 01 — Elegibilidad SECOP
                </span>
              </div>
              <h1 className="bp-h1" style={{ fontVariationSettings: `'wght' ${fx.h1Weight}` }}>
                Precisión de ingeniería, aplicada a tu oferta.
              </h1>
              <p
                style={{
                  font: "15px/1.6 var(--font-inter)",
                  color: "#525B5A",
                  maxWidth: 460,
                  margin: "0 0 28px",
                }}
              >
                HydroStack cruza tu RUP con los pliegos activos de SECOP en agua y saneamiento —
                cada requisito habilitante, verificado como una cota en un plano.
              </p>
              <Link
                href="/licitaciones"
                className="bp-cta"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#0A1F1C",
                  color: "#fff",
                  font: "600 13px var(--font-jetbrains-mono),monospace",
                  letterSpacing: ".04em",
                }}
              >
                [ Prueba un proceso ]
              </Link>
              <svg
                viewBox="0 0 520 16"
                width="520"
                height="16"
                style={{ display: "block", marginTop: 36, overflow: "visible", maxWidth: "100%" }}
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
            </div>

            <div
              style={{
                position: "relative",
                border: "1px solid #0369A1",
                padding: 22,
                background: "#fff",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: -1,
                  left: -1,
                  width: 12,
                  height: 12,
                  borderTop: "2px solid #0369A1",
                  borderLeft: "2px solid #0369A1",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  top: -1,
                  right: -1,
                  width: 12,
                  height: 12,
                  borderTop: "2px solid #0369A1",
                  borderRight: "2px solid #0369A1",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  bottom: -1,
                  left: -1,
                  width: 12,
                  height: 12,
                  borderBottom: "2px solid #0369A1",
                  borderLeft: "2px solid #0369A1",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  bottom: -1,
                  right: -1,
                  width: 12,
                  height: 12,
                  borderBottom: "2px solid #0369A1",
                  borderRight: "2px solid #0369A1",
                }}
              />
              <div
                style={{
                  font: "10px var(--font-jetbrains-mono),monospace",
                  color: "#0369A1",
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  marginBottom: 14,
                }}
              >
                Evaluación — muestra 001
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  font: "14px var(--font-inter)",
                  color: "#0A1F1C",
                  marginBottom: 16,
                  borderBottom: "1px dashed #DADAD2",
                  paddingBottom: 14,
                }}
              >
                <strong>EPS Nariño</strong>
                <span
                  style={{ fontFamily: "var(--font-jetbrains-mono),monospace", color: "#0369A1" }}
                >
                  $3.850M
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  font: "12px var(--font-jetbrains-mono),monospace",
                  color: "#525B5A",
                }}
              >
                <span>[✓] EXPERIENCIA ................ OK</span>
                <span>[✓] CAPACIDAD_FINANCIERA ........ OK</span>
                <span>[!] UNSPSC ...................... PARCIAL</span>
              </div>
              <div style={{ marginTop: 14 }}>
                <Link
                  href="/licitaciones"
                  style={{ font: "11px var(--font-jetbrains-mono),monospace", color: "#0369A1", letterSpacing: ".04em" }}
                >
                  [ Evalúa tu propio RUP → ]
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="bp-pillars-wrap">
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
              Fig. 02 — ¿Qué necesitas resolver?
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
          </div>
        </div>

        <div className="bp-pillars-wrap" id="asistentes-proyecto">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
            <span style={{ width: 8, height: 8, background: "#0369A1" }} />
            <span style={{ font: "11px var(--font-jetbrains-mono),monospace", color: "#0369A1", letterSpacing: ".12em", textTransform: "uppercase" }}>Fig. 06 — Asistentes de proyecto</span>
          </div>
          <div className="bp-pillars-grid">
            <Link href="/asistente/ejecucion" className="bp-card" style={{ border: "1px solid #DADAD2", padding: 22, background: "#fff", color: "#0A1F1C", display: "flex", flexDirection: "column", gap: 12, minHeight: 180 }}>
              <span style={{ position: "absolute", top: -1, left: -1, width: 10, height: 10, borderTop: "2px solid #0369A1", borderLeft: "2px solid #0369A1" }} />
              <span style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderBottom: "2px solid #0369A1", borderRight: "2px solid #0369A1" }} />
              <span style={{ font: "10px var(--font-jetbrains-mono),monospace", color: "#6B746F" }}>[ 01 ]</span>
              <div style={{ font: "600 16px/1.3 var(--font-inter)" }}>Gané un contrato, ¿ahora qué?</div>
              <p style={{ font: "13px/1.5 var(--font-inter)", color: "#525B5A", flexGrow: 1, margin: 0 }}>Sube tu contrato y te acompañamos en la ejecución: actas, pólizas, informes, liquidación.</p>
              <span style={{ font: "600 12px var(--font-jetbrains-mono),monospace", color: "#0369A1" }}>[ EMPEZAR <span className="bp-card-arrow">→</span> ]</span>
            </Link>

            <Link href="/asistente/operacion" className="bp-card" style={{ border: "1px solid #DADAD2", padding: 22, background: "#fff", color: "#0A1F1C", display: "flex", flexDirection: "column", gap: 12, minHeight: 180 }}>
              <span style={{ position: "absolute", top: -1, left: -1, width: 10, height: 10, borderTop: "2px solid #0369A1", borderLeft: "2px solid #0369A1" }} />
              <span style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderBottom: "2px solid #0369A1", borderRight: "2px solid #0369A1" }} />
              <span style={{ font: "10px var(--font-jetbrains-mono),monospace", color: "#6B746F" }}>[ 02 ]</span>
              <div style={{ font: "600 16px/1.3 var(--font-inter)" }}>Opero un acueducto o una ESP</div>
              <p style={{ font: "13px/1.5 var(--font-inter)", color: "#525B5A", flexGrow: 1, margin: 0 }}>Resuelve dudas de normativa (RAS, Res. 0330, CRA, SUI) con respuestas citadas.</p>
              <span style={{ font: "600 12px var(--font-jetbrains-mono),monospace", color: "#0369A1" }}>[ CONSULTAR <span className="bp-card-arrow">→</span> ]</span>
            </Link>

            <div className="bp-card" aria-live="polite" style={{ position: "relative", border: "1px dashed #DADAD2", padding: 22, background: "#fff", color: "#0A1F1C", display: "flex", flexDirection: "column", gap: 12, minHeight: 180 }}>
              <span style={{ position: "absolute", top: 10, right: 14, font: "9px var(--font-jetbrains-mono),monospace", color: "#6B746F", letterSpacing: ".08em", textTransform: "uppercase" }}>Próximamente</span>
              <span style={{ font: "10px var(--font-jetbrains-mono),monospace", color: "#6B746F" }}>[ 03 ]</span>
              <div style={{ font: "600 16px/1.3 var(--font-inter)" }}>Vendo o fabrico soluciones</div>
              <p style={{ font: "13px/1.5 var(--font-inter)", color: "#525B5A", flexGrow: 1, margin: 0 }}>Pronto: oportunidades reales de comunidades y ESP que necesitan lo que ofreces.</p>
              {waitlistStatus === "done" ? (
                <span style={{ font: "600 12px var(--font-jetbrains-mono),monospace", color: "#16A34A" }}>[ Te avisaremos ]</span>
              ) : (
                <button
                  type="button"
                  onClick={handleWaitlist}
                  disabled={waitlistStatus === "loading"}
                  style={{ alignSelf: "flex-start", cursor: waitlistStatus === "loading" ? "not-allowed" : "pointer", background: "transparent", border: "1px solid #0369A1", padding: "6px 12px", font: "600 12px var(--font-jetbrains-mono),monospace", color: "#0369A1" }}
                >
                  {waitlistStatus === "loading" ? "[ Guardando… ]" : "[ Avísame cuando abra ]"}
                </button>
              )}
              {waitlistStatus === "error" && waitlistError && (
                <span style={{ font: "11px var(--font-inter)", color: "#DC2626" }}>{waitlistError}</span>
              )}
            </div>
          </div>
        </div>

        <div ref={statsRef}>
          <LandingCards />
        </div>

        <div className="bp-probhow-wrap">
          <div
            ref={(el) => {
              problemRef.current = el;
              howRef.current = el;
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <span style={{ width: 8, height: 8, background: "#0369A1" }} />
              <span
                style={{
                  font: "11px var(--font-jetbrains-mono),monospace",
                  color: "#0369A1",
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                }}
              >
                Fig. 03 — Problema y respuesta
              </span>
            </div>
            <svg
              viewBox="0 0 460 8"
              width="460"
              height="8"
              style={{ display: "block", marginBottom: 22, overflow: "visible", maxWidth: "100%" }}
            >
              <line
                x1="0"
                y1="4"
                x2="460"
                y2="4"
                stroke="#0369A1"
                strokeWidth="1"
                strokeDasharray="500"
                strokeDashoffset={fx.lineCDashoffset}
                style={{ transition: "stroke-dashoffset 1.3s cubic-bezier(0.22,1,0.36,1)" }}
              />
            </svg>
            <div>
              {PROBLEM_SOLUTION.map((row) => (
                <div key={row.n} className="bp-ps-row">
                  <div className="bp-ps-pain">
                    <PainIcon type={row.icon} />
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span
                        style={{
                          font: "600 11px var(--font-jetbrains-mono),monospace",
                          color: "#0369A1",
                          flexShrink: 0,
                        }}
                      >
                        [{row.n}]
                      </span>
                      <p
                        className="bp-ps-pain-text"
                        style={{
                          font: "14.5px/1.55 var(--font-inter)",
                          color: "#0A1F1C",
                          margin: 0,
                          maxWidth: 340,
                        }}
                      >
                        {row.pain}
                      </p>
                    </div>
                  </div>
                  <div className="bp-ps-connector">
                    <ConnectorArrow />
                  </div>
                  <div className="bp-ps-answer">
                    <span
                      style={{
                        display: "block",
                        font: "10px var(--font-jetbrains-mono),monospace",
                        color: "#0369A1",
                        letterSpacing: ".1em",
                        textTransform: "uppercase",
                        marginBottom: 6,
                      }}
                    >
                      {row.label}
                    </span>
                    <p
                      style={{
                        font: "13.5px/1.55 var(--font-inter)",
                        color: "#525B5A",
                        margin: 0,
                        maxWidth: 380,
                      }}
                    >
                      {row.answer}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div ref={pillarsRef} className="bp-pillars-wrap">
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
              Fig. 05 — Herramientas de soporte
            </span>
          </div>
          <div className="bp-pillars-grid">
            {PILLARS.map((c) => (
              <Link
                key={c.n}
                href={c.href}
                className={`bp-card${c.dark ? " bp-card-dark" : ""}`}
                style={{
                  border: `1px solid ${c.dark ? "#0A1F1C" : "#DADAD2"}`,
                  padding: 22,
                  background: c.dark ? "#0A1F1C" : "#fff",
                  color: c.dark ? "#fff" : "#0A1F1C",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  minHeight: 200,
                }}
              >
                <span className="bp-card-seal">
                  {c.dark ? (
                    <>
                      11 AÑOS
                      <br />
                      LIC. VIG.
                    </>
                  ) : (
                    <>
                      APROB.
                      <br />
                      RAS-2000
                    </>
                  )}
                </span>
                <span
                  style={{
                    position: "absolute",
                    top: -1,
                    left: -1,
                    width: 10,
                    height: 10,
                    borderTop: `2px solid ${c.dark ? "#7DD3FC" : "#0369A1"}`,
                    borderLeft: `2px solid ${c.dark ? "#7DD3FC" : "#0369A1"}`,
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    bottom: -1,
                    right: -1,
                    width: 10,
                    height: 10,
                    borderBottom: `2px solid ${c.dark ? "#7DD3FC" : "#0369A1"}`,
                    borderRight: `2px solid ${c.dark ? "#7DD3FC" : "#0369A1"}`,
                  }}
                />
                <span
                  style={{
                    font: "10px var(--font-jetbrains-mono),monospace",
                    color: c.dark ? "rgba(255,255,255,0.5)" : "#6B746F",
                  }}
                >
                  [ {c.n} ]
                </span>
                <div style={{ font: "600 16px/1.3 var(--font-inter)" }}>{c.title}</div>
                <p
                  style={{
                    font: "13px/1.5 var(--font-inter)",
                    color: c.dark ? "rgba(255,255,255,0.6)" : "#525B5A",
                    flexGrow: 1,
                    margin: 0,
                  }}
                >
                  {c.desc}
                </p>
                <span
                  style={{
                    font: "600 12px var(--font-jetbrains-mono),monospace",
                    color: c.dark ? "#7DD3FC" : "#0369A1",
                  }}
                >
                  [ VER MÁS <span className="bp-card-arrow">→</span> ]
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="bp-closing-wrap">
          <span style={{ font: "14px var(--font-jetbrains-mono),monospace", color: "#0A1F1C" }}>
            ▸ Deja de descubrir tarde que no calificabas.
          </span>
          <Link
            href="/licitaciones"
            className="bp-cta"
            style={{
              display: "inline-flex",
              background: "#0369A1",
              color: "#fff",
              font: "600 13px var(--font-jetbrains-mono),monospace",
              letterSpacing: ".04em",
            }}
          >
            [ PRUEBA UN PROCESO ]
          </Link>
        </div>

        <div className="bp-footer-wrap">
          <div style={{ display: "flex", gap: 12 }}>
            <strong style={{ color: "#0A1F1C" }}>HydroStack</strong>
            <span>·</span>
            <span>Plataforma de contratación pública</span>
          </div>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16A34A" }} />
            <span>Datos SECOP II · actualización diaria</span>
          </div>
        </div>
      </div>
    </div>
  );
}
