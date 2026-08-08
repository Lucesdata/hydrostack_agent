"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/licitaciones", route: "/licitaciones", index: "01", label: "Licitaciones" },
  { href: "/pliego", route: "/pliego", index: "02", label: "Pliegos" },
  { href: "/nosotros", route: "/nosotros", index: "03", label: "Nosotros" },
];

const AUTH_CSS = `
.clr-nav-auth{ display: flex; align-items: center; gap: 10px; margin-left: 8px; }
.clr-nav-auth-link{
  font: 500 12.5px var(--font-sans, sans-serif); color: var(--ink-600, #525B5A);
  text-decoration: none; padding: 6px 10px; white-space: nowrap;
}
.clr-nav-auth-link:hover{ color: var(--ink-900, #0A1F1C); }
.clr-nav-auth-cta{
  font: 600 12.5px var(--font-mono, monospace); color: #fff;
  background: var(--ink-900, #0A1F1C); text-decoration: none;
  padding: 7px 12px; white-space: nowrap;
}
.clr-nav-auth-cta:hover{ opacity: .9; }
.clr-nav-user{ position: relative; }
.clr-nav-user-btn{
  display: flex; align-items: center; gap: 6px; background: none; border: none;
  font: 500 12.5px var(--font-sans, sans-serif); color: var(--ink-900, #0A1F1C);
  cursor: pointer; padding: 6px 4px;
}
.clr-nav-user-menu{
  position: absolute; top: calc(100% + 6px); right: 0; min-width: 160px;
  background: var(--surface, #fff); border: 1px solid var(--line, #E5E5E0);
  display: flex; flex-direction: column; z-index: 20;
}
.clr-nav-user-email{
  font: 11px var(--font-mono, monospace); color: var(--ink-600, #525B5A);
  padding: 8px 12px; border-bottom: 1px solid var(--line, #E5E5E0);
  overflow: hidden; text-overflow: ellipsis;
}
.clr-nav-user-menu button{
  background: none; border: none; text-align: left; font-size: 12.5px;
  color: var(--ink-900, #0A1F1C); padding: 9px 12px; cursor: pointer;
}
.clr-nav-user-menu button:hover{ background: var(--bg, #FAFAF7); }
.clr-mobile-auth{ display: flex; flex-direction: column; border-top: 1px solid var(--line, #E5E5E0); margin-top: 6px; padding-top: 6px; }
`;

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

function UserMenu({ user, onNavigate }) {
  const [open, setOpen] = useState(false);
  const label = user.fullName || user.email;

  return (
    <div className="clr-nav-user">
      <button
        type="button"
        className="clr-nav-user-btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {label}
      </button>
      {open && (
        <div className="clr-nav-user-menu">
          <span className="clr-nav-user-email">{user.email}</span>
          <form
            action="/logout"
            method="POST"
            onSubmit={() => {
              setOpen(false);
              onNavigate?.();
            }}
          >
            <button type="submit">Cerrar sesión</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function Navbar({ user }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const isActive = (item) => path.startsWith(item.route);
  const navAria = (active) => (active ? { "aria-current": "page" } : {});

  return (
    <nav className="clr-nav" aria-label="Menú principal">
      <style dangerouslySetInnerHTML={{ __html: AUTH_CSS }} />
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

        <div className="clr-nav-auth">
          {user ? (
            <UserMenu user={user} />
          ) : (
            <>
              <Link href="/login" className="clr-nav-auth-link">Ingresar</Link>
              <Link href="/registro" className="clr-nav-auth-cta">Crear cuenta</Link>
            </>
          )}
        </div>

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
        <div className="clr-mobile-auth">
          {user ? (
            <>
              <span className="clr-nav-user-email">{user.email}</span>
              <form action="/logout" method="POST" onSubmit={close}>
                <button type="submit" className="clr-mobile-link" style={{ width: "100%" }}>
                  Cerrar sesión
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="clr-mobile-link" onClick={close}>Ingresar</Link>
              <Link href="/registro" className="clr-mobile-link" onClick={close}>Crear cuenta</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
