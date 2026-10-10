"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MENU_CUENTA, NAV_PRINCIPAL, NOMBRE_POR_ID, ruta } from "./landing/seccionesHome";
import FormCerrarSesion from "./auth/FormCerrarSesion";

// Las pestañas del navbar ya NO se declaran aquí: salen de `NAV_PRINCIPAL`
// (seccionesHome.js), el mismo catálogo del que come el pie. Antes eran dos
// listas independientes —cinco destinos arriba, cuatro distintos abajo— y nadie
// podía decir cuál era la navegación del producto.
//
// Se cayó también la numeración `01/ 02/`: sugería una secuencia que no existe,
// como si hubiera que pasar por Licitaciones antes que por Pliegos.
//
// `route` existe aparte de `href` porque el resaltado activo es por prefijo y no
// por igualdad: /diagnostico/historial debe pintar su sección como activa.
// Lo que exige cuenta NO está aquí: vive en el menú de usuario (MENU_CUENTA).
const NAV_ITEMS = NAV_PRINCIPAL.map((id) => {
  const seccion = ruta(id);
  return { href: seccion.href, route: seccion.href, label: NOMBRE_POR_ID[id] };
});

// Lo que solo existe con sesión. Se renderiza en dos sitios (el dropdown del
// avatar en escritorio y el menú hamburguesa en móvil) y por eso se construye
// una vez: una versión anterior solo lo tenía en el dropdown, que está en
// display:none por debajo de 1024px — un usuario con sesión en móvil no tenía
// forma de llegar a su perfil, sus coincidencias ni sus filtros.
//
// Los ids salen de MENU_CUENTA (seccionesHome.js): era la tercera lista de
// navegación escrita a mano en este archivo, y la única que enlazaba rutas que
// el catálogo no conocía.
const ACCOUNT_ITEMS = MENU_CUENTA.map((id) => ({
  href: ruta(id).href,
  label: NOMBRE_POR_ID[id],
}));

// El único destino que la portada persigue. Por debajo de 1024px el navbar
// esconde toda la navegación en la hamburguesa; dejar "Fichas de procesos" fuera
// del menú es la diferencia entre un destino y un destino que hay que buscar.
const RUTA_EXPLORAR = ruta("explorar");

const AUTH_CSS = `
.clr-nav-auth{ display: none; align-items: center; gap: 10px; margin-left: 8px; }
@media (min-width: 1024px) {
  .clr-nav-auth{ display: flex; }
}
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
.clr-nav-explorar{
  display: flex; align-items: center; margin-left: auto;
  font: 600 11px var(--font-mono, monospace); letter-spacing: .1em;
  text-transform: uppercase; white-space: nowrap;
  color: #fff; background: var(--accent, #0369A1); text-decoration: none;
  padding: 0 12px; min-height: 34px;
}
.clr-nav-explorar:hover{ opacity: .9; }
@media (min-width: 1024px) { .clr-nav-explorar{ display: none; } }
/* .clr-nav-inner es flex con dos hijos con margin-left:auto por debajo de
   1024px (este enlace y .clr-hamburger, esta última desde app/globals.css):
   en flexbox varios márgenes auto en la misma línea se reparten el espacio
   libre entre ellos, no se lo queda el primero. El resultado era un hueco
   entre los dos en vez de quedar pegados a la derecha. Se anula aquí el de
   la hamburguesa (no en app/globals.css) porque este <style> se inyecta
   después de la hoja global y a igual especificidad gana el cascade — mismo
   razonamiento que la banda 1024-1199px de arriba. Por encima de 1024px la
   hamburguesa está en display:none, así que no se toca donde importa. */
@media (max-width: 1023px) { .clr-hamburger{ margin-left: 0; } }
/* Banda estrecha de escritorio (1024-1199px) — la contraparte de la regla
   del mismo rango en app/globals.css, donde está explicado el porqué. Vive
   aquí y no allí porque este <style> se inyecta después de la hoja global y
   una media query no añade especificidad: allí perdería el cascade. */
@media (min-width: 1024px) and (max-width: 1199px) {
  .clr-nav-auth{ gap: 6px; margin-left: 4px; }
  .clr-nav-auth-link{ padding: 6px 6px; }
  .clr-nav-auth-cta{ padding: 7px 10px; }
}
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
  border-radius: 50%; background: var(--success); border: 1.5px solid #fff;
}
.clr-avatar-badge{
  position: absolute; top: -1px; right: -1px; width: 9px; height: 9px;
  border-radius: 50%; background: var(--accent, #0369A1); border: 1.5px solid #fff;
}
.clr-nav-user-btn:focus-visible{ outline: 2px solid var(--accent, #0369A1); outline-offset: 2px; border-radius: 50%; }
.clr-nav-user-menu{
  position: absolute; top: calc(100% + 10px); right: 0; width: 280px;
  max-width: calc(100vw - 2 * var(--gutter, 16px));
  background: var(--surface, #fff); border: 1px solid var(--line, #E5E5E0);
  border-radius: 14px; overflow: hidden;
  box-shadow: 0 18px 40px -12px rgba(6,20,35,.35), 0 2px 6px rgba(6,20,35,.08);
  display: flex; flex-direction: column; z-index: 60;
  font-family: var(--font-sans, sans-serif);
}
.clr-nav-user-head{
  display: flex; align-items: center; gap: 12px; padding: 14px 16px;
  border-bottom: 1px solid var(--line, #E5E5E0);
}
.clr-nav-user-head .clr-avatar, .clr-nav-user-head .clr-avatar-img,
.clr-nav-user-head .clr-avatar-fallback{ width: 38px; height: 38px; }
.clr-nav-user-name{
  font: 600 14px var(--font-sans, sans-serif); color: var(--ink-900, #0A1F1C);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.clr-nav-user-email{
  font: 400 12px var(--font-sans, sans-serif); color: var(--ink-600, #525B5A);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.clr-nav-user-list{ display: flex; flex-direction: column; padding: 6px; }
.clr-nav-user-menu button, .clr-nav-user-menu a{
  background: none; border: none; text-align: left;
  font: 500 14px var(--font-sans, sans-serif);
  color: var(--ink-900, #0A1F1C); padding: 10px 12px; cursor: pointer;
  text-decoration: none; display: flex; align-items: center; justify-content: space-between;
  width: 100%; border-radius: 8px; box-sizing: border-box;
}
.clr-nav-user-menu button:hover, .clr-nav-user-menu a:hover,
.clr-nav-user-menu button:focus-visible, .clr-nav-user-menu a:focus-visible{ background: rgba(3,105,161,.08); outline: none; }
.clr-nav-user-menu a[aria-current="page"]{ color: var(--accent, #0369A1); background: rgba(3,105,161,.08); }
.clr-nav-user-new{
  font: 600 10.5px var(--font-sans, sans-serif); color: #fff; background: var(--accent-fill, #0369A1);
  border-radius: 999px; padding: 2px 8px;
}
.clr-nav-user-sep{ border-top: 1px solid var(--line, #E5E5E0); }
.clr-nav-user-foot{ padding: 6px; }
.clr-nav-user-foot form{ margin: 0; }
.clr-nav-user-foot button{ color: var(--danger, #B91C1C); }
/* En la portada y la ficha la barra es oscura: el menú hace juego. */
.clr-nav--oscuro .clr-nav-user-menu{
  background: #0b1b2b; border-color: rgba(140,190,225,.2);
  box-shadow: 0 18px 40px -12px rgba(0,0,0,.6), 0 0 0 1px rgba(76,201,255,.06);
}
.clr-nav--oscuro .clr-nav-user-menu .clr-nav-user-head,
.clr-nav--oscuro .clr-nav-user-menu .clr-nav-user-sep{ border-color: rgba(140,190,225,.14); }
.clr-nav--oscuro .clr-nav-user-menu .clr-nav-user-name{ color: #f3f8fc; }
.clr-nav--oscuro .clr-nav-user-menu .clr-nav-user-email{ color: #9fb4c6; }
.clr-nav--oscuro .clr-nav-user-menu a, .clr-nav--oscuro .clr-nav-user-menu button{ color: #dbe7f1; }
.clr-nav--oscuro .clr-nav-user-menu a:hover, .clr-nav--oscuro .clr-nav-user-menu button:hover,
.clr-nav--oscuro .clr-nav-user-menu a:focus-visible, .clr-nav--oscuro .clr-nav-user-menu button:focus-visible{ background: rgba(255,255,255,.07); color: #fff; }
.clr-nav--oscuro .clr-nav-user-menu a[aria-current="page"]{ color: #4cc9ff; background: rgba(76,201,255,.12); }
.clr-nav--oscuro .clr-nav-user-foot button{ color: #ff9b9b; }
.clr-nav--oscuro .clr-nav-user-new{ color: #061423; background: #4cc9ff; }
/* ── Tema oscuro de la portada ────────────────────────────────────────────
   En "/" la barra se apoya sobre el hero, que es azul noche: una franja crema
   encima lo partía en dos webs pegadas. Solo ahí: el resto del producto (la
   ficha, las facetas, las cuentas) es claro y la barra clara le pertenece.
   Los colores son los del hero (hero-territorial.module.css), no tokens de
   globals.css, por la misma razón que el hero.

   Píldora flotante (2026-10-04): la barra no ocupa el ancho ni se separa con
   una línea; el <nav> pinta el fondo de la portada (#061423, igual que el
   hero, así que no se ve) y .clr-nav-inner es la píldora, con un borde tenue y
   un resplandor azul debajo en vez de sombra negra. Mide 16px más que
   --nav-h: es el aire alrededor de la píldora. Enlaces al centro y el botón en
   blanco sobre la noche, el inverso del fondo. Contrastes medidos en
   contraste-oscuro.test.ts contra el fondo de la píldora. */
.clr-nav--oscuro{
  background: #061423;
  -webkit-backdrop-filter: none; backdrop-filter: none;
  border-bottom: none;
  height: calc(var(--nav-h) + 16px);
  padding: 10px var(--gutter) 6px;
}
.clr-nav--oscuro .clr-nav-inner{
  position: relative;
  max-width: 1320px; height: 100%;
  padding: 0 7px 0 16px;
  border-radius: 999px;
  background: rgba(12, 32, 52, 0.8);
  -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
  border: 1px solid rgba(140, 190, 225, 0.16);
  box-shadow:
    0 12px 36px -14px rgba(76, 201, 255, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
.clr-nav--oscuro .clr-links{ margin-left: auto; margin-right: auto; }
.clr-nav--oscuro .clr-nav-auth{ margin-left: 0; }
.clr-nav--oscuro .clr-logo-text{ color: #f3f8fc; }
/* En la portada no va "En línea" (2026-09-27): su punto late sin parar y era
   una de las 15 animaciones del primer pliegue. El resto del sitio lo conserva. */
.clr-nav--oscuro .clr-status,
.clr-nav--oscuro .clr-nav-divider{ display: none; }
.clr-nav--oscuro .clr-nav-link{ color: #c3d3e0; border-radius: 999px; padding: 7px 14px; }
.clr-nav--oscuro .clr-nav-link:hover{ color: #fff; background: rgba(255, 255, 255, 0.06); }
.clr-nav--oscuro .clr-nav-link[aria-current="page"]{ color: #4cc9ff; background: rgba(76, 201, 255, 0.12); }
.clr-nav--oscuro .clr-nav-cote{ display: none; }
.clr-nav--oscuro .clr-nav-auth-link{ color: #c3d3e0; }
.clr-nav--oscuro .clr-nav-auth-link:hover{ color: #fff; }
.clr-nav--oscuro .clr-nav-auth-cta,
.clr-nav--oscuro .clr-nav-explorar{
  font: 600 13px var(--font-inter), sans-serif; letter-spacing: 0; text-transform: none;
  color: #061423; background: #f3f8fc; border-radius: 999px;
}
.clr-nav--oscuro .clr-nav-auth-cta{ padding: 9px 18px; }
.clr-nav--oscuro .clr-nav-explorar{ padding: 0 16px; }
.clr-nav--oscuro .clr-nav-auth-cta:hover,
.clr-nav--oscuro .clr-nav-explorar:hover{ opacity: 1; background: #ffffff; }
.clr-nav--oscuro .clr-hamburger{ border-color: rgba(140, 190, 225, 0.3); border-radius: 999px; width: 34px; height: 34px; }
.clr-nav--oscuro .clr-hamburger-icon span{ background: #c3d3e0; }
.clr-nav--oscuro .clr-hamburger-icon.open span{ background: #4cc9ff; }
/* El menú móvil cuelga de la píldora como una tarjeta redondeada, no como
   una franja de borde a borde. */
.clr-nav--oscuro .clr-mobile-menu{
  top: calc(100% - 2px); left: var(--gutter); right: var(--gutter);
  background: #0b1b2b; border: 1px solid rgba(140, 190, 225, 0.16);
  border-radius: 20px;
}
.clr-nav--oscuro .clr-mobile-menu:not(.open){ border-color: transparent; }
.clr-nav--oscuro .clr-mobile-link{ color: #c3d3e0; border-bottom-color: rgba(140, 190, 225, 0.12); }
.clr-nav--oscuro .clr-mobile-link:hover,
.clr-nav--oscuro .clr-mobile-link[aria-current="page"]{ color: #4cc9ff; }
.clr-nav--oscuro .clr-mobile-auth{ border-top-color: rgba(140, 190, 225, 0.14); }
.clr-nav--oscuro .clr-mobile-user .clr-nav-user-name{ color: #f3f8fc; }
.clr-nav--oscuro .clr-mobile-user .clr-nav-user-email{ color: #9fb4c6; }
.clr-nav--oscuro .clr-avatar-dot,
.clr-nav--oscuro .clr-avatar-badge{ border-color: #061423; }
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

function Avatar({ user, withDot, hasNew }) {
  const label = initials(user.fullName, user.email);
  return (
    <span className="clr-avatar">
      {user.avatarUrl ? (
        <img className="clr-avatar-img" src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />
      ) : (
        <span className="clr-avatar-fallback" aria-hidden="true">
          {label}
        </span>
      )}
      {withDot && <span className="clr-avatar-dot" title="Conectado" />}
      {hasNew && <span className="clr-avatar-badge" title="Tienes coincidencias nuevas" />}
    </span>
  );
}

function ValveGlyph() {
  return (
    <svg
      viewBox="0 0 26 26"
      width="15"
      height="15"
      fill="none"
      stroke="#fff"
      strokeWidth="1.6"
      aria-hidden="true"
    >
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

function UserMenu({ user, hasNewMatches }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const path = usePathname();

  // Se cierra al navegar, con clic fuera y con Escape (devolviendo el foco al
  // botón): antes solo cerraba al volver a pulsar el avatar, así que se
  // quedaba abierto tapando la página.
  useEffect(() => {
    setOpen(false);
  }, [path]);

  useEffect(() => {
    if (!open) return undefined;
    const fuera = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const tecla = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        ref.current?.querySelector(".clr-nav-user-btn")?.focus();
      }
    };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [open]);

  return (
    <div className="clr-nav-user" ref={ref}>
      <button
        type="button"
        className="clr-nav-user-btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Menú de cuenta"
      >
        <Avatar user={user} withDot hasNew={hasNewMatches} />
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
          <div className="clr-nav-user-list">
            {ACCOUNT_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                {...(path.startsWith(item.href) ? { "aria-current": "page" } : {})}
              >
                {item.label}
                {hasNewMatches && item.href === "/mis-coincidencias" && (
                  <span className="clr-nav-user-new">Nuevas</span>
                )}
              </Link>
            ))}
          </div>
          <div className="clr-nav-user-sep" aria-hidden="true" />
          {/* Sin cerrar el dropdown al enviar: el submit navega fuera de la
              página (redirect a /), y cerrarlo acá desmontaría el <form> a
              mitad del envío ("Form submission canceled because the form is
              not connected"). FormCerrarSesion solo borra el perfil local. */}
          <div className="clr-nav-user-foot">
            <FormCerrarSesion>
              <button type="submit">Cerrar sesión</button>
            </FormCerrarSesion>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * La sesión se pide desde el navegador, no llega por props.
 *
 * Antes la resolvía `app/layout.js` en el servidor, lo que obligaba al layout a
 * usar `cookies()` y volvía dinámica cada página que envuelve — incluidas las
 * rutas facetadas, que son estáticas a propósito. El 2026-09-15 eso las tumbó en
 * producción con 500. El porqué largo está en `app/api/sesion/route.ts`.
 *
 * Arranca en `null`, que es exactamente lo que debe renderizarse en el HTML
 * cacheado y compartido: la barra de un visitante anónimo. Cuando la respuesta
 * llega, el avatar aparece. El layout persiste entre navegaciones del App
 * Router, así que esto se pide una vez por carga, no en cada página.
 */
function useSesion() {
  const [sesion, setSesion] = useState({ user: null, hasNewMatches: false });

  useEffect(() => {
    let vigente = true;
    fetch("/api/sesion")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (vigente && d) setSesion(d);
      })
      .catch(() => {
        // Sin sesión legible se sigue mostrando la barra de anónimo, que es el
        // estado inicial: no hay nada que deshacer ni que avisar.
      });
    return () => {
      vigente = false;
    };
  }, []);

  return sesion;
}

export default function Navbar() {
  const { user, hasNewMatches } = useSesion();
  const path = usePathname();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const isActive = (item) => path.startsWith(item.route);
  // El hero de portada y la ficha comparten la superficie oscura.
  const oscura = path === "/" || /^\/licitaciones\/[^/]*CO1\.[A-Z]+\.\d+$/i.test(path);
  const navAria = (active) => (active ? { "aria-current": "page" } : {});

  return (
    <nav className={`clr-nav${oscura ? " clr-nav--oscuro" : ""}`} aria-label="Menú principal">
      <style dangerouslySetInnerHTML={{ __html: AUTH_CSS }} />
      <div className="clr-nav-inner">
        <Link href="/" className="clr-logo" onClick={close} aria-label="AquaLicita inicio">
          <span className="clr-logo-mark">
            <ValveGlyph />
          </span>
          {/* El wordmark iba truncado a propósito ("ydroStack"): el cuadro con
              el glifo de válvula hacía de "H" inicial. Con "AquaLicita" ese
              juego no se sostiene, así que el glifo pasa a ser un ícono y el
              wordmark se escribe completo. Rebrand 2026-08-26. */}
          <span className="clr-logo-text">AquaLicita</span>
        </Link>

        <span className="clr-status" title="Sistema activo">
          <span className="clr-status-dot" aria-hidden="true" />
          <span className="clr-status-label">En línea</span>
        </span>

        <span className="clr-nav-divider" aria-hidden="true" />

        {/* .clr-links ya trae margin-left:auto en globals.css — por eso el
            bloque de auth no lo lleva inline. */}
        <div className="clr-links">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="clr-nav-link"
              onClick={close}
              {...navAria(isActive(item))}
            >
              {item.label}
              <CoteGlyph />
            </Link>
          ))}
        </div>

        <div className="clr-nav-auth">
          {user ? (
            <UserMenu user={user} hasNewMatches={hasNewMatches} />
          ) : (
            <>
              <Link href="/login" className="clr-nav-auth-link">
                Ingresar
              </Link>
              <Link href="/registro" className="clr-nav-auth-cta">
                Crear cuenta
              </Link>
            </>
          )}
        </div>

        {/* "Fichas" a secas: "Fichas de procesos" no cabe junto al logo y la
            hamburguesa a 360px. El nombre completo va en aria-label. */}
        <Link
          href={RUTA_EXPLORAR.href}
          className="clr-nav-explorar"
          onClick={close}
          aria-label={NOMBRE_POR_ID.explorar}
        >
          Fichas
        </Link>

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
            {item.label}
          </Link>
        ))}
        <div className="clr-mobile-auth">
          {user ? (
            <>
              <div className="clr-mobile-user">
                <Avatar user={user} withDot hasNew={hasNewMatches} />
                <div style={{ minWidth: 0 }}>
                  <div className="clr-nav-user-name">{user.fullName || user.email}</div>
                  <div className="clr-nav-user-email">{user.email}</div>
                </div>
              </div>
              {ACCOUNT_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="clr-mobile-link"
                  {...navAria(isActive({ route: item.href }))}
                  onClick={close}
                >
                  {item.label}
                </Link>
              ))}
              <FormCerrarSesion onSubmit={close}>
                <button type="submit" className="clr-mobile-link" style={{ width: "100%" }}>
                  Cerrar sesión
                </button>
              </FormCerrarSesion>
            </>
          ) : (
            <>
              <Link href="/login" className="clr-mobile-link" onClick={close}>
                Ingresar
              </Link>
              <Link href="/registro" className="clr-mobile-link" onClick={close}>
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
