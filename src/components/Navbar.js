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
// El menú se agrupa por lo que la persona hace hoy en el sitio, no por el
// orden en que se fueron creando las páginas: seguir procesos (guardados,
// coincidencias con su perfil, filtros), prepararse (perfil RUP y diagnóstico)
// y la cuenta (alertas). `label` cambia el nombre solo aquí; el catálogo
// (NOMBRE_POR_ID) lo siguen usando el pie y /precios.
const GRUPOS_CUENTA = [
  {
    titulo: "Seguimiento",
    items: [{ id: "mis-procesos" }, { id: "coincidencias" }, { id: "filtros" }],
  },
  {
    titulo: "Preparación",
    items: [{ id: "perfil" }, { id: "diagnostico-historial", label: "Mi diagnóstico" }],
  },
  {
    titulo: "Cuenta",
    items: [{ id: "alertas", label: "Alertas y cuenta" }],
  },
]
  .map((g) => ({
    ...g,
    items: g.items
      .filter((i) => MENU_CUENTA.includes(i.id))
      .map((i) => ({ href: ruta(i.id).href, label: i.label || NOMBRE_POR_ID[i.id] })),
  }))
  .filter((g) => g.items.length > 0);

// Solo en la portada (barra del boceto V3.1): dos accesos más a páginas que
// existen. No son del catálogo de secciones porque no son del producto de
// licitaciones: uno es informativo y el otro la guía de participación.
const ENLACES_PORTADA = [
  {
    href: "/gemelos-digitales",
    route: "/gemelos-digitales",
    label: "Gemelos digitales",
    extra: true,
  },
  {
    href: "/licitaciones/como-participar",
    route: "/licitaciones/como-participar",
    label: "Cómo funciona",
    extra: true,
  },
];

const ACCOUNT_ITEMS = GRUPOS_CUENTA.flatMap((g) => g.items);

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
.clr-nav-user-list{ display: flex; flex-direction: column; padding: 4px 6px; }
.clr-nav-user-list + .clr-nav-user-list{ border-top: 1px solid var(--line, #E5E5E0); }
.clr-nav-user-group{
  font: 600 10.5px var(--font-sans, sans-serif); letter-spacing: .08em; text-transform: uppercase;
  color: var(--ink-600, #525B5A); padding: 8px 12px 2px;
}
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
.clr-nav--oscuro .clr-nav-user-list + .clr-nav-user-list{ border-color: rgba(140,190,225,.14); }
.clr-nav--oscuro .clr-nav-user-group{ color: #8fa6ba; }
.clr-nav--oscuro .clr-nav-user-menu .clr-nav-user-sep{ border-color: rgba(140,190,225,.14); }
.clr-nav--oscuro .clr-nav-user-menu .clr-nav-user-name{ color: #f3f8fc; }
.clr-nav--oscuro .clr-nav-user-menu .clr-nav-user-email{ color: #9fb4c6; }
.clr-nav--oscuro .clr-nav-user-menu a, .clr-nav--oscuro .clr-nav-user-menu button{ color: #dbe7f1; }
.clr-nav--oscuro .clr-nav-user-menu a:hover, .clr-nav--oscuro .clr-nav-user-menu button:hover,
.clr-nav--oscuro .clr-nav-user-menu a:focus-visible, .clr-nav--oscuro .clr-nav-user-menu button:focus-visible{ background: rgba(255,255,255,.07); color: #fff; }
.clr-nav--oscuro .clr-nav-user-menu a[aria-current="page"]{ color: #4cc9ff; background: rgba(76,201,255,.12); }
.clr-nav--oscuro .clr-nav-user-foot button{ color: #ff9b9b; }
.clr-nav--oscuro .clr-nav-user-new{ color: #061423; background: #4cc9ff; }
/* ── Barra oscura (portada y ficha) ────────────────────────────────────────
   En "/" y en la ficha la barra se apoya sobre una superficie azul noche: una
   franja crema encima la partía en dos webs pegadas. El resto del producto es
   claro y la barra clara le pertenece. Los colores son los del hero
   (hero-territorial.module.css), no tokens de globals.css.

   Tres zonas (2026-11-11): la marca con su lema debajo, los enlaces juntos en
   una cápsula al centro y la cuenta a la derecha. Ningún enlace parte en dos
   líneas: los dos accesos extra de la portada solo salen donde caben. Arriba
   del todo la barra es del color con que empieza el hero, para leerse como una
   sola pieza; al desplazar pasa a vidrio translúcido con su línea y su sombra
   (atributo data-scrolled). Mide 16px más que --nav-h. Contrastes medidos en
   contraste-oscuro.test.ts contra el vidrio, el caso menos favorable. */
.clr-nav--oscuro{
  background: #05203a;
  border-bottom: 1px solid transparent;
  height: calc(var(--nav-h) + 16px);
  padding: 8px var(--gutter);
  transition: background-color .3s ease, border-color .3s ease, box-shadow .3s ease;
}
.clr-nav--oscuro[data-scrolled]{
  background: rgba(3, 22, 37, 0.86);
  -webkit-backdrop-filter: blur(14px) saturate(1.3); backdrop-filter: blur(14px) saturate(1.3);
  border-bottom-color: rgba(140, 190, 225, 0.14);
  box-shadow: 0 14px 34px -22px rgba(0, 0, 0, 0.9);
}
.clr-nav--oscuro .clr-nav-inner{
  position: relative;
  max-width: 1320px; height: 100%;
  padding: 0; gap: 16px;
  background: transparent; border: 0; box-shadow: none;
}
/* La marca: el glifo en un azulejo luminoso y, debajo del nombre, el lema. */
.clr-logo-words{ display: flex; flex-direction: column; justify-content: center; line-height: 1; }
.clr-logo-sub{ display: none; }
.clr-nav--oscuro .clr-logo{ gap: 11px; }
.clr-nav--oscuro .clr-logo-mark{
  width: 32px; height: 32px; border-radius: 10px;
  background: linear-gradient(150deg, #2fe3ff 0%, #0a8fd6 55%, #0272b0 100%);
  box-shadow: 0 8px 20px -8px rgba(0, 217, 244, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.4);
}
.clr-nav--oscuro .clr-logo-mark::after{ border-color: #00d9f4; border-radius: 13px; }
.clr-nav--oscuro .clr-logo-text{ color: #f3f8fc; font-size: 16px; letter-spacing: -0.015em; }
@media (min-width: 1200px){
  .clr-nav--oscuro .clr-logo-sub{
    display: block; margin-top: 4px; color: #aec2d2;
    font: 600 9.5px/1 var(--font-inter), sans-serif; letter-spacing: .16em; text-transform: uppercase;
    white-space: nowrap;
  }
}
.clr-nav--oscuro .clr-nav-divider{ display: none; }
/* En la portada no va "En línea" (2026-09-27): su punto late sin parar. El
   resto del sitio lo conserva. */
.clr-nav--oscuro .clr-status{ display: none; }
/* Los enlaces, en una cápsula: se leen como un grupo y el activo se llena. */
.clr-nav--oscuro .clr-links{
  margin-left: auto; margin-right: auto; gap: 2px; padding: 4px;
  border: 1px solid rgba(140, 190, 225, 0.16); border-radius: 999px;
  background: rgba(8, 32, 54, 0.62);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
.clr-nav--oscuro .clr-nav-link{
  color: #c3d3e0; border-radius: 999px; padding: 8px 14px; white-space: nowrap;
  transition: color .18s, background-color .18s;
}
.clr-nav--oscuro .clr-nav-link:hover{ color: #fff; background: rgba(255, 255, 255, 0.08); }
.clr-nav--oscuro .clr-nav-link[aria-current="page"]{ color: #031625; background: #00d9f4; font-weight: 600; }
.clr-nav--oscuro .clr-nav-link:focus-visible{ outline: 2px solid #00d9f4; outline-offset: 2px; }
.clr-nav--oscuro .clr-nav-cote{ display: none; }
/* Los dos accesos extra de la portada, solo donde caben en una línea. */
@media (max-width: 1339px){ .clr-nav-link--extra{ display: none; } }
@media (min-width: 1024px) and (max-width: 1199px){
  .clr-nav--oscuro .clr-nav-inner{ gap: 10px; }
  .clr-nav--oscuro .clr-nav-link{ padding: 8px 10px; font-size: 13px; }
}
.clr-nav--oscuro .clr-nav-auth{ margin-left: 0; gap: 6px; }
.clr-nav--oscuro .clr-nav-auth-link{
  color: #c3d3e0; font: 500 13.5px var(--font-inter), sans-serif;
  padding: 9px 14px; border-radius: 999px; transition: color .18s, background-color .18s;
}
.clr-nav--oscuro .clr-nav-auth-link:hover{ color: #fff; background: rgba(255, 255, 255, 0.08); }
.clr-nav--oscuro .clr-nav-auth-cta,
.clr-nav--oscuro .clr-nav-explorar{
  font: 600 13px var(--font-inter), sans-serif; letter-spacing: 0; text-transform: none;
  color: #031625; background: #00d9f4; border-radius: 999px;
}
.clr-nav--oscuro .clr-nav-auth-cta{
  padding: 10px 20px; font-size: 13.5px;
  box-shadow: 0 8px 22px -10px rgba(0, 217, 244, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.45);
  transition: background-color .18s, transform .25s cubic-bezier(.2, .8, .2, 1), box-shadow .25s;
}
.clr-nav--oscuro .clr-nav-explorar{ padding: 0 16px; }
.clr-nav--oscuro .clr-nav-auth-cta:hover,
.clr-nav--oscuro .clr-nav-explorar:hover{ opacity: 1; background: #4de6f8; }
.clr-nav--oscuro .clr-nav-auth-cta:hover{ transform: translateY(-1px); }
.clr-nav--oscuro .clr-nav-auth-link:focus-visible,
.clr-nav--oscuro .clr-nav-auth-cta:focus-visible,
.clr-nav--oscuro .clr-nav-explorar:focus-visible{ outline: 2px solid #f3f8fc; outline-offset: 2px; }
.clr-nav--oscuro .clr-hamburger{ border-color: rgba(140, 190, 225, 0.3); border-radius: 999px; width: 36px; height: 36px; }
.clr-nav--oscuro .clr-hamburger-icon span{ background: #c3d3e0; }
.clr-nav--oscuro .clr-hamburger-icon.open span{ background: #4cc9ff; }
@media (prefers-reduced-motion: reduce){
  .clr-nav--oscuro, .clr-nav--oscuro *{ transition: none !important; }
}
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
          {GRUPOS_CUENTA.map((g) => (
            <div className="clr-nav-user-list" role="group" aria-label={g.titulo} key={g.titulo}>
              <div className="clr-nav-user-group" aria-hidden="true">
                {g.titulo}
              </div>
              {g.items.map((item) => (
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
          ))}
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

  // La barra oscura cambia de piel al desplazar la página: arriba se funde con
  // el hero; después pasa a vidrio con su línea (`data-scrolled`). React no
  // vuelve a renderizar mientras el valor no cambie.
  const [desplazada, setDesplazada] = useState(false);
  useEffect(() => {
    const leer = () => setDesplazada(window.scrollY > 8);
    leer();
    window.addEventListener("scroll", leer, { passive: true });
    return () => window.removeEventListener("scroll", leer);
  }, []);

  const isActive = (item) => path.startsWith(item.route);
  // El hero de portada y la ficha comparten la superficie oscura.
  const oscura =
    path === "/" ||
    path === "/marketplace" ||
    /^\/licitaciones\/[^/]*CO1\.[A-Z]+\.\d+$/i.test(path);
  const navAria = (active) => (active ? { "aria-current": "page" } : {});

  return (
    <nav
      className={`clr-nav${oscura ? " clr-nav--oscuro" : ""}`}
      aria-label="Menú principal"
      data-scrolled={desplazada ? "" : undefined}
    >
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
          <span className="clr-logo-words">
            <span className="clr-logo-text">AquaLicita</span>
            {/* El lema solo se pinta en la barra oscura y en pantallas anchas. */}
            <span className="clr-logo-sub">Inteligencia SECOP II</span>
          </span>
        </Link>

        <span className="clr-status" title="Sistema activo">
          <span className="clr-status-dot" aria-hidden="true" />
          <span className="clr-status-label">En línea</span>
        </span>

        <span className="clr-nav-divider" aria-hidden="true" />

        {/* .clr-links ya trae margin-left:auto en globals.css — por eso el
            bloque de auth no lo lleva inline. */}
        <div className="clr-links">
          {[...NAV_ITEMS, ...(oscura ? ENLACES_PORTADA : [])].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`clr-nav-link${item.extra ? " clr-nav-link--extra" : ""}`}
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
        {[...NAV_ITEMS, ...(oscura ? ENLACES_PORTADA : [])].map((item) => (
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
