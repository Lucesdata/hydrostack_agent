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

import { useEffect, useState } from "react";
import Link from "next/link";
import ProcesosTicker, { useRecientes } from "@/src/components/landing/ProcesosTicker";
import S2Diagnostico from "@/src/components/landing/S2Diagnostico";
import S3Motor from "@/src/components/landing/S3Motor";
import S5DarkClosing from "@/src/components/landing/S5DarkClosing";
import S7Acceso from "@/src/components/landing/S7Acceso";
import { ETIQUETA_POR_NIVEL, ruta } from "@/src/components/landing/seccionesHome";
import HeroTerritorial from "@/src/components/landing/hero-territorial/HeroTerritorial";
import FichaViva from "@/src/components/landing/ficha-viva/FichaViva";

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

/* ── Fondo "blueprint", sin JS (ver BlueprintBackground) ── */
@property --bp-prof { syntax: "<integer>"; inherits: false; initial-value: 0; }
@keyframes bp-parallax { to { transform: translate3d(0, -150px, 0); } }
@keyframes bp-bajar { from { top: 0vh; } to { top: 100vh; } }
@keyframes bp-nivel { from { top: 0vh; opacity: .08; } to { top: 100vh; opacity: .26; } }
@keyframes bp-profundidad { to { --bp-prof: 6; } }
.bp-fondo-rejilla {
  position: fixed; top: -160px; left: 0; right: 0; bottom: -160px; z-index: 0; pointer-events: none;
  background-image: linear-gradient(rgba(3,105,161,0.055) 1px,transparent 1px),linear-gradient(90deg,rgba(3,105,161,0.055) 1px,transparent 1px);
  background-size: 32px 32px;
}
.bp-fondo-agua {
  position: fixed; left: 0; right: 0; top: 0; bottom: 0; z-index: 0; pointer-events: none; opacity: .08;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 14'><path d='M0,7 Q30,1 60,7 T120,7' stroke='%230369A1' stroke-width='0.6' fill='none'/></svg>");
  background-repeat: repeat; background-size: 120px 14px;
  animation: bp-scroll 22s linear infinite;
}
.bp-fondo-linea {
  position: fixed; left: 0; right: 0; top: 0; height: 2px; z-index: 0; pointer-events: none;
  background: linear-gradient(90deg,transparent,rgba(3,105,161,0.35),transparent);
}
.bp-fondo-onda {
  position: fixed; top: 0; width: 16px; height: 16px; border-radius: 50%; z-index: 0; pointer-events: none;
  border: 1px solid rgba(3,105,161,0.5);
  animation: bp-ripple 2.6s ease-out infinite;
}
.bp-fondo-regla {
  position: fixed; left: 10px; top: 72px; bottom: 16px; width: 1px; z-index: 0; pointer-events: none;
  background: repeating-linear-gradient(180deg,rgba(3,105,161,0.3) 0 1px,transparent 1px 40px);
}
.bp-regla-marca { position: fixed; left: 6px; top: 0; z-index: 0; pointer-events: none; }
.bp-fondo-flecha { width: 0; height: 0; border-top: 4px solid transparent; border-bottom: 4px solid transparent; border-left: 6px solid #0369A1; }
.bp-fondo-prof {
  font: 10px var(--font-jetbrains-mono),monospace; color: #0369A1;
  background: rgba(252,252,249,0.85); padding: 1px 4px; border-radius: 2px;
  counter-reset: bp-prof var(--bp-prof);
}
.bp-fondo-prof::after { content: counter(bp-prof) " m"; }
@supports (animation-timeline: scroll()) {
  .bp-fondo-rejilla { animation: bp-parallax linear both; animation-timeline: scroll(root); }
  .bp-fondo-agua { animation: bp-scroll 22s linear infinite, bp-nivel linear both; animation-timeline: auto, scroll(root); }
  .bp-fondo-linea { animation: bp-bajar linear both; animation-timeline: scroll(root); }
  .bp-fondo-onda { animation: bp-ripple 2.6s ease-out infinite, bp-bajar linear both; animation-timeline: auto, scroll(root); }
  .bp-regla-marca { animation: bp-bajar linear both; animation-timeline: scroll(root); }
  .bp-fondo-prof { animation: bp-profundidad linear both; animation-timeline: scroll(root); }
}
/* Sin animaciones ligadas al scroll, la marca de profundidad diría "0 m" para
   siempre: mejor no pintarla. */
@supports not (animation-timeline: scroll()) {
  .bp-regla-marca { display: none !important; }
}
@media (prefers-reduced-motion: reduce) {
  .bp-fondo-agua, .bp-fondo-onda, .bp-fondo-rejilla, .bp-fondo-linea, .bp-regla-marca, .bp-fondo-prof { animation: none !important; }
  .bp-fondo-onda, .bp-regla-marca { display: none !important; }
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

.bp-probhow-wrap { padding: 64px var(--gutter); border-top: 1px dashed #DADAD2; }
.bp-ps-row { display: grid; grid-template-columns: 1fr 56px 1fr; grid-template-areas: "pain connector answer"; align-items: center; padding: 24px 0; }
.bp-ps-row + .bp-ps-row { border-top: 1px dashed #DADAD2; }
.bp-ps-pain { grid-area: pain; display: flex; align-items: flex-start; justify-content: flex-end; gap: 12px; }
.bp-ps-pain-text { text-align: right; }
.bp-ps-connector { grid-area: connector; display: flex; align-items: center; justify-content: center; }
.bp-ps-answer { grid-area: answer; padding-left: 22px; }
.bp-pillars-wrap { padding: 64px var(--gutter); border-top: 1px dashed #DADAD2; }
.bp-credentials-strip { display: flex; flex-wrap: wrap; }
@media (max-width: 900px) {
  .bp-credentials-strip > div { flex-basis: 100%; border-left: none !important; padding: 16px 0 !important; border-top: 1px solid #DADAD2; }
  .bp-credentials-strip > div:first-child { border-top: none; padding-top: 0 !important; }
}
.bp-closing-wrap { padding: 56px var(--gutter); border-top: 1px dashed #DADAD2; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
.bp-footer-wrap { padding: 20px var(--gutter); border-top: 1px solid #DADAD2; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; font: 11px var(--font-jetbrains-mono),monospace; color: #525B5A; }


@media (max-width: 900px) {
  .bp-ps-row { grid-template-columns: 1fr; grid-template-areas: "pain" "answer"; row-gap: 12px; padding: 20px 0; }
  .bp-ps-connector { display: none; }
  .bp-ps-pain { justify-content: flex-start; }
  .bp-ps-pain-text { text-align: left; }
  .bp-ps-answer { padding-left: 0; }
}
@media (max-width: 640px) {
  .bp-probhow-wrap { padding-top: 48px; padding-bottom: 48px; }
  .bp-pillars-wrap { padding-top: 48px; padding-bottom: 48px; }
  .bp-closing-wrap { padding-top: 40px; padding-bottom: 40px; }
  .bp-footer-wrap { padding: 20px; }
}
`;

/**
 * El fondo "blueprint": rejilla, nivel de agua, ondas y la regla de
 * profundidad que siguen al scroll. Todo en CSS (`BLUEPRINT_CSS`, con
 * `animation-timeline: scroll()`): hasta el 2026-09-26 lo movía un hook que
 * hacía dos `setState` por evento de scroll y volvía a renderizar la portada
 * entera en cada fotograma solo para mover líneas de fondo.
 *
 * Sin soporte de animaciones ligadas al scroll, el fondo se queda en su estado
 * inicial, que es lo que se veía al cargar.
 */
function BlueprintBackground() {
  return (
    <>
      <div aria-hidden="true" className="bp-fondo-rejilla" />
      <div aria-hidden="true" className="bp-fondo-agua bp-sigue" />
      <div aria-hidden="true" className="bp-fondo-linea bp-sigue" />
      {[14, 50, 84].map((leftPct, i) => (
        <div
          key={leftPct}
          aria-hidden="true"
          className="bp-fondo-onda bp-sigue"
          style={{ left: `${leftPct}%`, animationDelay: `${i * 0.9}s, 0s` }}
        />
      ))}
      <div aria-hidden="true" className="bp-regla-plano bp-fondo-regla" />
      <div aria-hidden="true" className="bp-regla-plano bp-regla-marca bp-sigue">
        <div className="bp-fondo-flecha" />
        <span className="bp-fondo-prof" />
      </div>
    </>
  );
}

/**
 * @param {{
 *   mapa?: import("react").ReactNode,
 *   departamentos?: import("@/src/lib/secop/agregados").FilaAgregado[],
 *   totalAbiertos?: number | null,
 *   tipos?: import("@/src/lib/secop/agregados").FilaAgregado[],
 *   preguntas?: import("react").ReactNode,
 * }} props — `mapa` y `preguntas` llegan ya renderizados desde el servidor. Son
 * huecos y no imports: importarlos aquí los arrastraría al bundle del navegador.
 */
export default function LandingPage({
  mapa = null,
  departamentos = [],
  totalAbiertos = null,
  tipos = [],
  preguntas = null,
}) {
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
    ultimaConsulta: null,
  });

  // Fichas recientes: una sola petición para el ticker y la banda del hero.
  const recientes = useRecientes();

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
          ultimaConsulta: d.ultimaConsulta ?? null,
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
      <BlueprintBackground />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1440, margin: "0 auto" }}>
        <ProcesosTicker recientes={recientes} />

        <HeroTerritorial
          mapa={mapa}
          departamentos={departamentos}
          totalAbiertos={totalAbiertos}
          tipos={tipos}
          sector={sector}
          heroStats={heroStats}
          recientes={recientes}
        />

        {/* La Ficha Viva: qué se encuentra al llegar a una ficha. Va justo
            después del hero porque el hero existe para llevar a una ficha. */}
        <FichaViva />

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

        {/* Preguntas frecuentes, con su JSON-LD. Llegan del servidor por la
            misma razón que el mapa: son estáticas y no deben sumar JS. */}
        {preguntas}

        {/* Banda oscura de cierre */}
        <S5DarkClosing />
      </div>
    </div>
  );
}
