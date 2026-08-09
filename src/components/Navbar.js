"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/licitaciones", route: "/licitaciones", index: "01", label: "Licitaciones" },
  { href: "/pliego", route: "/pliego", index: "02", label: "Pliegos" },
  { href: "/nosotros", route: "/nosotros", index: "03", label: "Nosotros" },
  { href: "/soluciones", route: "/soluciones", index: "04", label: "Soluciones" },
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
  cursor: pointer; padding: 4px;
}
.clr-avatar{
  position: relative; width: 30px; height: 30px; flex-shrink: 0;
}
.clr-avatar-img{
  width: 30px; height: 30px; border-radius: 50%; object-fit: cover;
  border: 1.5px solid var(--line, #E5E5E0); display: block;
}
.clr-avatar-fallback{
  width: 30px; height: 30px; border-radius: 50%;
  background: linear-gradient(135deg, var(--accent, #0369A1), #075985);
  color: #fff; font: 500 12px var(--font-sans, sans-serif);
  display: flex; align-items: center; justify-content: center;
}
.clr-avatar-dot{
  position: absolute; bottom: -1px; right: -1px; width: 9px; height: 9px;
  border-radius: 50%; background: #16a34a; border: 1.5px solid #fff;
}
.clr-nav-user-menu{
  position: absolute; top: calc(100% + 6px); right: 0; min-width: 220px;
  background: var(--surface, #fff); border: 1px solid var(--line, #E5E5E0);
  box-shadow: 0 4px 12px rgba(0,0,0,.08);
  display: flex; flex-direction: column; z-index: 20;
}
.clr-nav-user-head{
  display: flex; align-items: center; gap: 10px; padding: 12px 14px;
  border-bottom: 1px solid var(--line, #E5E5E0);
}
.clr-nav-user-name{
  font-size: 13px; font-weight: 500; color: var(--ink-900, #0A1F1C);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.clr-nav-user-email{
  font: 11px var(--font-mono, monospace); color: var(--ink-600, #525B5A);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.clr-nav-user-menu button{
  background: none; border: none; text-align: left; font-size: 12.5px;
  color: var(--ink-900, #0A1F1C); padding: 9px 14px; cursor: pointer;
}
.clr-nav-user-menu button:hover{ background: var(--bg, #FAFAF7); }
.clr-mobile-auth{ display: flex; flex-direction: column; border-top: 1px solid var(--line, #E5E5E0); margin-top: 6px; padding-top: 10px; gap: 8px; }
.clr-mobile-user{ display: flex; align-items: center; gap: 10px; padding: 0 4px 6px; }
`;

function initials(fullName, email) {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
  }
  return (email?.[0] ?? "?").toUpperCase();
}

function Avatar({ user, withDot }) {
  const label = initials(user.fullName, user.email);
  return (
    <span className="clr-avatar">
      {user.avatarUrl ? (
        <img className="clr-avatar-img" src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />
      ) : (
        <span className="clr-avatar-fallback" aria-hidden="true">{label}</span>
      )}
      {withDot && <span className="clr-avatar-dot" title="Conectado" />}
    </span>
  );
}

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

function UserMenu({ user }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="clr-nav-user">
      <button
        type="button"
        className="clr-nav-user-btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Menú de cuenta"
      >
        <Avatar user={user} withDot />
      </button>
      {open && (
        <div className="clr-nav-user-menu">
          <div className="clr-nav-user-head">
            <Avatar user={user} />
            <div style={{ minWidth: 0 }}>
              <div className="clr-nav-user-name">{user.fullName || user.email}</div>
              <div className="clr-nav-user-email">{user.email}</div>
            </div>
          </div>
          {/* Sin onSubmit: el submit navega fuera de la página (redirect a /),
              cerrar el dropdown acá desmontaría el <form> a mitad del envío
              ("Form submission canceled because the form is not connected"). */}
          <form action="/logout" method="POST">
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
              <div className="clr-mobile-user">
                <Avatar user={user} withDot />
                <div style={{ minWidth: 0 }}>
                  <div className="clr-nav-user-name">{user.fullName || user.email}</div>
                  <div className="clr-nav-user-email">{user.email}</div>
                </div>
              </div>
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
