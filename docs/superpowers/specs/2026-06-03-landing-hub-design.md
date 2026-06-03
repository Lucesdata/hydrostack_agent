# Landing "Centro de operaciones" — Hub de módulos · Diseño

**Fecha:** 2026-06-03
**Estado:** Aprobado por el usuario. Listo para implementar.
**Archivo a reescribir:** `app/page.js`
**Archivo a extender:** `src/lib/i18n.js`

---

## 1. Contexto y motivación

HydroStack dejó de ser una herramienta única de pozos/SITARD: ahora es una **plataforma
de gestión de proyectos de agua y saneamiento** con cuatro productos de primer nivel.
La landing actual (`app/page.js`) está construida como una página dedicada al flujo
guiado `/build` (hero con los 4 pasos ①📍→②🪣→③🔧→④📄), con un `<HydroAgent>` embebido,
una sección de 4 "features" y un grid de 6 módulos-placeholder de calculadoras.

Esa landing ya no representa el producto. La nueva landing es un **hub de módulos**:
una sola pantalla que presenta los 4 productos como puertas de entrada equivalentes.

### Decisión de producto (aprobada)
- Enfoque **hub de módulos** (no landing-de-un-producto).
- **4 productos top-level**, todos con el mismo peso visual (grid neutro 2×2).
- **Minimalista**: solo hero + grid + footer. Nada más (sin features, sin agente embebido,
  sin grid de calculadoras-placeholder).
- Estética **"Mission-Control Console"**: tarjetas numeradas `01–04` en mono, mismo acento
  cyan para todas, look de consola de operaciones.

---

## 2. Arquitectura y alcance (Sección 1 — aprobada)

### Se reescribe por completo
- **`app/page.js`** — Se elimina: el hero de `/build` con los 4 pasos, el `<HydroAgent>`
  embebido, la sección `FEATURES`, y el grid de 6 módulos `MODULES`. Queda: navbar (intacta,
  ya existe) + hero compacto + grid 2×2 + footer.

### Se extiende
- **`src/lib/i18n.js`** — Se añaden claves nuevas bajo `t.landing` (ver Sección 4). Las claves
  viejas (`tagline`, `subtitle`, `cta`, `feat*`, `modulesTitle`, etc.) **se conservan** porque
  podrían usarse en otros lados; no se borran en este cambio.

### NO se toca
- `src/components/Navbar.js` — ya tiene los links a `/calculators`, `/chat`, `/licitaciones`.
  El producto "Flujo guiado" (`/build`) no tiene link en navbar, pero sí tarjeta en el hub.
- `src/components/HydroAgent.*` — el asistente sigue viviendo en `/chat`. Solo se deja de
  embeber en la landing.
- Las 4 páginas de producto (`/calculators`, `/build`, `/chat`, `/licitaciones`).
- `app/globals.css` — la landing usa los tokens y efectos existentes (bg-grid, scanline).

### Decisión deliberada: landing inline
La landing se mantiene **inline en `app/page.js`** (un solo archivo, ~200 líneas, estilos en
un objeto `const S = {}` como hoy). **No** se extrae a `src/components/Landing/`. Razón: es
una sola pantalla sin reuso; extraerla añadiría indirección sin beneficio. Sigue el patrón ya
establecido en el archivo actual.

### Riesgo documentado (aceptado)
Usuarios con bookmark a la home esperando el atajo visual de `/build` (los 4 pasos) ya no lo
verán en el hero. **Mitigación:** la navbar + la tarjeta `02 · Flujo guiado` del hub llevan a
`/build`. Se considera aceptable.

---

## 3. Composición y spec visual (Sección 2 — aprobada)

> Estética **"Mission-Control Console"**. Reutiliza los tokens y el lenguaje visual de las
> tarjetas de SECOP (`src/components/secop/SecopExplorer.tsx`) para coherencia: gradiente de
> fondo, barra cyan en el borde izquierdo (`::before`), y hover con `translateY(-3px)` +
> glow cyan.

### 3.1 Estructura general
```
<Navbar/>  (ya renderizada por el layout — no se toca)
┌──────────────────────────────────────────────┐
│  HERO (franja compacta, centrada)             │
│   · etiqueta mono cyan                         │
│   · título Orbitron mediano                    │
│   · subtítulo mono, una línea, --muted         │
├──────────────────────────────────────────────┤
│  GRID 2×2 (4 tarjetas de igual peso)           │
│   [01]  [02]                                   │
│   [03]  [04]                                   │
├──────────────────────────────────────────────┤
│  FOOTER (igual al actual)                      │
└──────────────────────────────────────────────┘
```

### 3.2 Hero (compacto)
- Etiqueta mono superior: `t.landing.hubTag` — color `--cyan` (#00F5FF), `font-size: 10px`,
  `letter-spacing: 0.25em`, `text-transform: uppercase`, fuente IBM Plex Mono.
- Título: `t.landing.hubTitle` — Orbitron, `clamp(24px, 3.6vw, 38px)`, `font-weight: 700`,
  color `--white` (#E8F8FF). **Mediano, no gigante.**
- Subtítulo: `t.landing.hubLead` — IBM Plex Mono, `~14px`, color `--muted` (#4A7A8A → usar
  `#7ab8c8` como en el lead actual para legibilidad), una sola línea, `max-width ~640px`.
- Sin botón CTA grande, sin imagen. El hero solo orienta; las tarjetas son la acción.
- Padding sugerido: `clamp(48px, 8vw, 80px) clamp(16px, 5vw, 28px) clamp(28px, 4vw, 40px)`.

### 3.3 Grid 2×2
- `display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem;`
- Colapsa a **1 columna** por debajo de ~720px. Como los estilos son inline (sin media
  queries en objeto JS), usar `gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))"`
  para lograr el colapso responsive sin media query. (En desktop ancho da 2 columnas; en
  móvil 1.) `maxWidth` del contenedor ~900px centrado para forzar 2×2 en desktop.
- Tarjetas de **altura uniforme** (el grid ya las iguala por fila).

### 3.4 Anatomía de tarjeta (idéntica para las 4)
```
┌─────────────────────────────┐
│ 01                      ⬡   │  número mono (top-left) + glyph (top-right)
│                             │
│ CALCULADORAS                │  nombre — Orbitron
│ Dimensiona fosa, drenaje    │  descripción — mono, --muted
│ y mantenimiento.            │
│                             │
│ → acceder                   │  CTA mono cyan, abajo
└─────────────────────────────┘
```
Especificaciones:
- La tarjeta entera es un `<Link href={ruta}>` clickeable (no solo el CTA).
- Fondo: `linear-gradient(160deg, var(--deep2), #061218)` (igual que SECOP). En inline:
  `"linear-gradient(160deg, #041820, #061218)"`.
- Borde: `1px solid rgba(0,245,255,0.12)` (token `--border`).
- `border-radius: 8px`, `padding: 1.5rem`, `position: relative`, `overflow: hidden`.
- `display: flex; flex-direction: column; gap: .5rem; min-height: ~190px;`
- **Barra cyan izquierda** (`::before`): no se puede con estilos inline puros. Dos opciones:
  (a) añadir un bloque `<style dangerouslySetInnerHTML>` con la clase `.hub-card::before`
  (patrón ya usado en SecopExplorer para evitar hydration mismatch), o
  (b) renderizar un `<span>` absoluto de 2px como primer hijo. **Preferir (a)** para hover +
  ::before juntos y mantener el JSX limpio.
- **Número** `01–04`: IBM Plex Mono, grande y translúcido (`font-size: ~28px`,
  `color: rgba(0,245,255,0.35)`, `font-weight: 700`). Marca de "consola".
- **Glyph** (top-right): Unicode geométrico, `color: --cyan`, `font-size: ~22px`,
  `opacity: .7`. Sin librería de iconos.
- **Nombre**: Orbitron, `~1.05rem`, `font-weight: 700`, color `--white`.
- **Descripción**: IBM Plex Mono, `~12px`, color `--muted` (#4A7A8A), `line-height: 1.5`,
  una línea conceptual (puede envolver a 2 visualmente).
- **CTA** `→ acceder`: `margin-top: auto`, mono, `~12px`, color `--cyan`.
- **Hover** (vía clase en bloque `<style>`): `transform: translateY(-3px)`,
  `border-color: var(--cyan)`, `box-shadow: 0 6px 24px rgba(0,245,255,0.08)`,
  `transition: transform .18s, border-color .18s, box-shadow .18s`.

### 3.5 Mapeo de los 4 módulos
| # | módulo | ruta | glyph | clave i18n |
|---|--------|------|-------|------------|
| 01 | Calculadoras  | `/calculators`  | `⬡` | `mod1` |
| 02 | Flujo guiado  | `/build`        | `◈` | `mod2` |
| 03 | Asistente IA  | `/chat`         | `◉` | `mod3` |
| 04 | Licitaciones  | `/licitaciones` | `⊞` | `mod4` |

Estructura de datos en `app/page.js`:
```js
const MODULES = [
  { n: "01", glyph: "⬡", key: "mod1", href: "/calculators" },
  { n: "02", glyph: "◈", key: "mod2", href: "/build" },
  { n: "03", glyph: "◉", key: "mod3", href: "/chat" },
  { n: "04", glyph: "⊞", key: "mod4", href: "/licitaciones" },
];
```
Render: `t.landing[m.key].title` y `t.landing[m.key].desc`.

### 3.6 Footer
Se conserva tal cual el footer actual (logo Orbitron + separador + `t.landing.footerDesc` +
`hydrostack.io` a la derecha). No cambia.

---

## 4. Copy bilingüe (Sección 3 — aprobada)

Añadir a `src/lib/i18n.js`. Cada `modN` es un objeto `{ title, desc }`.

### ES (`translations.es.landing`)
```js
hubTag: "PLATAFORMA DE GESTIÓN DE PROYECTOS",
hubTitle: "Centro de operaciones",
hubLead: "Cuatro módulos. Un flujo de trabajo para agua y saneamiento.",
cardCta: "acceder",
mod1: { title: "Calculadoras", desc: "Dimensiona fosa séptica, campo de drenaje y mantenimiento." },
mod2: { title: "Flujo guiado", desc: "Geo → fosa → mantenimiento, paso a paso, con informe final." },
mod3: { title: "Asistente IA", desc: "Resuelve dudas técnicas y normativas en lenguaje natural." },
mod4: { title: "Licitaciones", desc: "Explora contratación pública del sector agua (SECOP II)." },
```

### EN (`translations.en.landing`)
```js
hubTag: "PROJECT MANAGEMENT PLATFORM",
hubTitle: "Operations console",
hubLead: "Four modules. One workflow for water and sanitation.",
cardCta: "enter",
mod1: { title: "Calculators", desc: "Size septic tank, drainage field and maintenance." },
mod2: { title: "Guided flow", desc: "Geo → tank → maintenance, step by step, with final report." },
mod3: { title: "AI assistant", desc: "Technical and regulatory answers in plain language." },
mod4: { title: "Tenders", desc: "Explore public water-sector contracting (SECOP II)." },
```

**Nota:** las claves viejas (`tagline`, `subtitle`, `cta`, `ctaSub`, `feat1..4Title/Desc`,
`modulesTitle`, `modulesComingSoon`, `footerDesc`) se conservan. `footerDesc` se sigue usando
en el footer.

---

## 5. Restricciones a preservar (de las "Reglas de oro" del proyecto)

- **Todo el acceso a Socrata corre en servidor. Nunca desde el navegador.** (No aplica a esta
  landing — no hace fetch — pero es invariante del proyecto.)
- `GROQ_API_KEY` y `SECOP_APP_TOKEN` son secretos de entorno; nunca exponer client-side.
- Alias real del repo: `@/*` → raíz. Imports tipo `@/src/lib/i18n`, `@/app/...`.
- Router: **App Router** (páginas en `app/`, código en `src/`).
- Estilos: **CSS puro + variables** (sin Tailwind, sin CSS Modules). Tokens en
  `app/globals.css`.
- Si se usa `<style>` dentro de un Client Component, usar
  `<style dangerouslySetInnerHTML={{ __html: CSS }} />` **NO** `<style>{CSS}</style>`
  (evita hydration mismatch — bug ya sufrido en SecopExplorer).
- `app/page.js` es Client Component (`"use client"`, usa `useLang()`).

### Tokens de color (de `app/globals.css`)
`--cyan #00F5FF` · `--green #00FF88` · `--amber #FFB020` · `--violet #A78BFA` ·
`--white #E8F8FF` · `--muted #4A7A8A` · `--deep1 #020C10` · `--deep2 #041820` ·
`--border rgba(0,245,255,0.12)` · fuentes `--mono 'IBM Plex Mono'`, `--sans 'Inter'`,
`--orb 'Orbitron'`.

---

## 6. Plan de implementación (resumen)

1. **`src/lib/i18n.js`** — añadir las claves de la Sección 4 a `es.landing` y `en.landing`
   (conservar las viejas).
2. **`app/page.js`** — reescribir el componente:
   - Mantener `"use client"`, `import Link`, `import { useLang }`. **Quitar** `import HydroAgent`.
   - Definir `const MODULES = [...]` (Sección 3.5).
   - Render: `<div style={S.page}>` → hero compacto → grid 2×2 con `.map(MODULES)` →
     footer. Incluir un `<style dangerouslySetInnerHTML>` para `.hub-card`, `.hub-card::before`
     y `.hub-card:hover`.
   - Estilos en `const S = {}` reusando los valores del archivo actual donde apliquen
     (footer idéntico).
3. **Verificación** (cerrar como las fases previas):
   - `npx tsc --noEmit` limpio.
   - `npm run build` limpio.
   - Preview en navegador: hero + 4 tarjetas, hover cyan, navegación a las 4 rutas,
     toggle ES/EN cambia el copy, 0 errores de hydration en consola.
   - Responsive: 2 columnas en desktop, 1 en móvil (`preview_resize`).

---

## 7. Checklist de auto-revisión del spec

- [x] Sin placeholders / TBD pendientes.
- [x] Consistencia interna: arquitectura (Sec. 2) coincide con composición (Sec. 3) y copy (Sec. 4).
- [x] Alcance: un solo plan de implementación, 2 archivos, sin decomposición necesaria.
- [x] Ambigüedad resuelta: barra cyan vía `<style>` + `::before` (opción a); grid responsive
      vía `auto-fit/minmax` sin media queries.
