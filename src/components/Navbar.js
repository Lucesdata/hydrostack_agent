"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
// import { useLang } from "@/src/lib/i18n"; // selector ES/EN retirado temporalmente — ver docs/superpowers/specs/2026-07-13-landing-secop-reposition-design.md

export default function Navbar() {
  // const { t, toggle } = useLang(); // reactivar junto con los botones de idioma más abajo
  const path = usePathname();
  const isCalc = path.startsWith("/calculators");
  const isChat = path.startsWith("/chat");
  const isLic  = path.startsWith("/licitaciones");
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const navAria = (active) => (active ? { "aria-current": "page" } : {});

  return (
    <nav className="clr-nav" aria-label="Menú principal">
      <div className="clr-nav-inner">
        <Link href="/" style={S.logo} onClick={close} aria-label="HydroStack inicio">
          <span style={S.logoMark}>H</span>
          <span style={S.logoText}>ydroStack</span>
        </Link>

        <span className="clr-status-dot" title="Sistema activo" aria-hidden="true" />

        <div style={S.links} className="hide-mobile">
          <Link href="/calculators" className="clr-nav-link" {...navAria(isCalc)}>
            Calculadoras
          </Link>
          <Link href="/chat" className="clr-nav-link" {...navAria(isChat)}>
            Asistente
          </Link>
          <Link href="/licitaciones" className="clr-nav-link" {...navAria(isLic)}>
            Licitaciones
          </Link>
          <a href="#about" className="clr-nav-link">
            Nosotros
          </a>
        </div>

        {/* Selector de idioma retirado temporalmente — ver docs/superpowers/specs/2026-07-13-landing-secop-reposition-design.md
        <button className="clr-lang-btn hide-mobile" onClick={toggle}>
          {t.nav.lang}
        </button>
        */}

        <button
          className="clr-hamburger hide-desktop"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          aria-controls="clr-mobile-menu"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      <div id="clr-mobile-menu" className={`clr-mobile-menu${open ? " open" : ""}`}>
        <Link href="/calculators" className="clr-mobile-link" {...navAria(isCalc)} onClick={close}>
          Calculadoras
        </Link>
        <Link href="/chat" className="clr-mobile-link" {...navAria(isChat)} onClick={close}>
          Asistente
        </Link>
        <Link href="/licitaciones" className="clr-mobile-link" {...navAria(isLic)} onClick={close}>
          Licitaciones
        </Link>
        <a href="#about" className="clr-mobile-link" onClick={close}>
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

const S = {
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    textDecoration: "none",
    color: "var(--ink-900)",
  },
  logoMark: {
    width: 28,
    height: 28,
    borderRadius: 7,
    background: "var(--accent)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 13,
    fontFamily: "var(--font-sans)",
    boxShadow: "var(--shadow-logo)",
  },
  logoText: {
    fontFamily: "var(--font-sans)",
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: "-0.01em",
    color: "var(--ink-900)",
  },
  links: {
    display: "flex",
    gap: 28,
    marginLeft: "auto",
  },
};
