// src/components/secop/LicitacionesTabs.tsx
"use client";

/**
 * Pestañas compartidas entre las páginas de Licitaciones (Recientes,
 * Explorar, Cómo participar, Descubrir). Componente de navegación puro:
 * no toca el estado ni la lógica de cada página, solo se monta arriba.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/licitaciones", label: "Recientes" },
  { href: "/licitaciones/explorar", label: "Explorar" },
  { href: "/licitaciones/como-participar", label: "Cómo participar" },
  { href: "/licitaciones/descubrir", label: "Descubrir", mock: true },
];

export default function LicitacionesTabs() {
  const pathname = usePathname();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="clr-lic-tabs" aria-label="Secciones de licitaciones">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`clr-lic-tab${isActive ? " is-active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.label}
              {tab.mock && <span className="clr-lic-tab-badge">mock</span>}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

const CSS = `
.clr-lic-tabs{
  display: flex; gap: 4px; flex-wrap: wrap;
  margin-bottom: 22px;
  border-bottom: 1px solid var(--line);
  padding-bottom: 2px;
}
.clr-lic-tab{
  position: relative;
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-600);
  text-decoration: none;
  padding: 8px 12px;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  transition: color 0.18s, background 0.18s;
}
.clr-lic-tab:hover{ color: var(--ink-900); background: var(--surface-alt); }
.clr-lic-tab.is-active{ color: var(--accent); }
.clr-lic-tab.is-active::after{
  content: "";
  position: absolute; left: 8px; right: 8px; bottom: -3px; height: 2px;
  background: var(--accent);
}
.clr-lic-tab-badge{
  font-size: 9px;
  letter-spacing: 0.06em;
  color: var(--ink-600);
  border: 1px dashed var(--line);
  border-radius: var(--radius-pill);
  padding: 1px 6px;
}
`;
