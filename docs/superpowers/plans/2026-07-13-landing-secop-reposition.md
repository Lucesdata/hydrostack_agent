# Landing SECOP Reposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reposicionar la landing de HydroStack (`app/page.js`) para que Licitaciones/SECOP sea el mensaje central, con un nuevo ticker de procesos, hero, secciones de problema/cómo-funciona, y una franja liviana de herramientas de soporte (Calculadoras/Build/Agente) — todo en español, sin selector ES/EN.

**Architecture:** Dos componentes nuevos y autocontenidos en `src/components/landing/` (`mockProcesos.js` + `ProcesosTicker.jsx`, cada uno con su propio `<style>` inyectado). `app/page.js` se reescribe completo siguiendo su propio patrón existente (objeto `S` de estilos inline + bloque `LANDING_CSS` inyectado para pseudo-elementos/keyframes/hover). `Navbar.js` recibe ediciones puntuales: labels a texto fijo en español y el selector de idioma comentado (no borrado).

**Tech Stack:** Next.js 15 (App Router), React, CSS-in-JS vía objetos de estilo inline + `<style dangerouslySetInnerHTML>` (patrón ya usado en el proyecto, sin librerías de animación externas). Sin test runner para componentes de UI (el proyecto solo tiene tests vitest para lógica pura en `src/__tests__/`, ningún test de componentes/JSX existente) — la verificación de este trabajo es visual, vía `npm run lint` + servidor de dev + preview de navegador, siguiendo la instrucción del proyecto (`CLAUDE.md`): "Para cambios de UI o frontend, inicia el servidor de dev y usa la funcionalidad en un navegador antes de reportar la tarea como completa."

**Spec:** `docs/superpowers/specs/2026-07-13-landing-secop-reposition-design.md`

---

### Task 1: `mockProcesos.js` — datos ficticios del ticker

**Files:**
- Create: `src/components/landing/mockProcesos.js`

- [ ] **Step 1: Crear el archivo de datos**

```js
// src/components/landing/mockProcesos.js
// Datos ficticios de procesos de contratación pública del sector agua y
// saneamiento en Colombia. Fácil de reemplazar por datos reales de
// SECOP/Neon Postgres más adelante (mismo shape, `href` pasa de null a
// una ruta real).

const mockProcesos = [
  { id: "p1", entidad: "EAAB",               valor: "$4.850 M", ciudad: "Bogotá",      departamento: "Cundinamarca",   sector: "Alcantarillado",   href: null },
  { id: "p2", entidad: "Aguas de Cartagena",  valor: "$2.310 M", ciudad: "Cartagena",   departamento: "Bolívar",        sector: "PTAR",             href: null },
  { id: "p3", entidad: "EPM",                 valor: "$7.120 M", ciudad: "Medellín",    departamento: "Antioquia",      sector: "Acueducto rural",  href: null },
  { id: "p4", entidad: "Findeter",            valor: "$1.980 M", ciudad: "Bucaramanga", departamento: "Santander",      sector: "PSMV",             href: null },
  { id: "p5", entidad: "Aguas del Huila",     valor: "$980 M",   ciudad: "Neiva",       departamento: "Huila",          sector: "Acueducto rural",  href: null },
  { id: "p6", entidad: "ESP Pasto",           valor: "$1.450 M", ciudad: "Pasto",       departamento: "Nariño",         sector: "Alcantarillado",   href: null },
  { id: "p7", entidad: "Aguas de Cali",       valor: "$3.640 M", ciudad: "Cali",        departamento: "Valle del Cauca",sector: "PTAR",             href: null },
  { id: "p8", entidad: "Aqualia Colombia",    valor: "$620 M",   ciudad: "Montería",    departamento: "Córdoba",        sector: "PSMV",             href: null },
];

export default mockProcesos;
```

- [ ] **Step 2: Verificar lint**

Run: `npm run lint`
Expected: sin errores relacionados a `src/components/landing/mockProcesos.js`.

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/mockProcesos.js
git commit -m "feat(landing): agrega datos mock del ticker de procesos SECOP"
```

---

### Task 2: `ProcesosTicker.jsx` — barra de scroll infinito

**Files:**
- Create: `src/components/landing/ProcesosTicker.jsx`
- Depends on: `src/components/landing/mockProcesos.js` (Task 1)

- [ ] **Step 1: Crear el componente**

```jsx
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
```

- [ ] **Step 2: Verificar lint**

Run: `npm run lint`
Expected: sin errores relacionados a `src/components/landing/ProcesosTicker.jsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/ProcesosTicker.jsx
git commit -m "feat(landing): agrega ProcesosTicker con scroll infinito CSS"
```

---

### Task 3: `Navbar.js` — labels en español y selector de idioma comentado

**Files:**
- Modify: `src/components/Navbar.js`

- [ ] **Step 1: Comentar el import y el hook de `useLang`**

Reemplaza (líneas 1-9 del archivo original):

```js
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useLang } from "@/src/lib/i18n";

export default function Navbar() {
  const { t, toggle } = useLang();
  const path = usePathname();
```

por:

```js
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
// import { useLang } from "@/src/lib/i18n"; // selector ES/EN retirado temporalmente — ver docs/superpowers/specs/2026-07-13-landing-secop-reposition-design.md

export default function Navbar() {
  // const { t, toggle } = useLang(); // reactivar junto con los botones de idioma más abajo
  const path = usePathname();
```

- [ ] **Step 2: Traducir los labels del menú desktop**

Reemplaza:

```jsx
        <div style={S.links} className="hide-mobile">
          <Link href="/calculators" className="clr-nav-link" {...navAria(isCalc)}>
            {t.nav.calculators}
          </Link>
          <Link href="/chat" className="clr-nav-link" {...navAria(isChat)}>
            {t.nav.assistant}
          </Link>
          <Link href="/licitaciones" className="clr-nav-link" {...navAria(isLic)}>
            Licitaciones
          </Link>
          <a href="#about" className="clr-nav-link">
            {t.nav.about}
          </a>
        </div>

        <button className="clr-lang-btn hide-mobile" onClick={toggle}>
          {t.nav.lang}
        </button>
```

por:

```jsx
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
```

- [ ] **Step 3: Traducir los labels del menú móvil y comentar el botón de idioma móvil**

Reemplaza:

```jsx
      <div id="clr-mobile-menu" className={`clr-mobile-menu${open ? " open" : ""}`}>
        <Link href="/calculators" className="clr-mobile-link" {...navAria(isCalc)} onClick={close}>
          {t.nav.calculators}
        </Link>
        <Link href="/chat" className="clr-mobile-link" {...navAria(isChat)} onClick={close}>
          {t.nav.assistant}
        </Link>
        <Link href="/licitaciones" className="clr-mobile-link" {...navAria(isLic)} onClick={close}>
          Licitaciones
        </Link>
        <a href="#about" className="clr-mobile-link" onClick={close}>
          {t.nav.about}
        </a>
        <button className="clr-mobile-lang" onClick={() => { toggle(); close(); }}>
          {t.nav.lang}
        </button>
      </div>
```

por:

```jsx
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
```

- [ ] **Step 4: Verificar lint**

Run: `npm run lint`
Expected: sin errores (sin variables `t`/`toggle` sin usar — quedaron comentadas junto con su declaración).

- [ ] **Step 5: Commit**

```bash
git add src/components/Navbar.js
git commit -m "feat(nav): labels en español y selector ES/EN comentado"
```

---

### Task 4: Reescribir `app/page.js`

**Files:**
- Modify: `app/page.js` (reescritura completa)
- Depends on: Task 2 (`ProcesosTicker`)

- [ ] **Step 1: Reemplazar el contenido completo de `app/page.js`**

```jsx
"use client";
import Link from "next/link";
import ProcesosTicker from "@/src/components/landing/ProcesosTicker";

/* --- Glifos SVG inline (referencia 1:1 con option-b-water.html) --- */

function GlyphCalc({ size = 36 }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ ...S.glyph, width: size, height: size }}>
      <rect x="3" y="10" width="34" height="22" rx="2" />
      <line x1="20" y1="10" x2="20" y2="32" />
      <line x1="3" y1="18" x2="20" y2="18" strokeDasharray="2 2" opacity="0.5" />
      <line x1="20" y1="22" x2="37" y2="22" strokeDasharray="2 2" opacity="0.5" />
      <path d="M3 6 L8 6 L8 10" />
      <path d="M37 6 L32 6 L32 10" />
      <circle cx="14" cy="14" r="0.8" fill="currentColor" />
      <circle cx="28" cy="14" r="0.8" fill="currentColor" />
    </svg>
  );
}

function GlyphBuild({ size = 36 }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ ...S.glyph, width: size, height: size }}>
      <path d="M20 6 L34 14 L34 28 L20 36 L6 28 L6 14 Z" />
      <path d="M20 6 L20 20 M6 14 L20 20 L34 14" />
      <line x1="11" y1="22" x2="11" y2="30" opacity="0.5" />
      <line x1="15" y1="24" x2="15" y2="32" opacity="0.5" />
      <line x1="19" y1="22" x2="19" y2="34" opacity="0.5" />
    </svg>
  );
}

function GlyphAgent({ size = 36 }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ ...S.glyph, width: size, height: size }}>
      <path d="M6 10 L24 10 L24 24 L14 24 L9 28 L9 24 L6 24 Z" />
      <line x1="10" y1="14" x2="20" y2="14" opacity="0.6" />
      <line x1="10" y1="18" x2="18" y2="18" opacity="0.6" />
      <rect x="22" y="18" width="12" height="14" rx="1" />
      <line x1="25" y1="22" x2="31" y2="22" opacity="0.6" />
      <line x1="25" y1="25" x2="31" y2="25" opacity="0.6" />
      <line x1="25" y1="28" x2="29" y2="28" opacity="0.6" />
    </svg>
  );
}

function GlyphTender({ size = 36 }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ ...S.glyph, width: size, height: size }}>
      <path d="M4 28 L10 22 L16 26 L24 14 L36 14" />
      <circle cx="10" cy="22" r="1.6" fill="currentColor" />
      <circle cx="16" cy="26" r="1.6" fill="currentColor" />
      <circle cx="24" cy="14" r="1.6" fill="currentColor" />
      <path d="M4 32 L36 32" opacity="0.4" />
      <path d="M30 30 L30 14" opacity="0.4" strokeDasharray="2 2" />
    </svg>
  );
}

const GLYPHS = { calc: GlyphCalc, build: GlyphBuild, agent: GlyphAgent, tender: GlyphTender };

const MODULES = [
  { n: "01", label: "CALCULADORAS", href: "/calculators", glyph: "calc" },
  { n: "02", label: "BUILD",        href: "/build",        glyph: "build" },
  { n: "03", label: "AGENTE",       href: "/chat",         glyph: "agent" },
  { n: "04", label: "LICITACIONES", href: "/licitaciones", glyph: "tender" },
];

// Franja de herramientas de soporte del cierre: Licitaciones ya es el mensaje
// central de la landing, así que no vuelve a aparecer acá. `GlyphTender`
// queda definido arriba sin uso — no se borra (ver spec 2026-07-13).
const TOOLS_LITE = MODULES.filter((m) => m.glyph !== "tender");

const TOOL_COPY = {
  calc:  { title: "Calculadoras", desc: "Dimensiona fosa séptica, campo de drenaje y mantenimiento." },
  build: { title: "Build",        desc: "Diseño 3D guiado con geolocalización real." },
  agent: { title: "Agente",       desc: "Resuelve dudas técnicas y normativas en lenguaje natural." },
};

const PROBLEM_POINTS = [
  "No sabes si calificas hasta que ya invertiste tiempo en la propuesta.",
  "El pliego tiene decenas de páginas y los requisitos habilitantes se pierden entre ellas.",
  "Un error en el presupuesto descalifica la oferta, sin importar cuánto sabes del proyecto.",
];

const HOW_STEPS = [
  "Explora los procesos activos en agua y saneamiento directamente en HydroStack, sin loguearte en SECOP.",
  "Evalúa tu RUP contra los requisitos habilitantes del proceso que elijas.",
  "Si te falta algo, ves exactamente qué es: experiencia, capacidad financiera, clasificación.",
  "HydroStack decodifica el pliego y te ayuda a estructurar el presupuesto.",
];

const LANDING_CSS = `
.ls-page { background: var(--bg); color: var(--ink-900); font-family: var(--font-sans); }
.ls-hero { position: relative; overflow: hidden; padding: clamp(96px, 12vw, 140px) 0 clamp(72px, 10vw, 100px); }
.ls-hero::before {
  content: ""; position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(15,118,110,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15,118,110,0.04) 1px, transparent 1px);
  background-size: 48px 48px;
  -webkit-mask-image: radial-gradient(ellipse at top right, rgba(0,0,0,0.6), transparent 65%);
  mask-image: radial-gradient(ellipse at top right, rgba(0,0,0,0.6), transparent 65%);
  pointer-events: none;
}
.ls-tag-dot { position: relative; width: 6px; height: 6px; border-radius: 50%; background: var(--accent); display: inline-block; }
.ls-tag-dot::after {
  content: ""; position: absolute; inset: -3px; border-radius: 50%;
  border: 1px solid var(--accent); opacity: .5;
  animation: ls-pulse 2.4s ease-out infinite;
}
@keyframes ls-pulse { 0% { transform: scale(.8); opacity: .8; } 100% { transform: scale(1.6); opacity: 0; } }
.ls-cta-btn {
  display: inline-flex; align-items: center; gap: 8px;
  margin-top: 8px; padding: 13px 24px;
  background: var(--accent); color: #fff;
  font-weight: 600; font-size: 14px;
  border-radius: 10px; text-decoration: none;
  transition: transform .18s, box-shadow .18s;
}
.ls-cta-btn:hover { transform: translateY(-2px); box-shadow: var(--shadow-card-hover); }
.ls-tool-link { text-decoration: none; color: inherit; transition: opacity .18s; }
.ls-tool-link:hover { opacity: .8; }
.ls-tool-link:hover .ls-tool-title { color: var(--accent); }
.ls-footer-wave {
  position: absolute; top: -1px; left: 0; right: 0; height: 2px;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 2' preserveAspectRatio='none'><path d='M0,1 Q30,0 60,1 T120,1' stroke='%230F766E' stroke-width='0.8' fill='none' opacity='0.4'/></svg>");
  background-repeat: repeat-x; background-size: 120px 2px;
}
`;

export default function LandingPage() {
  return (
    <div style={S.page} className="ls-page">
      <style dangerouslySetInnerHTML={{ __html: LANDING_CSS }} />

      <ProcesosTicker />

      <header className="ls-hero">
        <div style={S.container}>
          {/* Mini-bloque de marca (logo H + HydroStack + "ES · EN") retirado:
              es redundante con el logo del Navbar (app/layout.js) y el texto
              "ES · EN" quedaría inconsistente sin selector real.
              Ver docs/superpowers/specs/2026-07-13-landing-secop-reposition-design.md.
          <div style={S.mark}>
            <div style={S.markLogo}>H</div>
            <div style={S.markName}>HydroStack</div>
            <div style={S.markBar} />
            <div style={S.markLang}>ES · EN</div>
          </div>
          */}

          <span style={S.tag}>
            <span className="ls-tag-dot" />
            <span style={{ marginLeft: 8 }}>SECOP · Agua y saneamiento</span>
          </span>

          <h1 className="ls-title" style={S.title}>
            <span style={S.titleLine}>Evalúa si puedes competir.</span>
            <span style={{ ...S.titleLine, ...S.titleLineDim }}>Qué te hace falta para competir.</span>
            <span style={{ ...S.titleLine, ...S.titleLineDim }}>Cómo empezar a competir.</span>
          </h1>

          {/* Badges normativos (Res. 0330/2017, CTE DB-HS 5, ASTM D6391, SECOP II).
              Reservados para reubicar en la sección de calculadoras — no se
              implementa la reubicación acá, esa página no se toca en este trabajo.
              Ver docs/superpowers/specs/2026-07-13-landing-secop-reposition-design.md.
          <div style={S.meta}>
            {[
              { value: "Res. 0330/2017", scope: "CO" },
              { value: "CTE DB-HS 5",    scope: "ES" },
              { value: "ASTM D6391",     scope: "US" },
              { value: "SECOP II",       scope: "datos.gov.co" },
            ].map((m, i, arr) => (
              <div key={i} style={{ ...S.metaItem, ...(i === arr.length - 1 ? S.metaItemLast : null) }}>
                <strong style={S.metaStrong}>{m.value}</strong> · {m.scope}
              </div>
            ))}
          </div>
          */}

          <Link href="/licitaciones" className="ls-cta-btn">
            Prueba un proceso
          </Link>
        </div>
      </header>

      <section style={S.problem}>
        <div style={S.container}>
          <div style={S.problemGrid}>
            {PROBLEM_POINTS.map((p, i) => (
              <div key={i} style={S.problemItem}>
                <span style={S.problemNum}>{String(i + 1).padStart(2, "0")}</span>
                <p style={S.problemText}>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={S.how}>
        <div style={S.container}>
          <div style={S.howLabel}>▸ Cómo funciona</div>
          <ol style={S.howList}>
            {HOW_STEPS.map((s, i) => (
              <li key={i} style={S.howItem}>
                <span style={S.howNum}>{String(i + 1).padStart(2, "0")}</span>
                <p style={S.howText}>{s}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section style={S.pillars}>
        <div style={S.container}>
          <h2 style={S.pillarsH}>Una vez identificas el proceso, HydroStack te acompaña con:</h2>

          <div style={S.toolsRow}>
            {TOOLS_LITE.map((m) => {
              const Glyph = GLYPHS[m.glyph];
              const copy = TOOL_COPY[m.glyph];
              return (
                <Link key={m.n} href={m.href} className="ls-tool-link" style={S.toolItem}>
                  <Glyph size={28} />
                  <span className="ls-tool-title" style={S.toolTitle}>{copy.title}</span>
                  <p style={S.toolDesc}>{copy.desc}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section style={S.closing}>
        <div style={{ ...S.container, ...S.closingInner }}>
          <Link href="/licitaciones" className="ls-cta-btn">
            Prueba un proceso
          </Link>
        </div>
      </section>

      <footer style={S.footer}>
        <div className="ls-footer-wave" />
        <div style={{ ...S.container, ...S.footerInner }}>
          <div style={S.footerLeft}>
            <span style={{ fontWeight: 600, color: "var(--ink-900)" }}>HydroStack</span>
            <span>·</span>
            <span>Plataforma de contratación pública · Agua y saneamiento</span>
          </div>
          <div style={S.footerRight}>
            <span style={S.footerDot} />
            <span>Fase 0.6 · ingesta operativa</span>
            <span>·</span>
            <span>hydrostack.io</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

const S = {
  page: { minHeight: "100vh", position: "relative", zIndex: 1 },
  container: { maxWidth: 1100, margin: "0 auto", padding: "0 28px", position: "relative", zIndex: 1 },

  /* HERO */
  tag: {
    display: "inline-flex", alignItems: "center",
    fontFamily: "var(--font-mono)",
    fontSize: 11, color: "var(--accent)",
    letterSpacing: "0.18em", textTransform: "uppercase",
    marginBottom: 28, padding: "4px 12px 4px 8px",
    border: "1px solid var(--accent-soft)", borderRadius: 999,
    background: "var(--accent-faint)",
  },

  title: {
    fontSize: "var(--fs-hero)", fontWeight: 700,
    letterSpacing: "-0.028em", lineHeight: 1.18,
    color: "var(--ink-900)", marginBottom: 28, maxWidth: 760,
  },
  titleLine: { display: "block" },
  titleLineDim: { color: "var(--ink-600)" },

  /* PROBLEMA */
  problem: { padding: "56px 0", borderTop: "1px solid var(--line-soft)" },
  problemGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))",
    gap: 28,
  },
  problemItem: { display: "flex", flexDirection: "column", gap: 10 },
  problemNum: {
    fontFamily: "var(--font-mono)",
    fontSize: 11, color: "var(--accent)", letterSpacing: ".12em", fontWeight: 600,
  },
  problemText: { fontSize: 15.5, color: "var(--ink-900)", lineHeight: 1.55, margin: 0, maxWidth: 320 },

  /* CÓMO FUNCIONA */
  how: { padding: "56px 0", borderTop: "1px solid var(--line-soft)", background: "var(--surface-alt)" },
  howLabel: {
    fontFamily: "var(--font-mono)",
    fontSize: 11, color: "var(--accent)", letterSpacing: ".15em", textTransform: "uppercase",
    marginBottom: 24,
  },
  howList: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 0 },
  howItem: {
    display: "flex", gap: 18, alignItems: "flex-start",
    padding: "16px 0", borderLeft: "1px dashed var(--line)", paddingLeft: 20,
  },
  howNum: {
    fontFamily: "var(--font-mono)",
    fontSize: 12, color: "var(--accent)", fontWeight: 600, flexShrink: 0, width: 22,
  },
  howText: { fontSize: 15, color: "var(--ink-900)", lineHeight: 1.55, margin: 0, maxWidth: 560 },

  /* HERRAMIENTAS DE SOPORTE */
  pillars: { padding: "clamp(72px, 10vw, 110px) 0", position: "relative" },
  pillarsH: {
    fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em",
    color: "var(--ink-900)", maxWidth: 560, marginBottom: 36,
  },
  toolsRow: { display: "flex", flexWrap: "wrap", gap: 40 },
  toolItem: { display: "flex", flexDirection: "column", gap: 8, minWidth: 200, flex: "1 1 200px" },
  toolTitle: { fontSize: 15, fontWeight: 600, color: "var(--ink-900)" },
  toolDesc: { fontSize: 13, color: "var(--ink-600)", lineHeight: 1.5, margin: 0 },
  glyph: { color: "var(--accent)", flexShrink: 0 },

  /* CIERRE */
  closing: { padding: "48px 0", borderTop: "1px solid var(--line-soft)" },
  closingInner: { display: "flex", justifyContent: "center" },

  /* FOOTER */
  footer: { borderTop: "1px solid var(--line-soft)", padding: "28px 0", background: "var(--surface)", position: "relative" },
  footerInner: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: 12,
    fontFamily: "var(--font-mono)",
    fontSize: 11, color: "var(--ink-600)", letterSpacing: ".04em",
  },
  footerLeft: { display: "flex", gap: 12, alignItems: "center" },
  footerRight: { display: "flex", gap: 14, alignItems: "center" },
  footerDot: {
    width: 6, height: 6, borderRadius: "50%", background: "var(--success)",
    boxShadow: "0 0 0 3px rgba(22,163,74,0.13)",
  },
};
```

- [ ] **Step 2: Verificar lint**

Run: `npm run lint`
Expected: sin errores en `app/page.js`.

- [ ] **Step 3: Commit**

```bash
git add app/page.js
git commit -m "feat(landing): reposiciona el home hacia SECOP/Licitaciones"
```

---

### Task 5: Verificación visual completa

**Files:** ninguno (solo verificación, sin cambios de código salvo ajustes menores si algo se ve roto)

- [ ] **Step 1: Iniciar el servidor de dev**

Usa `preview_start` (no `npm run dev` directo) contra la config `dev` de `.claude/launch.json` (créala si no existe, apuntando a `npm run dev`, puerto 3000).

- [ ] **Step 2: Cargar el home y tomar snapshot**

Navega a `/` y usa `preview_snapshot` para confirmar:
- El ticker de procesos aparece entre el nav y el hero, con los 8 procesos mock visibles y separados por `·`.
- El badge superior dice "SECOP · Agua y saneamiento".
- El título tiene 3 líneas: "Evalúa si puedes competir." (oscura) y las otras dos más claras.
- No aparece el mini-bloque de marca "H / HydroStack / ES · EN" dentro del hero.
- No aparecen los badges normativos (Res. 0330, CTE, ASTM, SECOP II) en el hero.
- El botón "Prueba un proceso" existe una vez en el hero y otra vez antes del footer.
- Existen las secciones de 3 puntos (problema) y 4 pasos numerados (cómo funciona).
- La franja de herramientas muestra solo 3 items: Calculadoras, Build, Agente (NO Licitaciones).
- El nav dice "Calculadoras · Asistente · Licitaciones · Nosotros" y no hay botón de idioma visible.

- [ ] **Step 3: Verificar comportamiento del ticker**

Con `preview_eval`, hacer hover sobre `.ptr-bar` y confirmar que `getComputedStyle` del `.ptr-track` reporta `animation-play-state: paused` durante el hover (o inspeccionar visualmente que el movimiento se detiene con `preview_screenshot` antes/después).

- [ ] **Step 4: Verificar el CTA**

Con `preview_click` sobre el botón "Prueba un proceso" del hero, confirmar (via `preview_snapshot` o revisando la URL con `preview_eval: window.location.pathname`) que navega a `/licitaciones`.

- [ ] **Step 5: Verificar responsive**

Usa `preview_resize` a `mobile` (375x812) y toma `preview_screenshot`. Confirma que el ticker sigue siendo legible/desplazable y que la franja de herramientas colapsa a una columna sin overflow horizontal roto.

- [ ] **Step 6: Revisar consola y network**

`preview_console_logs` (level: error) y `preview_network` (filter: failed) — deben venir vacíos.

- [ ] **Step 7: Ajustar si algo se ve roto**

Si algún espaciado o salto de línea se ve mal (ej. las 3 líneas del título muy pegadas o muy separadas), ajusta `S.title.lineHeight` / `S.titleLine` en `app/page.js` y vuelve a los pasos 2-6. Documenta el valor final si cambia respecto al plan.

- [ ] **Step 8: Correr lint y build completos**

```bash
npm run lint
npm run build
```

Expected: ambos sin errores.

- [ ] **Step 9: Commit final (solo si hubo ajustes en el Step 7)**

```bash
git add app/page.js
git commit -m "fix(landing): ajustes de espaciado tras verificación visual"
```

---

## Self-review

**Cobertura del spec:**
- Ticker (componente + mock data, loop CSS, pausa en hover, responsive, `href` preparado): Tasks 1-2. ✓
- Hero (badge, copy 3 líneas, badges normativos comentados, CTA único, mini-marca retirada): Task 4. ✓
- Sección Problema (3 puntos neutrales): Task 4. ✓
- Sección Cómo funciona (4 pasos): Task 4. ✓
- Franja de herramientas reducida (solo 3, iconos + línea corta): Task 4. ✓
- Cierre con CTA repetido + footer traducido: Task 4. ✓
- Nav en español + selector de idioma comentado: Task 3. ✓
- No tocar `/calculators`, `/build`, `/chat`, `/licitaciones`, `src/lib/i18n.js`: ningún task los modifica. ✓

**Escaneo de placeholders:** sin TBD/TODO; todos los pasos incluyen código completo o comandos exactos.

**Consistencia de tipos/nombres:** `TOOLS_LITE`/`TOOL_COPY`/`GLYPHS` usan las mismas claves (`calc`/`build`/`agent`) en Task 4; `mockProcesos` exporta el shape `{ id, entidad, valor, ciudad, departamento, sector, href }` consumido tal cual por `ProcesoItem` en Task 2.
