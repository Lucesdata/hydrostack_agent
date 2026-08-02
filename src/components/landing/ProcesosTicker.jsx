// src/components/landing/ProcesosTicker.jsx
// Ticker de procesos en vivo. Lee /api/procesos/recientes (Postgres →
// fallback Socrata); si la API falla o no trae datos, degrada honestamente
// a un estado vacío ("—"), igual que app/api/landing-stats/route.ts — nunca
// muestra datos ficticios sin aviso.
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const TICKER_CSS = `
.ptr-bar {
  width: 100%;
  height: 54px;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
  position: relative;
  display: flex;
  align-items: stretch;
}
.ptr-cap {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 16px;
  border-right: 1px solid var(--line);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--accent);
  text-transform: uppercase;
  white-space: nowrap;
  background: var(--surface);
  z-index: 2;
  flex-shrink: 0;
}
.ptr-cap-dot {
  position: relative;
  width: 8px; height: 8px; border-radius: 0;
  border: 1.5px solid var(--success);
  background: none;
  transform: rotate(45deg);
  flex-shrink: 0;
}
.ptr-cap-dot::after {
  content: ""; position: absolute; inset: -4px; border-radius: 0;
  border: 1px solid var(--success); opacity: .5;
  animation: ptr-pulse 2.4s ease-out infinite;
}
@keyframes ptr-pulse {
  0%   { transform: scale(.8); opacity: .8; }
  100% { transform: scale(1.7); opacity: 0; }
}
.ptr-clip {
  overflow: hidden;
  flex: 1;
  display: flex;
  align-items: center;
  -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 28px, #000 calc(100% - 28px), transparent);
  mask-image: linear-gradient(90deg, transparent 0, #000 28px, #000 calc(100% - 28px), transparent);
}
.ptr-track {
  display: flex;
  align-items: center;
  white-space: nowrap;
  animation: ptr-scroll 110s linear infinite;
  will-change: transform;
}
.ptr-bar:hover .ptr-track { animation-play-state: paused; }
@keyframes ptr-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
.ptr-item {
  display: inline-flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  padding: 0 20px;
  border-right: 1px solid var(--line);
  font-family: var(--font-mono);
  letter-spacing: 0.02em;
  text-decoration: none;
  cursor: default;
}
a.ptr-item { cursor: pointer; }
a.ptr-item:hover .ptr-entidad { color: var(--accent); }
.ptr-row1 {
  display: flex; align-items: center; gap: 8px;
  font-size: 11.5px; color: var(--ink-600);
}
.ptr-entidad {
  color: var(--ink-900); font-weight: 600;
  max-width: 260px; overflow: hidden; text-overflow: ellipsis;
  transition: color .18s;
}
.ptr-valor { color: var(--accent); font-weight: 600; }
.ptr-row2 {
  display: flex; align-items: center; gap: 6px;
  font-size: 10px; color: var(--ink-600); letter-spacing: 0.04em;
}
.ptr-dot {
  width: 8px; height: 1.5px; border-radius: 0;
  background: var(--ink-300); flex-shrink: 0;
  margin-left: 3px;
  position: relative;
}
.ptr-dot::after {
  content: ""; position: absolute; left: 0; top: -3px;
  width: 1.5px; height: 8px; background: inherit;
}
.ptr-dot--live { background: var(--success); }
.ptr-dot--warn { background: var(--warning); }
.ptr-lugar {
  max-width: 220px; overflow: hidden; text-overflow: ellipsis;
}
.ptr-empty {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 0 20px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--ink-600);
}
@media (max-width: 640px) {
  .ptr-bar { height: 48px; }
  .ptr-cap { padding: 0 10px; font-size: 9px; }
  .ptr-item { padding: 0 14px; }
  .ptr-row1 { font-size: 10.5px; }
  .ptr-entidad { max-width: 170px; }
  .ptr-row2 { font-size: 9px; }
}
`;

/* ── Helpers de presentación ─────────────────────────────────────────────── */

const MINUSCULAS = new Set(["de", "del", "la", "las", "los", "y", "e", "en", "el"]);

/** "EMPRESA DE ACUEDUCTO DE BOGOTÁ E.S.P." → "Empresa de Acueducto de Bogotá E.S.P." */
function titulo(s) {
  if (!s) return s;
  return s
    .split(/\s+/)
    .map((w, i) => {
      const core = w.replace(/[^\p{L}]/gu, "");
      if (core.length <= 4 && core === core.toUpperCase() && core.length > 1) return w; // EAAB, E.S.P.
      const lower = w.toLowerCase();
      if (i > 0 && MINUSCULAS.has(lower)) return lower;
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

function mapApiItem(p) {
  return {
    id: p.id,
    entidad: titulo(p.entidad) || "Entidad por confirmar",
    valor: fmtValor(p.valorEstimado),
    ciudad: titulo(p.municipio),
    departamento: titulo(p.departamento),
    estado: titulo(p.estado) || "Publicado",
    href: "/licitaciones",
  };
}

/* ── Componentes ─────────────────────────────────────────────────────────── */

function ProcesoItem({ p }) {
  const tone = estadoTone(p.estado);
  const dotClass =
    tone === "live" ? "ptr-dot ptr-dot--live" : tone === "warn" ? "ptr-dot ptr-dot--warn" : "ptr-dot";
  const lugar = [p.ciudad, p.departamento].filter(Boolean).join(", ");
  const content = (
    <>
      <span className="ptr-row1">
        <span className="ptr-entidad">{p.entidad}</span>
        {p.valor && (
          <>
            <span aria-hidden="true">·</span>
            <span className="ptr-valor">{p.valor}</span>
          </>
        )}
      </span>
      <span className="ptr-row2">
        <span className={dotClass} />
        <span>{p.estado}</span>
        {lugar && (
          <>
            <span aria-hidden="true">·</span>
            <span className="ptr-lugar">{lugar}</span>
          </>
        )}
      </span>
    </>
  );
  if (p.href) {
    return (
      <Link href={p.href} className="ptr-item">
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
    return () => { cancel = true; };
  }, []);

  // La velocidad se mantiene constante aunque cambie el nº de procesos.
  const duration = Math.max(40, items.length * 9);

  return (
    <div className="ptr-bar" aria-label="Procesos activos de contratación pública en agua y saneamiento">
      <style dangerouslySetInnerHTML={{ __html: TICKER_CSS }} />
      <div className="ptr-cap">
        <span className="ptr-cap-dot" />
        {status === "live" ? "SECOP · en vivo" : "Procesos"}
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
            <div aria-hidden="true" style={{ display: "flex", alignItems: "center", height: "100%" }}>
              {items.map((p, i) => (
                <ProcesoItem key={`dup-${p.id}-${i}`} p={p} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="ptr-empty">
          {status === "loading" ? "Cargando procesos…" : "— sin datos disponibles en este momento —"}
        </div>
      )}
    </div>
  );
}
