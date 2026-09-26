// src/components/landing/ProcesosTicker.jsx
// Ticker de fichas recientes: cada elemento abre la ficha del proceso, no la
// lista ni el SECOP — la ficha es el centro del producto. Lee /api/procesos/recientes (Postgres →
// fallback Socrata); si la API falla o no trae datos, degrada honestamente
// a un estado vacío ("—"), igual que app/api/landing-stats/route.ts — nunca
// muestra datos ficticios sin aviso.
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { colorDeTipo } from "@/src/lib/classify/tipo-color";
import { TIPO_PROYECTO } from "@/src/lib/classify/tipo-proyecto";

const TICKER_CSS = `
.ptr-bar {
  /* Tema oscuro: el ticker va entre la barra y el hero de la portada, que son
     azul noche. Colores del hero (hero-territorial.module.css). */
  --ptr-bg: #081a2b;
  --ptr-card: rgba(255, 255, 255, 0.035);
  --ptr-line: rgba(140, 190, 225, 0.14);
  --ptr-texto: #f3f8fc;
  --ptr-muted: #9fb4c6;
  --ptr-acento: #4cc9ff;
  --ptr-vivo: #3fd6a0;
  --ptr-aviso: #f5b454;
  --ptr-apagado: #6f8596;
  width: 100%;
  height: 68px;
  border-bottom: 1px solid var(--ptr-line);
  background: var(--ptr-bg);
  position: relative;
  display: flex;
  align-items: stretch;
}
.ptr-cap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px 0 16px;
  border-right: 1px solid var(--ptr-line);
  font: 600 10.5px var(--font-jetbrains-mono), monospace;
  letter-spacing: 0.12em;
  color: var(--ptr-acento);
  text-transform: uppercase;
  white-space: nowrap;
  background: var(--ptr-bg);
  z-index: 2;
  flex-shrink: 0;
}
.ptr-cap-dot {
  position: relative;
  width: 8px; height: 8px;
  border: 1.5px solid var(--ptr-vivo);
  transform: rotate(45deg);
  flex-shrink: 0;
}
.ptr-cap-dot::after {
  content: ""; position: absolute; inset: -4px;
  border: 1px solid var(--ptr-vivo); opacity: .5;
  animation: ptr-pulse 2.4s ease-out infinite;
}
@keyframes ptr-pulse {
  0%   { transform: scale(.8); opacity: .8; }
  100% { transform: scale(1.7); opacity: 0; }
}
.ptr-pausa {
  display: grid; place-items: center;
  width: 28px; height: 28px; padding: 0;
  border: 1px solid var(--ptr-line); border-radius: 50%;
  background: transparent; color: var(--ptr-muted); cursor: pointer;
}
.ptr-pausa:hover { color: var(--ptr-texto); border-color: var(--ptr-acento); }
.ptr-pausa:focus-visible { outline: 2px solid var(--ptr-acento); outline-offset: 2px; }
.ptr-clip {
  overflow: hidden;
  flex: 1;
  display: flex;
  align-items: center;
  -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 24px, #000 calc(100% - 24px), transparent);
  mask-image: linear-gradient(90deg, transparent 0, #000 24px, #000 calc(100% - 24px), transparent);
}
.ptr-track {
  display: flex;
  align-items: center;
  padding-left: 10px;
  white-space: nowrap;
  animation: ptr-scroll 110s linear infinite;
  will-change: transform;
}
/* Se detiene al pasar el ratón, al enfocar con teclado y con el botón de
   pausa: contenido en movimiento más de 5 s necesita las tres (WCAG 2.2.2). */
.ptr-bar:hover .ptr-track,
.ptr-bar:focus-within .ptr-track,
.ptr-bar[data-pausado="true"] .ptr-track { animation-play-state: paused; }
@keyframes ptr-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
.ptr-item {
  display: inline-grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-areas: "tipo objeto" "meta meta";
  align-items: center;
  gap: 4px 8px;
  /* Ancho fijo: en una pista sin salto de línea, una rejilla con columna
     minmax(0, 1fr) se encoge hasta dejar el objeto en cero. */
  flex: none;
  width: 340px;
  /* Margen y no gap en la pista: las dos mitades del bucle deben medir
     exactamente lo mismo, o el salto de translateX(-50%) se nota. */
  margin-right: 10px;
  padding: 8px 14px;
  border: 1px solid var(--ptr-line);
  border-radius: 10px;
  background: var(--ptr-card);
  font-family: var(--font-inter), sans-serif;
  text-decoration: none;
  transition: border-color .18s, background .18s;
}
a.ptr-item { cursor: pointer; }
a.ptr-item:hover { border-color: var(--ptr-acento); background: rgba(76, 201, 255, 0.08); }
a.ptr-item:focus-visible { outline: 2px solid var(--ptr-acento); outline-offset: 2px; }
.ptr-tipo {
  grid-area: tipo;
  display: inline-flex; align-items: center; gap: 5px;
  padding: 1px 8px 1px 6px;
  border: 1px solid var(--tipo); border-radius: 999px;
  font-size: 11px; font-weight: 600; color: var(--ptr-texto);
}
.ptr-tipo i { width: 7px; height: 7px; border-radius: 50%; background: var(--tipo); }
.ptr-tipo--otros { border-style: dashed; }
.ptr-tipo--otros i { background: transparent; border: 1.5px dashed var(--tipo); }
.ptr-objeto {
  grid-area: objeto;
  overflow: hidden; text-overflow: ellipsis;
  font-size: 12.5px; font-weight: 600; color: var(--ptr-texto);
}
.ptr-item:not(:has(.ptr-tipo)) .ptr-objeto { grid-column: 1 / -1; }
a.ptr-item:hover .ptr-objeto { color: #fff; }
.ptr-meta {
  grid-area: meta;
  display: flex; align-items: center; gap: 6px; min-width: 0;
  font-size: 11px; color: var(--ptr-muted);
}
.ptr-estado { display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0; }
.ptr-estado i { width: 6px; height: 6px; border-radius: 50%; background: var(--ptr-apagado); }
.ptr-estado--live i { background: var(--ptr-vivo); }
.ptr-estado--warn i { background: var(--ptr-aviso); }
.ptr-lugar { overflow: hidden; text-overflow: ellipsis; }
.ptr-valor {
  margin-left: auto; padding-left: 10px; flex-shrink: 0;
  font-weight: 700; font-variant-numeric: tabular-nums; color: var(--ptr-acento);
}
.ptr-empty {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 0 20px;
  font: 11.5px var(--font-inter), sans-serif;
  color: var(--ptr-muted);
}
@media (prefers-reduced-motion: reduce) {
  /* Sin desplazamiento automático: la fila se recorre a mano. */
  .ptr-track { animation: none; }
  .ptr-clip { overflow-x: auto; -webkit-mask-image: none; mask-image: none; }
  .ptr-copia { display: none !important; }
}
@media (max-width: 640px) {
  .ptr-bar { height: 62px; }
  /* El rótulo se come un tercio de la barra en un móvil. Se va el texto; el
     diamante y el botón de pausa se quedan. */
  .ptr-cap { gap: 8px; padding: 0 8px 0 12px; }
  .ptr-cap-label { display: none; }
  .ptr-item { width: 78vw; max-width: 320px; padding: 7px 12px; }
  .ptr-objeto { font-size: 12px; }
}
`;

/* ── Helpers de presentación ─────────────────────────────────────────────── */

const MINUSCULAS = new Set(["de", "del", "la", "las", "los", "y", "e", "en", "el"]);

/** "CONSTRUCCIÓN DE LA PTAP" → "Construcción de la ptap": el objeto es una frase. */
export function frase(s) {
  if (!s) return s;
  const limpio = s.trim().replace(/\s+/g, " ");
  if (limpio !== limpio.toUpperCase()) return limpio;
  const lower = limpio.toLowerCase();
  // Las siglas del sector vuelven a mayúsculas: "ptar" no se lee como PTAR.
  const conSiglas = lower.replace(/\b(ptap|ptar|ptard|pdas?|pmaa|e\.s\.p\.?|esp|aaa|ips)\b/g, (m) =>
    m.toUpperCase()
  );
  return conSiglas.charAt(0).toUpperCase() + conSiglas.slice(1);
}

/** "EMPRESA DE ACUEDUCTO DE BOGOTÁ E.S.P." → "Empresa de Acueducto de Bogotá E.S.P." */
export function titulo(s) {
  if (!s) return s;
  return s
    .split(/\s+/)
    .map((w, i) => {
      const lower = w.toLowerCase();
      // Primero los conectores: "DE" también cabe en la regla de las siglas, y
      // "EMPRESA DE ACUEDUCTO" salía "Empresa DE Acueducto".
      if (i > 0 && MINUSCULAS.has(lower)) return lower;
      const core = w.replace(/[^\p{L}]/gu, "");
      if (core.length <= 4 && core === core.toUpperCase() && core.length > 1) return w; // EAAB, E.S.P.
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

/** 4_850_000_000 → "$4.850 M" (millones COP). */
function fmtValor(n) {
  if (n == null || !Number.isFinite(n)) return null;
  const m = Math.round(n / 1e6);
  if (m < 1) return "< $1 M";
  return `$${m.toLocaleString("es-CO")} M`;
}

/** Semáforo por estado del proceso. */
function estadoTone(estado) {
  const e = (estado || "").toLowerCase();
  if (/(publicad|abiert|activ|convocad|recepci|presentaci)/.test(e)) return "live";
  if (/(evaluaci|adjudicaci|selecci|observaci|borrador)/.test(e)) return "warn";
  return "off";
}

export function mapApiItem(p) {
  const color = colorDeTipo(p.tipoProyecto);
  return {
    id: p.id,
    // Lo primero que se lee es qué se va a construir, no quién lo contrata.
    objeto: frase(p.objeto) || titulo(p.entidad) || "Proceso sin objeto publicado",
    tipo: color ? { label: TIPO_PROYECTO[p.tipoProyecto].label, color } : null,
    valor: fmtValor(p.valorEstimado),
    ciudad: titulo(p.municipio),
    departamento: titulo(p.departamento),
    estado: titulo(p.estado) || "Publicado",
    href: p.ficha || "/licitaciones",
  };
}

/* ── Componentes ─────────────────────────────────────────────────────────── */

function ProcesoItem({ p, copia = false }) {
  const tone = estadoTone(p.estado);
  const lugar = [p.ciudad, p.departamento].filter(Boolean).join(", ");
  const content = (
    <>
      {p.tipo && (
        <span
          className={`ptr-tipo${p.tipo.color.familia === "otros" ? " ptr-tipo--otros" : ""}`}
          style={{ "--tipo": p.tipo.color.oscuro }}
        >
          <i aria-hidden="true" />
          {p.tipo.label}
        </span>
      )}
      <span className="ptr-objeto">{p.objeto}</span>
      <span className="ptr-meta">
        <span className={`ptr-estado ptr-estado--${tone}`}>
          <i aria-hidden="true" />
          {p.estado}
        </span>
        {lugar && (
          <>
            <span aria-hidden="true">·</span>
            <span className="ptr-lugar">{lugar}</span>
          </>
        )}
        {p.valor && <span className="ptr-valor">{p.valor}</span>}
      </span>
    </>
  );
  if (p.href) {
    return (
      <Link
        href={p.href}
        className="ptr-item"
        title={p.objeto}
        // La copia del bucle es solo visual: fuera del orden de tabulación.
        tabIndex={copia ? -1 : undefined}
      >
        {content}
      </Link>
    );
  }
  return <span className="ptr-item">{content}</span>;
}

export default function ProcesosTicker() {
  const [items, setItems] = useState([]);
  // "loading" | "live" | "empty" — nunca hay un cuarto estado con datos ficticios.
  const [status, setStatus] = useState("loading");
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    let cancel = false;
    fetch("/api/procesos/recientes")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (cancel) return;
        if (!Array.isArray(data?.items) || data.items.length === 0) {
          setStatus("empty");
          return;
        }
        setItems(data.items.map(mapApiItem));
        setStatus("live");
      })
      .catch(() => {
        if (!cancel) setStatus("empty");
      });
    return () => {
      cancel = true;
    };
  }, []);

  // La velocidad se mantiene constante aunque cambie el nº de procesos.
  const duration = Math.max(40, items.length * 9);

  return (
    <div
      className="ptr-bar"
      role="region"
      aria-label="Fichas recientes de procesos de agua y saneamiento"
      data-pausado={pausado}
    >
      <style dangerouslySetInnerHTML={{ __html: TICKER_CSS }} />
      <div className="ptr-cap">
        <span className="ptr-cap-dot" />
        <span className="ptr-cap-label">{status === "live" ? "Fichas recientes" : "Fichas"}</span>
        {status === "live" && (
          <button
            type="button"
            className="ptr-pausa"
            onClick={() => setPausado((v) => !v)}
            aria-pressed={pausado}
            aria-label={pausado ? "Reanudar el desplazamiento" : "Pausar el desplazamiento"}
          >
            <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
              {pausado ? (
                <path d="M3 1.5v9l7-4.5z" fill="currentColor" />
              ) : (
                <path d="M3 1.5h2v9H3zM7 1.5h2v9H7z" fill="currentColor" />
              )}
            </svg>
          </button>
        )}
      </div>
      {status === "live" ? (
        <div className="ptr-clip">
          {/* La segunda copia lleva aria-hidden: es puramente visual para el
              loop de translateX(-50%); los lectores de pantalla no deben
              anunciarla dos veces. */}
          <div className="ptr-track" style={{ animationDuration: `${duration}s` }}>
            {items.map((p, i) => (
              <ProcesoItem key={`${p.id}-${i}`} p={p} />
            ))}
            <div
              className="ptr-copia"
              aria-hidden="true"
              style={{ display: "flex", alignItems: "center", height: "100%" }}
            >
              {items.map((p, i) => (
                <ProcesoItem key={`dup-${p.id}-${i}`} p={p} copia />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="ptr-empty">
          {status === "loading" ? "Cargando fichas…" : "— sin datos disponibles en este momento —"}
        </div>
      )}
    </div>
  );
}
