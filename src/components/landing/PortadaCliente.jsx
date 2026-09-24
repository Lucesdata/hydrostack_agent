"use client";
// La portada, como isla de cliente.
//
// Vivía en `app/page.js` hasta el 2026-09-22. Se movió aquí sin tocar su
// contenido para que `app/page.js` pueda ser un componente de SERVIDOR: el mapa
// departamental importa 62 kB de geometría y calcula 33 caminos, y dentro de un
// árbol `"use client"` todo eso viajaría al navegador. Ahora el servidor lo
// dibuja y lo entrega ya pintado por la prop `mapa`, que es el mismo patrón del
// hueco `semaforo` en `FilaProceso`.
//
// Requiere: src/components/landing/ProcesosTicker.jsx (sin cambios).
// El fondo es el sistema "blueprint" (grilla + diagrama + nivel de agua) de abajo.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ProcesosTicker from "@/src/components/landing/ProcesosTicker";
import S2Diagnostico from "@/src/components/landing/S2Diagnostico";
import S3Motor from "@/src/components/landing/S3Motor";
import S5DarkClosing from "@/src/components/landing/S5DarkClosing";
import S7Acceso from "@/src/components/landing/S7Acceso";
import { formatConteo, formatCopCompact } from "@/src/components/secop/format";
import { ETIQUETA_POR_NIVEL, ruta } from "@/src/components/landing/seccionesHome";

// Las rutas de intención que quedan. Sale "Vendo o fabrico soluciones": la
// tarjeta ocupaba un hueco de primer nivel para algo que no existe y que en
// todo este tiempo no capturó a nadie (lista_espera_mercado, 0 filas). El
// endpoint /api/mercado/waitlist y su tabla se quedan intactos por si se
// retoma; solo deja de robar atención en la rejilla.
const INTENT_ROUTES = [
  {
    title: "Tengo un pliego que descifrar",
    desc: "Requisitos habilitantes, técnicos y legales, extraídos como checklist con su cita.",
    cta: "DECODIFICAR PLIEGO",
    ...ruta("pliego"),
  },
  {
    title: "Gané un contrato, ¿ahora qué?",
    desc: "Sube el contrato y te devuelve partes, objeto, valor, plazo y las obligaciones y fechas más críticas. Luego pregúntale por actas, pólizas, informes o liquidación.",
    cta: "REVISAR MI CONTRATO",
    ...ruta("asistente-ejecucion"),
  },
  {
    title: "Opero un acueducto o una ESP",
    desc: "RAS, Res. 0330, CRA y SUI. Cita el artículo en el que se apoya, y te dice cuándo no está seguro en vez de inventarlo.",
    cta: "CONSULTAR LA NORMA",
    ...ruta("asistente-operacion"),
  },
  {
    title: "Tengo un problema de agua o vertimientos",
    desc: "Del diagnóstico a la alternativa técnica, y de ahí a cómo contratarla.",
    cta: "VER MIS ALTERNATIVAS",
    ...ruta("soluciones"),
  },
];

/**
 * ¿Esta tarjeta se puede usar sin cuenta? Se pregunta por la etiqueta contra
 * ETIQUETA_POR_NIVEL y no comparando con el string "sin cuenta" a mano: si
 * mañana la redacción del nivel cambia en seccionesHome.js, esto la sigue.
 */
const esLibre = (etiqueta) => etiqueta === ETIQUETA_POR_NIVEL.anonimo;

/* ── CSS: animaciones + reset de la sección (todo lo que no puede ir inline) ── */
const BLUEPRINT_CSS = `
@keyframes bp-scroll { from{transform:translateX(0)} to{transform:translateX(-50%)} }
@keyframes bp-ripple { 0%{transform:translate(-50%,-50%) scale(0.2);opacity:.55} 100%{transform:translate(-50%,-50%) scale(2.6);opacity:0} }
@keyframes bp-flash { 0%{opacity:1;filter:brightness(1.9)} 60%{opacity:.5} 100%{opacity:0} }
.bp-page a { text-decoration: none; cursor: pointer; }

.bp-h1 {
  font-family: var(--font-ibm-plex-sans-condensed), var(--font-inter), sans-serif;
  font-size: var(--step-display);
  line-height: 1.1;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #0A1F1C;
  margin: 0 0 20px;
  /* 30ch (1036px a 64px de cuerpo) es holgura, no restricción: quien manda de
     verdad es la columna del grid del hero, que a 1440px mide 645px. Se midió.
     El reparto en líneas lo hace text-wrap: balance, no este tope, que solo
     evita que en un contenedor futuro más ancho el titular se estire hasta ser
     ilegible. */
  max-width: min(100%, 30ch);
}

/* El peor caso del titular no es el móvil, es el portátil. --step-display topa
   en 4rem (64px) a partir de ~915px de ancho, y la rejilla del hero parte en
   dos columnas en cuanto caben dos de 420px: o sea que el titular alcanza su
   cuerpo máximo justo cuando su columna es MÁS estrecha. Medido a 1024x900:
   columna de 444px, cinco líneas, 352px de alto y el CTA —la única acción que
   esta portada persigue— cayendo a y=891, fuera del pliegue. A 1366x768 eran
   cuatro líneas y el CTA en y=746, también fuera. El titular de esta rama pasó
   de 41 a 60 caracteres, así que este techo no se notaba antes.

   El cuerpo se ata al ancho hasta 1440px, que es donde la columna llega a
   645px y 64px ya caben en tres líneas. El tope de 4rem hace la unión continua:
   4.4vw da 63.3px a 1439px, así que no hay salto al cruzar a la regla base. */
@media (min-width: 900px) and (max-width: 1439px) {
  .bp-h1 { font-size: clamp(2.4rem, 4.4vw, 4rem); }
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

.bp-regla-plano { display: none; }
.bp-regla-marca { align-items: center; gap: 4px; }

@media (min-width: 768px) {
  .bp-regla-plano { display: block; }
  .bp-regla-marca { display: flex; }
}

.bp-cta {
  cursor: pointer;
  clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
  padding: 13px 26px 13px 24px;
  min-height: 44px;
  transition: background .16s ease;
}
.bp-cta:hover { background: #0369A1 !important; }
.bp-cta-dark:hover { background: #0A1F1C !important; }
.bp-cta:focus-visible { outline: 2px solid #0369A1; outline-offset: 3px; background: #0369A1; }
.bp-cta-dark:focus-visible { outline: 2px solid #0A1F1C; outline-offset: 3px; background: #0A1F1C; }

.bp-hero-cta { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin: 30px 0 20px; }
.bp-hero-cta-nota { margin-top: 6px; font: 10px var(--font-jetbrains-mono),monospace; color: #6B746F; }
/* El subrayado necesita ganarle a \`.bp-page a { text-decoration: none }\` de
   arriba, y una clase sola no basta: hace falta el mismo peso de selector. */
.bp-page a.bp-hero-cta-alt {
  font: 500 13px var(--font-inter);
  color: #525B5A;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.bp-page a.bp-hero-cta-alt:hover { color: #0369A1; }

.bp-hero-wrap { position: relative; isolation: isolate; overflow: hidden; padding: clamp(56px,7vw,88px) var(--gutter) 64px; }
.bp-hero-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(420px, 100%), 1fr)); gap: 48px; align-items: start; }
.bp-hero-mapa { min-width: 0; align-self: center; }
.bp-hero-mapa:empty { display: none; }
/* El mapa tiene proporción fija (420x520), así que sin tope crece con la columna:
   medido a 1440x900, la columna daba 645px y el SVG se iba a 799px de alto, con la
   leyenda y la nota "Según ubicación…" fuera de pantalla. Esa nota no es un pie:
   es la definición de lo que se está viendo. Se limita por ALTO —no por ancho— para
   que el tope valga igual en un portátil de 768 que en un monitor. */
.bp-hero-mapa .clr-mapa { max-width: 460px; margin-inline: auto; }
.bp-hero-mapa .clr-mapa__svg { max-height: min(48vh, 470px); width: auto; margin-inline: auto; }
@media (max-width: 900px) { .bp-hero-mapa { margin-top: 32px; } }
.bp-hero-sin-datos { margin: 12px 0 0; font: 13px/1.6 var(--font-inter), sans-serif; color: var(--text-muted); text-align: center; }
.atlas-map-label line { stroke: var(--ink-600); stroke-width: .8; }
.atlas-map-label circle { fill: var(--accent-deep); stroke: var(--surface); stroke-width: 1; }
.atlas-map-label rect { fill: var(--surface); stroke: var(--ink-300); stroke-width: .6; }
.atlas-map-label text { fill: var(--accent-deep); font: 9px var(--font-inter), sans-serif; }
.atlas-map-label .atlas-map-label-count { font-size: 11px; font-weight: 700; }

/* ── Sección territorial: listado y ficha, bajo el hero. Solo tokens
   existentes. ── */
.terr-wrap { padding: 64px var(--gutter); border-top: 1px dashed #DADAD2; }
.terr-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px 24px; margin-bottom: 28px; }
.terr-kicker { margin: 0 0 8px; font: 600 11px/1.5 var(--font-jetbrains-mono), monospace; letter-spacing: .12em; text-transform: uppercase; color: var(--accent); }
.terr-head h2 { margin: 0; font: 700 clamp(1.5rem, 2.4vw, 2rem)/1.2 var(--font-inter), sans-serif; letter-spacing: -.02em; color: var(--text-primary); }
.terr-total { margin: 0; font: 13px/1.5 var(--font-inter), sans-serif; color: var(--text-muted); }
.terr-total strong { color: var(--accent); font-variant-numeric: tabular-nums; }
.terr-grid { display: grid; grid-template-columns: minmax(260px, 1fr) minmax(300px, 1.2fr); gap: 28px; align-items: start; max-width: 1040px; }
.terr-grid > * { min-width: 0; }
.terr-list { border: 1px solid var(--border); border-radius: 8px; background: var(--surface); padding: 14px 10px 0; }
.terr-list-head { display: flex; justify-content: space-between; align-items: center; margin: 0 6px 12px; }
.terr-list-head h3 { margin: 0; font: 600 13px var(--font-inter), sans-serif; color: var(--text-primary); }
.terr-list-head span { font: 11px var(--font-jetbrains-mono), monospace; color: var(--text-muted); }
.terr-search { display: flex; align-items: center; gap: 8px; padding: 0 10px; border: 1px solid var(--ink-300); border-radius: 6px; margin-bottom: 8px; color: var(--text-muted); }
.terr-search input { width: 100%; min-width: 0; min-height: 42px; border: 0; background: transparent; color: var(--text-primary); font: 13px var(--font-inter), sans-serif; }
.terr-search input::placeholder { color: var(--ink-300); opacity: 1; }
.terr-search input:focus { outline: none; }
.terr-search:focus-within { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.terr-deptos { list-style: none; margin: 0; padding: 0 2px 0 0; max-height: 360px; overflow: auto; scrollbar-width: thin; }
.terr-deptos button { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 10px; width: 100%; min-height: 44px; padding: 10px 8px; text-align: left; background: transparent; border: 0; border-bottom: 1px solid var(--line-soft); border-radius: 4px; color: var(--text-primary); font: 13px/1.4 var(--font-inter), sans-serif; cursor: pointer; }
.terr-deptos button:hover { background: var(--accent-faint); }
.terr-deptos button[aria-pressed='true'] { background: var(--accent-soft); font-weight: 600; }
.terr-deptos button:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: -2px; }
.terr-deptos strong { font-weight: 500; font-variant-numeric: tabular-nums; color: var(--accent); }
.terr-vacio { margin: 0; padding: 12px 6px; font: 13px/1.6 var(--font-inter), sans-serif; color: var(--text-muted); }
.terr-todos { display: flex; justify-content: space-between; align-items: center; min-height: 48px; padding: 10px 6px; font: 600 12px var(--font-jetbrains-mono), monospace; color: var(--accent); }
.terr-ficha { border: 1px solid var(--border); border-radius: 8px; background: var(--surface); overflow: hidden; }
.terr-ficha-banda { padding: 14px 20px; background: var(--accent-deep); color: var(--surface); font: 600 10px/1.6 var(--font-jetbrains-mono), monospace; letter-spacing: .14em; text-transform: uppercase; }
.terr-ficha-cuerpo { padding: 20px; }
.terr-ficha-kicker { margin: 0 0 6px; font: 600 10px var(--font-jetbrains-mono), monospace; letter-spacing: .08em; text-transform: uppercase; color: var(--accent); }
.terr-ficha h3 { margin: 0; font: 700 24px/1.15 var(--font-inter), sans-serif; letter-spacing: -.02em; color: var(--text-primary); overflow-wrap: anywhere; }
.terr-ficha-n { margin: 10px 0 4px; font: 13px var(--font-inter), sans-serif; color: var(--text-primary); }
.terr-ficha-n strong { margin-right: 4px; font: 700 24px var(--font-ibm-plex-sans-condensed), sans-serif; color: var(--accent); font-variant-numeric: tabular-nums; }
.terr-ficha-nota { margin: 0; font: 12px/1.6 var(--font-inter), sans-serif; color: var(--text-muted); }
.terr-ficha-cta { display: flex; justify-content: space-between; align-items: center; gap: 12px; min-height: 48px; margin-top: 18px; padding: 12px 14px; border-radius: 6px; background: var(--accent); color: var(--surface); font: 600 13px var(--font-inter), sans-serif; }
.terr-ficha-cta:hover { background: var(--accent-deep); }
.terr-ficha-cta:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 3px; }
.terr-tipos { margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--border); }
.terr-tipos h4 { margin: 0; font: 600 13px var(--font-inter), sans-serif; color: var(--text-primary); }
.terr-tipos > p { margin: 4px 0 6px; font: 12px/1.5 var(--font-inter), sans-serif; color: var(--text-muted); }
.terr-tipo { display: grid; grid-template-columns: 1fr auto; gap: 6px 8px; min-height: 44px; padding: 10px 0 4px; font: 13px var(--font-inter), sans-serif; color: var(--text-primary); }
.terr-tipo strong { font-weight: 500; color: var(--accent); font-variant-numeric: tabular-nums; }
.terr-tipo:hover span:first-child { text-decoration: underline; }
.terr-tipo-barra { grid-column: 1 / -1; height: 4px; border-radius: 4px; background: var(--surface-alt); overflow: hidden; }
.terr-tipo-barra > span { display: block; height: 100%; border-radius: 4px; background: var(--accent); }
@media (max-width: 760px) {
  .terr-wrap { padding: 48px var(--gutter); }
  .terr-grid { grid-template-columns: minmax(0, 1fr); gap: 24px; }
  .terr-deptos { max-height: 220px; }
}
.bp-probhow-wrap { padding: 64px var(--gutter); border-top: 1px dashed #DADAD2; }
.bp-ps-row { display: grid; grid-template-columns: 1fr 56px 1fr; grid-template-areas: "pain connector answer"; align-items: center; padding: 24px 0; }
.bp-ps-row + .bp-ps-row { border-top: 1px dashed #DADAD2; }
.bp-ps-pain { grid-area: pain; display: flex; align-items: flex-start; justify-content: flex-end; gap: 12px; }
.bp-ps-pain-text { text-align: right; }
.bp-ps-connector { grid-area: connector; display: flex; align-items: center; justify-content: center; }
.bp-ps-answer { grid-area: answer; padding-left: 22px; }
.bp-pillars-wrap { padding: 64px var(--gutter); border-top: 1px dashed #DADAD2; }
.bp-hero-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}
.bp-hero-market { margin-top: 32px; }
.bp-hero-market-title {
  margin: 0 0 12px;
  font: 600 11px/1.5 var(--font-jetbrains-mono), monospace;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--accent);
}
.bp-hero-metric {
  min-width: 0;
  padding: 18px 14px;
  border: 1px solid var(--border);
  border-top: 2px solid var(--accent);
  border-radius: 6px;
  background: var(--surface-elevated);
  display: flex;
  flex-direction: column;
}
.bp-hero-metric dt {
  order: 1;
  margin-top: 10px;
  font: 500 12px/1.5 var(--font-inter), sans-serif;
  color: var(--text-primary);
}
.bp-hero-metric dd {
  margin: 0;
  font: 700 clamp(1.4rem, 2.2vw, 2rem)/1.2 var(--font-ibm-plex-sans-condensed), sans-serif;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
  color: var(--accent);
}
.bp-hero-market-note {
  margin: 12px 0 0;
  font: 12px/1.6 var(--font-inter), sans-serif;
  color: var(--text-muted);
}
@media (max-width: 640px) {
  .bp-hero-metrics { grid-template-columns: 1fr; gap: 8px; }
  .bp-hero-metric { padding: 14px 16px; flex-direction: row; align-items: center; gap: 16px; }
  .bp-hero-metric dt { flex: 1; margin-top: 0; }
  .bp-hero-metric dd { flex: 1; font-size: 1.75rem; }
}
.bp-credentials-strip { display: flex; flex-wrap: wrap; }
@media (max-width: 900px) {
  .bp-credentials-strip > div { flex-basis: 100%; border-left: none !important; padding: 16px 0 !important; border-top: 1px solid #DADAD2; }
  .bp-credentials-strip > div:first-child { border-top: none; padding-top: 0 !important; }
}
.bp-closing-wrap { padding: 56px var(--gutter); border-top: 1px dashed #DADAD2; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
.bp-footer-wrap { padding: 20px var(--gutter); border-top: 1px solid #DADAD2; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; font: 11px var(--font-jetbrains-mono),monospace; color: #525B5A; }


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
  .bp-hero-cta { flex-direction: column; align-items: stretch; gap: 12px; }
  .bp-hero-cta-main { width: 100%; }
  .bp-hero-cta-main .bp-cta { display: flex; width: 100%; justify-content: center; }
  .bp-hero-cta-nota { text-align: center; }
  .bp-page a.bp-hero-cta-alt { justify-content: center; text-align: center; }
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
        className="bp-regla-plano"
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
        className="bp-regla-plano bp-regla-marca"
        style={{
          position: "fixed",
          left: 6,
          top: `${fx.scanTopPct}vh`,
          pointerEvents: "none",
          zIndex: 0,
          transition: "top .08s linear",
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

const normalizar = (texto) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");

/**
 * Listado y ficha del territorio, bajo el hero; el mapa se queda en el hero.
 * Todo sale de los agregados del servidor: `totalAbiertos` en undefined/null
 * significa que la base no respondió, y se dice así en vez de pintar ceros.
 */
function SeccionTerritorial({ departamentos, totalAbiertos, tipos }) {
  const [busqueda, setBusqueda] = useState("");
  const [elegido, setElegido] = useState(null);
  const hayDatos = totalAbiertos != null;
  const departamento = departamentos.find((d) => d.clave === elegido) ?? departamentos[0] ?? null;
  const visibles = departamentos.filter((d) =>
    normalizar(d.label).includes(normalizar(busqueda.trim()))
  );
  const maxTipo = Math.max(1, ...tipos.map((t) => t.n));

  return (
    <section className="terr-wrap" aria-labelledby="terr-titulo">
      <div className="terr-head">
        <div>
          <p className="terr-kicker">Por territorio</p>
          <h2 id="terr-titulo">¿Dónde se está contratando?</h2>
        </div>
        <p className="terr-total">
          {hayDatos ? (
            <>
              <strong>{formatConteo(totalAbiertos)}</strong> procesos abiertos en Colombia
            </>
          ) : (
            "Datos territoriales no disponibles"
          )}
        </p>
      </div>

      <div className="terr-grid">
        <div className="terr-list">
          <div className="terr-list-head">
            <h3>Departamentos</h3>
            <span>{hayDatos ? departamentos.length : "—"}</span>
          </div>
          <label className="terr-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              aria-label="Buscar departamento"
              placeholder="Buscar departamento…"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
            />
          </label>
          <ul className="terr-deptos" aria-label="Departamentos con procesos abiertos">
            {visibles.map((d) => (
              <li key={d.clave}>
                <button
                  type="button"
                  aria-pressed={departamento?.clave === d.clave}
                  aria-controls="terr-ficha"
                  onClick={() => setElegido(d.clave)}
                >
                  <span>{d.label}</span>
                  <strong>{formatConteo(d.n)}</strong>
                </button>
              </li>
            ))}
          </ul>
          {visibles.length === 0 && (
            <p className="terr-vacio" role="status">
              {departamentos.length > 0
                ? "No encontramos ese departamento."
                : hayDatos
                  ? "No hay procesos abiertos por departamento."
                  : "Los conteos se mostrarán cuando estén disponibles."}
            </p>
          )}
          <Link href={ruta("explorar").href} className="terr-todos">
            Ver todos los procesos <span aria-hidden="true">→</span>
          </Link>
        </div>

        <aside className="terr-ficha" id="terr-ficha" aria-label="Resumen del territorio">
          <div className="terr-ficha-banda" aria-hidden="true">
            Agua y territorio
          </div>
          <div className="terr-ficha-cuerpo">
            <div aria-live="polite" aria-atomic="true">
              <p className="terr-ficha-kicker">Territorio seleccionado</p>
              <h3>{departamento?.label ?? "Colombia"}</h3>
              <p className="terr-ficha-n">
                <strong>{formatConteo(departamento?.n ?? null)}</strong> procesos abiertos
              </p>
              <p className="terr-ficha-nota">Según ubicación de la entidad contratante.</p>
            </div>
            {departamento && departamento.n > 0 && (
              <Link
                className="terr-ficha-cta"
                href={`/licitaciones/departamento/${departamento.slug}`}
              >
                Ver procesos de {departamento.label} <span aria-hidden="true">→</span>
              </Link>
            )}
            <div className="terr-tipos">
              {/* Los agregados no cruzan tipo con departamento: el desglose es
                  nacional y lo dice, aunque la ficha muestre un territorio. */}
              <h4>Tipos de proyecto · Colombia</h4>
              <p>Distribución nacional de procesos abiertos</p>
              {tipos.map((tipo) => (
                <Link
                  href={`/licitaciones/tipo/${tipo.slug}`}
                  className="terr-tipo"
                  key={tipo.clave}
                >
                  <span>{tipo.label}</span>
                  <strong>{formatConteo(tipo.n)}</strong>
                  <span className="terr-tipo-barra" aria-hidden="true">
                    <span style={{ width: `${(100 * tipo.n) / maxTipo}%` }} />
                  </span>
                </Link>
              ))}
              {tipos.length === 0 && <p>Distribución no disponible.</p>}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

/**
 * @param {{
 *   mapa?: import("react").ReactNode,
 *   departamentos?: import("@/src/lib/secop/agregados").FilaAgregado[],
 *   totalAbiertos?: number | null,
 *   tipos?: import("@/src/lib/secop/agregados").FilaAgregado[],
 * }} props — `mapa` llega ya renderizado desde el servidor. Es un hueco y no un
 * import: importarlo aquí arrastraría la geometría al bundle del navegador.
 */
export default function LandingPage({
  mapa = null,
  departamentos = [],
  totalAbiertos = null,
  tipos = [],
}) {
  const fx = useBlueprintFX();
  const { heroRef } = fx.refs;

  // Cifras del sector (procesos vigilados, para el CTA, los KPIs y S3Motor) y
  // las dos cifras vivas de los KPIs del hero (nuevos en 7 días, valor en juego
  // este mes). Todas vienen de la misma respuesta de /api/landing-stats — un
  // solo fetch, no uno por bloque. Se quedan en null si el fetch falla: la UI
  // muestra "—" y la frase que las acompaña sigue siendo cierta sin la cifra.
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
            {/* La columna de texto conserva su medida de 645px aunque ahora sea
                hija del grid: sin el tope, el titular se estira a 1338px y el
                reparto en dos líneas de las máscaras se deshace. */}
            <div style={{ position: "relative", maxWidth: 645 }}>
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
                    Explora el mercado de <span className="hero-draw">agua</span>.
                  </span>
                </span>
                <span className="hero-mask hero-mask-2">
                  <span>Entiende cada proceso.</span>
                </span>
              </h1>
              <p
                style={{
                  font: "15px/1.6 var(--font-inter)",
                  color: "#525B5A",
                  marginTop: 20,
                  marginBottom: 30,
                  maxWidth: "65ch",
                }}
              >
                Explora los procesos de agua y saneamiento del SECOP II en Colombia. Encuentra
                oportunidades, consulta su ficha y sigue lo que te importa.
              </p>

              <div className="bp-hero-cta">
                <div className="hero-fade-up bp-hero-cta-main" style={{ animationDelay: ".9s" }}>
                  {(() => {
                    const explorarRuta = ruta("explorar");
                    return (
                      <>
                        <Link
                          href={explorarRuta.href}
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
                          Explorar procesos →
                        </Link>
                        {/* La cifra sale del mismo fetch que el resto; si viene en
                            null la frase se acorta en vez de quedar "<etiqueta> · —
                            procesos del sector", que se lee como un error. La etiqueta
                            se deriva de ruta("explorar") para no desincronizarse si
                            cambia ETIQUETA_POR_NIVEL.anonimo. */}
                        <div className="bp-hero-cta-nota">
                          {sector.procesosVigilados == null
                            ? explorarRuta.etiqueta
                            : `${explorarRuta.etiqueta} · ${formatConteo(sector.procesosVigilados)} procesos del sector`}
                        </div>
                      </>
                    );
                  })()}
                </div>
                <Link
                  href={ruta("diagnostico").href}
                  className="hero-fade-up tap-target bp-hero-cta-alt"
                  style={{ animationDelay: ".92s" }}
                >
                  o mira antes si estás listo · 3 min
                </Link>
              </div>

              <section className="bp-hero-market" aria-labelledby="hero-market-title">
                <h2 id="hero-market-title" className="bp-hero-market-title">
                  El mercado está en movimiento
                </h2>
                {/* Mismo fetch y formatos. No son tres cortes del mismo universo:
                    vigilados incluye el histórico; nuevos y valor son abiertos.
                    Sin dato se conserva la raya, nunca cifras de demostración. */}
                <dl className="bp-hero-metrics">
                  <div className="bp-hero-metric">
                    <dt>Procesos del sector vigilados</dt>
                    <dd>{formatConteo(sector.procesosVigilados)}</dd>
                  </div>
                  <div className="bp-hero-metric">
                    <dt>Nuevos abiertos · 7 días</dt>
                    <dd>{formatConteo(heroStats.nuevos7d)}</dd>
                  </div>
                  <div className="bp-hero-metric">
                    <dt>En juego · este mes · COP</dt>
                    <dd>{formatCopCompact(heroStats.enJuegoTotalCop)}</dd>
                  </div>
                </dl>
                <p className="bp-hero-market-note">
                  Fuente: SECOP II. Vigilados incluye el histórico; nuevos cuenta abiertos en
                  presentación de oferta; en juego suma el precio base de abiertos publicados este
                  mes. — indica un dato no disponible.
                </p>
              </section>
            </div>
            {mapa && (
              <div className="bp-hero-mapa" aria-label="Procesos abiertos por departamento">
                {mapa}
                {totalAbiertos == null && (
                  <p className="bp-hero-sin-datos">
                    El mapa no tiene datos disponibles en este momento.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <SeccionTerritorial
          departamentos={departamentos}
          totalAbiertos={totalAbiertos}
          tipos={tipos}
        />

        {/* Rutas de intención — ¿En qué momento estás?
            Sube justo debajo del hero: es la bifurcación real del visitante y
            estaba enterrada bajo cuatro secciones. */}
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
          <div className="grid-cards">
            {INTENT_ROUTES.map((c) => (
              <Link
                key={c.href}
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
                  style={{
                    font: "10px var(--font-jetbrains-mono),monospace",
                    color: esLibre(c.etiqueta) ? "var(--accent)" : "#6B746F",
                    background: esLibre(c.etiqueta) ? "var(--accent-faint)" : "transparent",
                    border: `1px solid ${esLibre(c.etiqueta) ? "var(--accent)" : "#DADAD2"}`,
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
                  [ {c.cta} ]
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* S3 — El motor: cuatro pasos, el 04 absorbió los descartes */}
        <S3Motor procesosVigilados={sector.procesosVigilados} />

        {/* S2 — Paso previo opcional: diagnóstico de preparación. Baja hasta
            aquí: dejó de ser la puerta de entrada. */}
        <S2Diagnostico />

        {/* S7 — Qué te llevas sin pagar: el modelo de acceso, dicho una vez */}
        <S7Acceso />

        {/* Banda oscura de cierre */}
        <S5DarkClosing />
      </div>
    </div>
  );
}
