// src/components/landing/ProcesosTicker.jsx
"use client";
import Link from "next/link";
import mockProcesos from "./mockProcesos";

const TICKER_CSS = `
.ptr-bar {
  width: 100%;
  height: 40px;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
}
.ptr-track {
  display: flex;
  align-items: center;
  white-space: nowrap;
  animation: ptr-scroll 38s linear infinite;
  will-change: transform;
}
.ptr-bar:hover .ptr-track {
  animation-play-state: paused;
}
@keyframes ptr-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
.ptr-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
  border-right: 1px solid var(--line);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.02em;
  color: var(--ink-600);
  text-decoration: none;
  cursor: default;
}
.ptr-item strong {
  color: var(--ink-900);
  font-weight: 600;
}
.ptr-item .ptr-valor {
  color: var(--accent);
  font-weight: 600;
}
@media (max-width: 640px) {
  .ptr-bar { height: 34px; }
  .ptr-item { padding: 0 14px; font-size: 10px; gap: 6px; }
}
`;

function ProcesoItem({ p }) {
  const content = (
    <>
      <strong>{p.entidad}</strong>
      <span aria-hidden="true">·</span>
      <span className="ptr-valor">{p.valor}</span>
      <span aria-hidden="true">·</span>
      <span>{p.ciudad}, {p.departamento}</span>
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
  // Se duplica la lista para que el loop de translateX(-50%) sea continuo.
  const items = [...mockProcesos, ...mockProcesos];
  return (
    <div className="ptr-bar" aria-label="Procesos activos de contratación pública en agua y saneamiento">
      <style dangerouslySetInnerHTML={{ __html: TICKER_CSS }} />
      <div className="ptr-track">
        {items.map((p, i) => (
          <ProcesoItem key={`${p.id}-${i}`} p={p} />
        ))}
      </div>
    </div>
  );
}
