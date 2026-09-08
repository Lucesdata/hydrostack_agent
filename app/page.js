"use client";
// Reemplaza app/page.js completo con este archivo.
// Requiere: src/components/landing/ProcesosTicker.jsx (sin cambios).
// Elimina el uso de ScrollFilmBackground/FILM_CLIPS — el fondo cinemático se
// sustituye por el sistema "blueprint" (grilla + diagrama + nivel de agua) de abajo.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ProcesosTicker from "@/src/components/landing/ProcesosTicker";
import PlantaHero from "@/src/components/landing/PlantaHero";
import S2Diagnostico from "@/src/components/landing/S2Diagnostico";
import S3Motor from "@/src/components/landing/S3Motor";
import S4Competidores from "@/src/components/landing/S4Competidores";
import S5Descartes from "@/src/components/landing/S5Descartes";
import S5DarkClosing from "@/src/components/landing/S5DarkClosing";
import S6Footer from "@/src/components/landing/S6Footer";
import { formatConteo, formatCopCompact } from "@/src/components/secop/format";
import { ruta } from "@/src/components/landing/seccionesHome";

// Las rutas de intención que quedan. Sale "Vendo o fabrico soluciones": la
// tarjeta ocupaba un hueco de primer nivel para algo que no existe y que en
// todo este tiempo no capturó a nadie (lista_espera_mercado, 0 filas). El
// endpoint /api/mercado/waitlist y su tabla se quedan intactos por si se
// retoma; solo deja de robar atención en la rejilla.
const INTENT_ROUTES = [
  {
    n: "01",
    title: "Tengo un pliego que descifrar",
    desc: "Requisitos habilitantes, técnicos y legales, extraídos como checklist con su cita.",
    cta: "DECODIFICAR PLIEGO",
    ...ruta("pliego"),
  },
  {
    n: "02",
    title: "Gané un contrato, ¿ahora qué?",
    desc: "Sube el contrato y te devuelve partes, objeto, valor, plazo y las obligaciones y fechas más críticas. Luego pregúntale por actas, pólizas, informes o liquidación.",
    cta: "EMPEZAR",
    ...ruta("asistente-ejecucion"),
  },
  {
    n: "03",
    title: "Opero un acueducto o una ESP",
    desc: "RAS, Res. 0330, CRA y SUI. Cita el artículo en el que se apoya, y te dice cuándo no está seguro en vez de inventarlo.",
    cta: "CONSULTAR",
    ...ruta("asistente-operacion"),
  },
  {
    n: "04",
    title: "Tengo un problema de agua o vertimientos",
    desc: "Del diagnóstico a la alternativa técnica, y de ahí a cómo contratarla.",
    cta: "VER EL CAMINO",
    ...ruta("soluciones"),
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

  // Cifras del sector para el home (procesos vigilados, oferentes históricos,
  // sanciones) y las dos cifras vivas de la fila inferior del hero (procesos
  // nuevos en 7 días, valor en juego este mes). Todas vienen de la misma
  // respuesta de /api/landing-stats — un solo fetch, no uno por bloque. Se
  // quedan en null si el fetch falla: la UI muestra "—" y la frase que las
  // acompaña sigue siendo cierta sin la cifra.
  const [sector, setSector] = useState({
    procesosVigilados: null,
    oferentesHistoricos: null,
    sanciones: null,
  });
  const [heroStats, setHeroStats] = useState({
    nuevos7d: null,
    enJuegoTotalCop: null,
  });

  useEffect(() => {
    let vivo = true;
    fetch("/api/landing-stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!vivo || !d) return;
        if (d.sector) setSector(d.sector);
        setHeroStats({
          nuevos7d: d.nuevos7d ?? null,
          enJuegoTotalCop: d.enJuego?.totalCop ?? null,
        });
      })
      .catch(() => {
        /* se queda en null: la UI muestra "—" y la frase sigue siendo cierta */
      });
    return () => {
      vivo = false;
    };
  }, []);

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
                Vigilamos los procesos de agua y saneamiento que publica el SECOP II, los filtramos
                con las reglas que tú defines y te decimos si calificas — mostrándote cada compuerta
                y por qué, no un veredicto a ciegas.
              </p>

              {/* Cifras del sector: vienen de /api/landing-stats vía el estado
                  `sector`, nunca escritas a mano. En null se ve "—" y la frase
                  que las acompaña sigue siendo cierta sin la cifra. */}
              <div
                style={{
                  display: "flex",
                  gap: 28,
                  flexWrap: "wrap",
                  margin: "28px 0 8px",
                  paddingTop: 20,
                  borderTop: "1px solid #DADAD2",
                }}
              >
                {[
                  {
                    v: formatConteo(sector.procesosVigilados),
                    t: "procesos del sector vigilados",
                  },
                  {
                    v: formatConteo(sector.oferentesHistoricos),
                    t: "registros de quién se presentó",
                  },
                  { v: formatConteo(sector.sanciones), t: "sanciones registradas" },
                ].map((x) => (
                  <div key={x.t}>
                    <div
                      style={{
                        font: "700 22px/1 var(--font-ibm-plex-sans-condensed)",
                        color: "#0A1F1C",
                      }}
                    >
                      {x.v}
                    </div>
                    <div
                      style={{
                        font: "10px var(--font-jetbrains-mono),monospace",
                        color: "#6B746F",
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                        marginTop: 4,
                      }}
                    >
                      {x.t}
                    </div>
                  </div>
                ))}
              </div>

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
                <div className="hero-fade-up" style={{ animationDelay: ".9s" }}>
                  <Link
                    href={ruta("diagnostico").href}
                    className="bp-cta bp-cta-dark"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      background: "#0369A1",
                      color: "#fff",
                      font: "600 13px var(--font-jetbrains-mono),monospace",
                      letterSpacing: ".04em",
                    }}
                  >
                    Ver si estás listo →
                  </Link>
                  <div
                    style={{
                      marginTop: 6,
                      font: "10px var(--font-jetbrains-mono),monospace",
                      color: "#6B746F",
                    }}
                  >
                    sin cuenta · 3 minutos
                  </div>
                </div>
                <Link
                  href={ruta("explorar").href}
                  className="hero-fade-up"
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
                  Explorar procesos
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
                    {formatConteo(heroStats.nuevos7d)}
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
                    {formatCopCompact(heroStats.enJuegoTotalCop)}
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
                    Diaria
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

        {/* S2 — La puerta: diagnóstico de preparación */}
        <S2Diagnostico />

        {/* S3 — El motor: cuatro pasos */}
        <S3Motor procesosVigilados={sector.procesosVigilados} />

        {/* S4 — Quién compite: histórico de oferentes y sanciones */}
        <S4Competidores
          oferentesHistoricos={sector.oferentesHistoricos}
          sanciones={sector.sanciones}
        />

        {/* S5 — Qué se descarta: transparencia del motor de filtros */}
        <S5Descartes />

        {/* Rutas de intención — ¿En qué momento estás? */}
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
                <span
                  style={{
                    font: "10px var(--font-jetbrains-mono),monospace",
                    color: "#6B746F",
                    border: "1px solid #DADAD2",
                    padding: "2px 8px",
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                    alignSelf: "flex-start",
                  }}
                >
                  {c.etiqueta}
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

        {/* S5 — Banda oscura de cierre */}
        <S5DarkClosing />

        {/* S6 — Pie */}
        <S6Footer />
      </div>
    </div>
  );
}
