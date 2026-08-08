"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
// import { useLang } from "@/src/lib/i18n"; // selector ES/EN retirado temporalmente — ver docs/superpowers/specs/2026-07-13-landing-secop-reposition-design.md

const NAV_ITEMS = [
  { href: "/licitaciones", route: "/licitaciones", index: "01", label: "Licitaciones" },
  { href: "/build", route: "/build", index: "02", label: "Proyectos" },
  { href: "/calculators", route: "/calculators", index: "03", label: "Calculadoras" },
  { href: "/chat", route: "/chat", index: "04", label: "Asistente" },
  { href: "/nosotros", route: "/nosotros", index: "05", label: "Nosotros" },
];

function ValveGlyph() {
  return (
    <svg viewBox="0 0 26 26" width="15" height="15" fill="none" stroke="#fff" strokeWidth="1.6" aria-hidden="true">
      <line x1="2" y1="13" x2="8.2" y2="13" />
      <line x1="17.8" y1="13" x2="24" y2="13" />
      <circle cx="13" cy="13" r="4.6" />
      <line x1="13" y1="8" x2="13" y2="4" />
      <line x1="13" y1="18" x2="13" y2="22" />
    </svg>
  );
}

function CoteGlyph() {
  return (
    <svg className="clr-nav-cote" viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" y1="1" x2="100" y2="1" stroke="var(--accent)" strokeWidth="1" />
      <line x1="0" y1="0" x2="0" y2="3" stroke="var(--accent)" strokeWidth="1" />
      <line x1="100" y1="0" x2="100" y2="3" stroke="var(--accent)" strokeWidth="1" />
    </svg>
  );
}

export default function Navbar() {
  // const { t, toggle } = useLang(); // reactivar junto con los botones de idioma más abajo
  const path = usePathname();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const isActive = (item) => path.startsWith(item.route);
  const navAria = (active) => (active ? { "aria-current": "page" } : {});

  return (
    <nav className="clr-nav" aria-label="Menú principal">
      <div className="clr-nav-inner">
        <Link href="/" className="clr-logo" onClick={close} aria-label="HydroStack inicio">
          <span className="clr-logo-mark"><ValveGlyph /></span>
          <span className="clr-logo-text">ydroStack</span>
        </Link>

        <span className="clr-status" title="Sistema activo">
          <span className="clr-status-dot" aria-hidden="true" />
          <span className="clr-status-label">En línea</span>
        </span>

        <span className="clr-nav-divider" aria-hidden="true" />

        <div className="clr-links">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="clr-nav-link"
              {...navAria(isActive(item))}
            >
              <span className="clr-nav-index" aria-hidden="true">{item.index}/</span>
              {item.label}
              <CoteGlyph />
            </Link>
          ))}
        </div>

        {/* Selector de idioma retirado temporalmente — ver docs/superpowers/specs/2026-07-13-landing-secop-reposition-design.md
        <button className="clr-lang-btn hide-mobile" onClick={toggle}>
          {t.nav.lang}
        </button>
        */}

        <button
          className="clr-hamburger"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          aria-controls="clr-mobile-menu"
        >
          <span className={`clr-hamburger-icon${open ? " open" : ""}`} aria-hidden="true">
            <span />
            <span />
          </span>
        </button>
      </div>

      <div id="clr-mobile-menu" className={`clr-mobile-menu${open ? " open" : ""}`}>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="clr-mobile-link"
            {...navAria(isActive(item))}
            onClick={close}
          >
            <span className="clr-nav-index" aria-hidden="true">{item.index}/</span>
            {item.label}
          </Link>
        ))}
        {/* Selector de idioma retirado temporalmente — ver docs/superpowers/specs/2026-07-13-landing-secop-reposition-design.md
        <button className="clr-mobile-lang" onClick={() => { toggle(); close(); }}>
          {t.nav.lang}
        </button>
        */}
      </div>
    </nav>
  );
}
