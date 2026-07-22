"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
// import { useLang } from "@/src/lib/i18n"; // selector ES/EN retirado temporalmente — ver docs/superpowers/specs/2026-07-13-landing-secop-reposition-design.md

const NAV_ITEMS = [
  { href: "/licitaciones", index: "01", label: "Licitaciones" },
  { href: "/build", index: "02", label: "Proyectos" },
  { href: "/calculators", index: "03", label: "Calculadoras" },
  { href: "/chat", index: "04", label: "Asistente" },
];

export default function Navbar() {
  // const { t, toggle } = useLang(); // reactivar junto con los botones de idioma más abajo
  const path = usePathname();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const isActive = (href) => path.startsWith(href);
  const navAria = (active) => (active ? { "aria-current": "page" } : {});

  return (
    <nav className="clr-nav" aria-label="Menú principal">
      <div className="clr-nav-inner">
        <Link href="/" className="clr-logo" onClick={close} aria-label="HydroStack inicio">
          <span className="clr-logo-mark">H</span>
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
              {...navAria(isActive(item.href))}
            >
              <span className="clr-nav-index" aria-hidden="true">{item.index}</span>
              {item.label}
            </Link>
          ))}
          <a href="#about" className="clr-nav-link">
            <span className="clr-nav-index" aria-hidden="true">05</span>
            Nosotros
          </a>
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
            {...navAria(isActive(item.href))}
            onClick={close}
          >
            <span className="clr-nav-index" aria-hidden="true">{item.index}</span>
            {item.label}
          </Link>
        ))}
        <a href="#about" className="clr-mobile-link" onClick={close}>
          <span className="clr-nav-index" aria-hidden="true">05</span>
          Nosotros
        </a>
        {/* Selector de idioma retirado temporalmente — ver docs/superpowers/specs/2026-07-13-landing-secop-reposition-design.md
        <button className="clr-mobile-lang" onClick={() => { toggle(); close(); }}>
          {t.nav.lang}
        </button>
        */}
      </div>
    </nav>
  );
}
