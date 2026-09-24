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
/* Hero territorial: tema local. No cambia los tokens ni otras rutas. */
.atlas-hero {
  color: var(--atlas-text);
  background: radial-gradient(ellipse at 58% 42%, var(--atlas-hover), transparent 65%), var(--atlas-bg);
  padding: 48px 36px 28px;
  border-bottom: 1px solid var(--atlas-line);
}
.atlas-hero::before {
  content: ''; position: absolute; inset: 0; z-index: -1; opacity: .12; pointer-events: none;
  background-image: linear-gradient(color-mix(in srgb, var(--atlas-cyan) 20%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--atlas-cyan) 20%, transparent) 1px, transparent 1px);
  background-size: 60px 60px; mask-image: radial-gradient(ellipse at center, black, transparent 75%);
}
.atlas-hero .bp-hero-grid { grid-template-columns: minmax(260px, 1fr) minmax(320px, 1.5fr) minmax(250px, .9fr); gap: 28px; align-items: start; }
.atlas-intro, .atlas-territory { min-width: 0; }
.atlas-eyebrow { color: var(--atlas-cyan); font: 600 10px/1.6 var(--font-jetbrains-mono), monospace; letter-spacing: .1em; text-transform: uppercase; margin-bottom: 14px; }
.atlas-hero h1 { font: 700 clamp(1.8rem, 2.65vw, 2.55rem)/1.12 var(--font-inter), sans-serif; letter-spacing: -.04em; color: var(--atlas-text); margin: 0; text-wrap: balance; }
.atlas-hero h1 span { color: var(--atlas-cyan); }
.atlas-description { font-size: 14px; line-height: 1.7; margin: 20px 0 24px; color: var(--atlas-text); }
.atlas-primary { display: inline-flex; align-items: center; justify-content: space-between; gap: 24px; padding: 14px 23px; min-height: 48px; border-radius: 30px; background: var(--atlas-cyan); color: var(--atlas-on-accent); font-size: 13px; font-weight: 700; transition: background .15s; }
.atlas-primary:hover { background: var(--atlas-cta-hover); }
.atlas-primary span { font-size: 22px; line-height: 1; }
.atlas-source { margin: 14px 0 28px; font-size: 11px; color: var(--atlas-muted); }
.atlas-directory { border: 1px solid var(--atlas-line); border-radius: 12px; padding: 16px 12px 0; background: var(--atlas-panel); }
.atlas-directory-heading { display: flex; align-items: center; justify-content: space-between; margin: 0 6px 14px; }
.atlas-directory-heading h2 { color: var(--atlas-cyan); font-size: 13px; font-weight: 600; }
.atlas-directory-heading > span { font: 11px var(--font-jetbrains-mono), monospace; color: var(--atlas-muted); }
.atlas-search { display: flex; align-items: center; gap: 8px; padding: 0 10px; border: 1px solid var(--atlas-control-border); border-radius: 7px; margin: 0 0 10px; color: var(--atlas-cyan); }
.atlas-search input { width: 100%; min-width: 0; min-height: 42px; background: transparent; border: 0; color: var(--atlas-text); font: 12px var(--font-inter), sans-serif; }
.atlas-search input::placeholder { color: var(--atlas-muted); opacity: 1; }
.atlas-departments { list-style: none; margin: 0; padding: 0 4px 0 0; max-height: 294px; overflow: auto; scrollbar-width: thin; scrollbar-color: var(--atlas-control-border) transparent; }
.atlas-departments button { display: grid; grid-template-columns: 9px minmax(0, 1fr) auto 8px; align-items: center; gap: 10px; width: 100%; text-align: left; color: var(--atlas-text); background: transparent; border: 1px solid transparent; border-bottom-color: var(--atlas-line); border-radius: 5px; padding: 11px 8px; min-height: 44px; font: 12px/1.4 var(--font-inter), sans-serif; cursor: pointer; }
.atlas-departments button[aria-pressed='true'] { background: var(--atlas-hover); border-color: var(--atlas-control-border); color: var(--atlas-text); }
.atlas-departments button[aria-pressed='true'] .atlas-dot { background: var(--atlas-selected); box-shadow: 0 0 0 3px color-mix(in srgb, var(--atlas-selected) 20%, transparent); }
.atlas-departments button:hover { background: var(--atlas-hover); }
.atlas-departments strong { font-weight: 500; font-variant-numeric: tabular-nums; color: var(--atlas-cyan); }
.atlas-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--atlas-cyan); }
.atlas-directory-link { display: flex; justify-content: space-between; min-height: 48px; align-items: center; font-size: 11px; color: var(--atlas-cyan); padding: 10px 6px; }
.atlas-hero .bp-hero-mapa { align-self: center; margin-top: 0; min-width: 0; }
.atlas-map-heading { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; color: var(--atlas-muted); font: 10px/1.5 var(--font-jetbrains-mono), monospace; margin-bottom: 20px; }
.atlas-map-key { color: var(--atlas-cyan); }
.atlas-hero .clr-mapa { --mapa-e0: var(--atlas-map-e0); --mapa-e1: var(--atlas-map-e1); --mapa-e2: var(--atlas-map-e2); --mapa-e3: var(--atlas-map-e3); --mapa-e4: var(--atlas-map-e4); max-width: none; gap: 16px; }
.atlas-hero .clr-mapa__svg { width: 100%; max-height: none; height: auto; filter: drop-shadow(0 12px 28px color-mix(in srgb, var(--atlas-night-bg) 35%, transparent)); }
.atlas-hero .clr-mapa__dpto { stroke: var(--atlas-map-stroke-low); stroke-width: .7; }
.atlas-hero .clr-mapa__link:hover .clr-mapa__dpto, .atlas-hero .clr-mapa__link:focus-visible .clr-mapa__dpto { stroke: var(--atlas-cyan); stroke-width: 2; }
.atlas-hero .clr-mapa__leyenda { gap: 8px 12px; }
.atlas-hero .clr-mapa__leyenda li, .atlas-hero .clr-mapa__sin { color: var(--atlas-muted); font-size: 10px; }
.atlas-hero .clr-mapa__nota { color: var(--atlas-text); font-size: 11px; }
.atlas-hero .clr-mapa__recuadro { stroke: var(--atlas-control-border); }
.atlas-hero .clr-mapa__recuadro-txt { fill: var(--atlas-muted); }
.atlas-hero .clr-mapa__swatch { border-color: var(--atlas-map-stroke-low); }
.atlas-map-label line { stroke: var(--atlas-label-border); stroke-width: .8; }
.atlas-map-label circle { fill: var(--atlas-label-text); stroke: var(--atlas-label-bg); stroke-width: 1; }
.atlas-map-label rect { fill: var(--atlas-label-bg); stroke: var(--atlas-label-border); stroke-width: .6; }
.atlas-map-label text { fill: var(--atlas-label-text); font: 8px var(--font-inter), sans-serif; }
.atlas-map-label .atlas-map-label-count { font-size: 11px; font-weight: 700; }
.atlas-map-unavailable, .atlas-empty { color: var(--atlas-muted); font-size: 12px; line-height: 1.6; padding: 12px 4px; }
.atlas-territory { margin-top: 32px; border-radius: 12px; overflow: hidden; background: var(--surface); color: var(--text-primary); box-shadow: 0 20px 60px color-mix(in srgb, var(--atlas-night-bg) 25%, transparent); border: 1px solid var(--border); }
.atlas-territory-banner { position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: center; min-height: 110px; padding: 24px; background: var(--accent-deep); color: var(--surface); font: 600 10px/1.8 var(--font-jetbrains-mono), monospace; letter-spacing: .14em; }
.atlas-territory-banner i { position: absolute; width: 220px; height: 220px; border: 1px solid color-mix(in srgb, var(--surface) 30%, transparent); border-radius: 45%; right: -55px; top: -85px; transform: rotate(25deg); }
.atlas-territory-banner i:nth-of-type(2) { right: -80px; top: -60px; }
.atlas-territory-banner i:nth-of-type(3) { right: -105px; top: -35px; }
.atlas-territory-body { padding: 22px; }
.atlas-card-eyebrow { color: var(--accent); font-size: 10px; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 8px; }
.atlas-territory h2 { font: 700 25px/1.15 var(--font-inter), sans-serif; letter-spacing: -.035em; overflow-wrap: anywhere; }
.atlas-territory-count { font-size: 12px; color: var(--accent); margin: 12px 0 6px; }
.atlas-territory-count strong { font-size: 22px; margin-right: 4px; font-variant-numeric: tabular-nums; }
.atlas-territory-caption { font-size: 11px; line-height: 1.6; color: var(--text-muted); }
.atlas-territory-cta { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: var(--surface); background: var(--accent-deep); border-radius: 7px; padding: 14px; min-height: 48px; margin-top: 20px; font-size: 12px; line-height: 1.5; }
.atlas-territory-cta:hover { background: var(--accent); }
.atlas-types { border-top: 1px solid var(--border); margin-top: 24px; padding-top: 20px; }
.atlas-types h3 { font-size: 12px; }
.atlas-types > p { font-size: 10px; color: var(--text-muted); line-height: 1.6; margin-top: 5px; }
.atlas-type { display: grid; grid-template-columns: 1fr auto; gap: 8px; font-size: 11px; color: var(--text-primary); padding: 12px 0 4px; min-height: 44px; }
.atlas-type strong { font-weight: 500; color: var(--accent); }
.atlas-type-track { grid-column: 1 / -1; height: 4px; border-radius: 4px; background: var(--surface-alt); overflow: hidden; }
.atlas-type-track > span { display: block; height: 100%; background: var(--accent); border-radius: 4px; }
.atlas-card-foot { margin-top: 22px; border-top: 1px solid var(--border); padding-top: 16px; font-size: 11px; line-height: 1.7; color: var(--text-muted); }
.atlas-empty-light { color: var(--text-muted); font-size: 12px; line-height: 1.6; margin-top: 16px; }
.atlas-market { display: grid; grid-template-columns: .8fr 2fr; gap: 18px 36px; align-items: center; margin-top: 36px; padding-top: 24px; border-top: 1px solid var(--atlas-line); }
.atlas-market h2 { color: var(--atlas-cyan); font: 500 11px/1.6 var(--font-jetbrains-mono), monospace; letter-spacing: .08em; text-transform: uppercase; }
.atlas-market > div p { margin-top: 6px; color: var(--atlas-muted); font-size: 11px; }
.atlas-kpis { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; margin: 0; }
.atlas-kpis > div { display: flex; flex-direction: column; padding-left: 24px; border-left: 1px solid var(--atlas-line); min-width: 0; }
.atlas-kpis dt { order: 1; font-size: 11px; line-height: 1.6; color: var(--atlas-muted); margin-top: 4px; }
.atlas-kpis dd { margin: 0; font: 600 clamp(1.5rem, 2vw, 2rem)/1.2 var(--font-ibm-plex-sans-condensed), sans-serif; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.atlas-market-note { grid-column: 1 / -1; color: var(--atlas-muted); font-size: 10px; line-height: 1.7; }
.atlas-hero a:focus-visible, .atlas-hero button:focus-visible, .atlas-hero input:focus-visible { outline: 2px solid var(--atlas-cyan); outline-offset: 3px; }
.atlas-territory a:focus-visible { outline-color: var(--accent); }
@media (max-width: 1150px) {
  .atlas-hero { padding: 36px 28px 28px; }
  .atlas-hero .bp-hero-grid { grid-template-columns: minmax(260px, 1fr) minmax(320px, 1.4fr); }
  .atlas-territory { grid-column: 1 / -1; margin: 0; display: grid; grid-template-columns: 180px 1fr; }
  .atlas-territory-body { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 24px; }
  .atlas-types { grid-column: 2; grid-row: 1 / 4; margin: 0; padding: 0 0 0 24px; border-top: 0; border-left: 1px solid var(--border); }
  .atlas-territory-cta, .atlas-card-foot { margin: 0; }
}
@media (max-width: 700px) {
  .atlas-hero { padding: 32px 20px 24px; }
  .atlas-hero .bp-hero-grid { grid-template-columns: minmax(0, 1fr); gap: 28px; }
  .atlas-hero h1 { max-width: 540px; font-size: clamp(2rem, 7vw, 2.7rem); }
  .atlas-description { max-width: 48ch; }
  .atlas-departments { max-height: 176px; }
  .atlas-hero .bp-hero-mapa { width: 100%; max-width: 480px; justify-self: center; }
  .atlas-territory { display: block; }
  .atlas-territory-banner { min-height: 80px; }
  .atlas-territory-body { display: block; }
  .atlas-territory-cta { margin-top: 18px; }
  .atlas-types { border-left: 0; border-top: 1px solid var(--border); padding: 20px 0 0; margin-top: 24px; }
  .atlas-card-foot { margin-top: 20px; }
  .atlas-market { grid-template-columns: 1fr; gap: 20px; }
  .atlas-kpis { gap: 12px; }
  .atlas-kpis > div { padding-left: 12px; }
  .atlas-kpis > div:first-child { border: 0; padding: 0; }
  .atlas-kpis dt { font-size: 10px; }
}
@media (prefers-reduced-motion: reduce) {
  .atlas-hero *, .atlas-hero *::before, .atlas-hero *::after { animation: none !important; transition: none !important; }
}

.atlas-hero .clr-mapa__dpto--e2, .atlas-hero .clr-mapa__dpto--e3, .atlas-hero .clr-mapa__dpto--e4 { stroke: var(--atlas-map-stroke-high); }
.atlas-theme { min-height: 44px; padding: 8px 12px; border: 1px solid var(--atlas-control-border); border-radius: 6px; background: var(--atlas-panel); color: var(--atlas-text); font: 11px var(--font-inter), sans-serif; cursor: pointer; }
.atlas-theme:hover { background: var(--atlas-hover); }
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

/**
 * @param {{ mapa?: import("react").ReactNode, departamentos?: import("@/src/lib/secop/agregados").FilaAgregado[], totalAbiertos?: number | null, tipos?: import("@/src/lib/secop/agregados").FilaAgregado[] }} props — `mapa` llega ya
 * renderizado desde el servidor. Es un hueco y no un import: importarlo aquí
 * arrastraría la geometría al bundle del navegador.
 */
export default function LandingPage({
  mapa = null,
  departamentos = [],
  totalAbiertos = null,
  tipos = [],
}) {
  const fx = useBlueprintFX();
  const { heroRef } = fx.refs;
  const [busqueda, setBusqueda] = useState("");
  const [tema, setTema] = useState("dark");
  const [departamentoElegido, setDepartamentoElegido] = useState(null);
  const departamento =
    departamentos.find((d) => d.clave === departamentoElegido) ?? departamentos[0] ?? null;
  const normalizar = (texto) =>
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es");
  const visibles = departamentos.filter((d) =>
    normalizar(d.label).includes(normalizar(busqueda.trim()))
  );
  const maxTipo = Math.max(1, ...tipos.map((t) => t.n));
  const codigoSeleccionado = /^\d{2}$/.test(departamento?.clave ?? "") ? departamento.clave : "";

  function mostrarDepartamento(event) {
    const enlace = event.target.closest?.("a[data-departamento]");
    if (enlace) setDepartamentoElegido(enlace.dataset.departamento);
  }

  // El mapa y el conteo de abiertos llegan de los agregados del servidor.
  // El fetch existente aporta a los KPIs nuevos7d y enJuegoTotalCop; sector
  // conserva procesosVigilados para S3Motor. Las métricas ausentes quedan en
  // null y se presentan como «—», sin sustituirlas por ceros o datos de demo.
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

        <section
          ref={heroRef}
          className="bp-hero-wrap atlas-hero"
          data-theme={tema}
          aria-labelledby="atlas-title"
        >
          {codigoSeleccionado && (
            <style>{`.atlas-hero .clr-mapa__link[data-departamento="${codigoSeleccionado}"] .clr-mapa__dpto { fill: var(--atlas-selected); stroke: var(--atlas-selected-stroke); stroke-width: 1.6; }`}</style>
          )}
          <div className="bp-hero-grid">
            <div className="atlas-intro">
              <p className="atlas-eyebrow">Inteligencia de contratación pública</p>
              <h1 id="atlas-title">
                Explora el mercado de agua y saneamiento de <span>Colombia.</span>
              </h1>
              <p className="atlas-description">
                Descubre dónde están los procesos, qué se está contratando y encuentra oportunidades
                en tu territorio.
              </p>
              <Link href={ruta("explorar").href} className="atlas-primary">
                Explorar procesos <span aria-hidden="true">→</span>
              </Link>
              <p className="atlas-source">Datos SECOP II · {ruta("explorar").etiqueta}</p>

              <div className="atlas-directory">
                <div className="atlas-directory-heading">
                  <h2>Departamentos</h2>
                  <span>{totalAbiertos == null ? "—" : departamentos.length}</span>
                </div>
                <label className="atlas-search">
                  <span aria-hidden="true">⌕</span>
                  <input
                    type="search"
                    aria-label="Buscar departamento"
                    placeholder="Buscar departamento…"
                    value={busqueda}
                    onChange={(event) => setBusqueda(event.target.value)}
                  />
                </label>
                <ul className="atlas-departments" aria-label="Departamentos con procesos abiertos">
                  {visibles.map((d) => (
                    <li key={d.clave}>
                      <button
                        type="button"
                        aria-pressed={departamento?.clave === d.clave}
                        onClick={() => setDepartamentoElegido(d.clave)}
                        aria-controls="atlas-territory"
                      >
                        <span className="atlas-dot" aria-hidden="true" />
                        <span>{d.label}</span>
                        <strong>{formatConteo(d.n)}</strong>
                        <span aria-hidden="true">›</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {visibles.length === 0 && (
                  <p className="atlas-empty" role="status">
                    {departamentos.length > 0
                      ? "No encontramos ese departamento."
                      : totalAbiertos == null
                        ? "Datos territoriales no disponibles"
                        : "No hay procesos abiertos por departamento"}
                  </p>
                )}
                <Link href={ruta("explorar").href} className="atlas-directory-link">
                  Ver todos los procesos <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>

            <div
              className="bp-hero-mapa"
              aria-label="Procesos abiertos por departamento"
              onMouseOver={mostrarDepartamento}
              onFocus={mostrarDepartamento}
            >
              <div className="atlas-map-heading">
                <span>Colombia · por departamento</span>
                <button
                  type="button"
                  className="atlas-theme"
                  onClick={() => setTema(tema === "dark" ? "light" : "dark")}
                  aria-label={tema === "dark" ? "Usar tema claro" : "Usar tema oscuro"}
                >
                  {tema === "dark" ? "Tema claro" : "Tema oscuro"}
                </button>
              </div>
              {mapa}
              {totalAbiertos == null && (
                <p className="atlas-map-unavailable">
                  El mapa no tiene datos disponibles en este momento.
                </p>
              )}
            </div>

            <aside
              className="atlas-territory"
              id="atlas-territory"
              aria-label="Resumen territorial"
            >
              <div className="atlas-territory-banner" aria-hidden="true">
                <span>AGUA</span>
                <span>Y TERRITORIO</span>
                <i />
                <i />
                <i />
              </div>
              <div className="atlas-territory-body">
                <div aria-live="polite" aria-atomic="true">
                  <p className="atlas-card-eyebrow">Territorio seleccionado</p>
                  <h2>{departamento?.label ?? "Explora Colombia"}</h2>
                  <p className="atlas-territory-count">
                    <strong>{formatConteo(departamento?.n ?? null)}</strong> procesos abiertos
                  </p>
                  <p className="atlas-territory-caption">
                    Según ubicación de la entidad contratante.
                  </p>
                </div>
                {departamento && departamento.n > 0 ? (
                  <Link
                    className="atlas-territory-cta"
                    href={`/licitaciones/departamento/${departamento.slug}`}
                  >
                    Ver procesos de {departamento.label} <span aria-hidden="true">→</span>
                  </Link>
                ) : (
                  <p className="atlas-empty-light">
                    {totalAbiertos == null
                      ? "Los conteos se mostrarán cuando estén disponibles."
                      : "No hay procesos abiertos para este territorio."}
                  </p>
                )}
                <div className="atlas-types">
                  <h3>Tipos de proyecto · Colombia</h3>
                  <p>Distribución nacional de procesos abiertos</p>
                  {tipos.map((tipo) => (
                    <Link
                      href={`/licitaciones/tipo/${tipo.slug}`}
                      className="atlas-type"
                      key={tipo.clave}
                    >
                      <span>{tipo.label}</span>
                      <strong>{formatConteo(tipo.n)}</strong>
                      <span className="atlas-type-track" aria-hidden="true">
                        <span style={{ width: `${(100 * tipo.n) / maxTipo}%` }} />
                      </span>
                    </Link>
                  ))}
                  {tipos.length === 0 && (
                    <p className="atlas-empty-light">Distribución no disponible.</p>
                  )}
                </div>
                <p className="atlas-card-foot">
                  De un territorio a una oportunidad.
                  <br />
                  Abre un proceso y consulta su ficha.
                </p>
              </div>
            </aside>
          </div>

          <section className="atlas-market" aria-labelledby="hero-market-title">
            <div>
              <h2 id="hero-market-title">El mercado ahora</h2>
              <p>Agua y saneamiento en Colombia</p>
            </div>
            <dl className="atlas-kpis">
              <div>
                <dt>Procesos abiertos</dt>
                <dd>{formatConteo(totalAbiertos)}</dd>
              </div>
              <div>
                <dt>Nuevos abiertos · 7 días</dt>
                <dd>{formatConteo(heroStats.nuevos7d)}</dd>
              </div>
              <div>
                <dt>En juego · este mes · COP</dt>
                <dd>{formatCopCompact(heroStats.enJuegoTotalCop)}</dd>
              </div>
            </dl>
            <p className="atlas-market-note">
              Nuevos: en presentación de oferta. En juego: precio base de abiertos publicados este
              mes. — indica un dato no disponible.
            </p>
          </section>
        </section>

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
