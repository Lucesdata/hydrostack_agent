"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useLang } from "@/lib/i18n";

export default function Navbar() {
  const { t, toggle, lang } = useLang();
  const path = usePathname();
  const isCalc = path.startsWith("/calculators");
  const isChat = path.startsWith("/chat");
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <nav style={S.nav}>
      <div style={S.inner}>
        {/* Logo */}
        <Link href="/" style={S.logo} onClick={close}>
          <span style={S.logoMark}>H</span>
          <span style={S.logoText}>ydroStack</span>
        </Link>

        {/* Online status dot */}
        <span style={S.statusDot} className="blink" title="Sistema activo"/>

        {/* Desktop links */}
        <div style={S.links} className="hide-mobile">
          <Link href="/calculators" style={{ ...S.link, ...(isCalc ? S.linkActive : {}) }} className={isCalc ? "" : "nav-link"}>
            {t.nav.calculators}
          </Link>
          <Link href="/chat" style={{ ...S.link, ...(isChat ? S.linkActive : {}) }} className={isChat ? "" : "nav-link"}>
            {t.nav.assistant}
          </Link>
          <a href="#about" style={S.link} className="nav-link">
            {t.nav.about}
          </a>
        </div>

        {/* Lang toggle — desktop */}
        <button style={S.langBtn} className="btn-ghost hide-mobile" onClick={toggle}>
          {t.nav.lang}
        </button>

        {/* Hamburger — mobile only */}
        <button
          className="nav-hamburger hide-desktop"
          onClick={() => setOpen(o => !o)}
          aria-label="Menú"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile dropdown */}
      <div className={`nav-mobile-menu${open ? " open" : ""}`}>
        <Link href="/calculators" className={`nav-mobile-link${isCalc ? " active" : ""}`} onClick={close}>
          {t.nav.calculators}
        </Link>
        <Link href="/chat" className={`nav-mobile-link${isChat ? " active" : ""}`} onClick={close}>
          {t.nav.assistant}
        </Link>
        <a href="#about" className="nav-mobile-link" onClick={close}>
          {t.nav.about}
        </a>
        <button className="nav-mobile-lang" onClick={() => { toggle(); close(); }}>
          {t.nav.lang}
        </button>
      </div>
    </nav>
  );
}

const S = {
  nav: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    background: "rgba(2,12,16,0.92)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    borderBottom: "1px solid rgba(0,245,255,0.10)",
    padding: "0 28px",
    height: "52px",
    display: "flex",
    alignItems: "center",
    boxShadow: "0 1px 32px rgba(0,0,0,0.6), inset 0 -1px 0 rgba(0,245,255,0.05)",
  },
  inner: {
    maxWidth: "1100px",
    width: "100%",
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    gap: "20px",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    textDecoration: "none",
  },
  logoMark: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "18px",
    fontWeight: "900",
    color: "#00F5FF",
    textShadow: "0 0 16px rgba(0,245,255,0.5)",
  },
  logoText: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "18px",
    fontWeight: "700",
    color: "#E8F8FF",
  },
  statusDot: {
    width: "5px",
    height: "5px",
    borderRadius: "50%",
    background: "#00FF88",
    boxShadow: "0 0 6px #00FF88",
    flexShrink: 0,
  },
  links: {
    display: "flex",
    gap: "28px",
    marginLeft: "auto",
  },
  link: {
    fontSize: "10px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#4A7A8A",
    fontFamily: "'IBM Plex Mono', monospace",
    transition: "color 0.2s",
    textDecoration: "none",
  },
  linkActive: {
    color: "#00F5FF",
    textShadow: "0 0 10px rgba(0,245,255,0.4)",
  },
  langBtn: {
    background: "transparent",
    border: "1px solid rgba(0,245,255,0.18)",
    borderRadius: "3px",
    padding: "4px 12px",
    color: "#4A7A8A",
    fontSize: "9px",
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    cursor: "pointer",
    transition: "all 0.2s",
  },
};
