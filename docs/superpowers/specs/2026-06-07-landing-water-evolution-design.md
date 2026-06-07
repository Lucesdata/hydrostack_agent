# Landing — Evolución "Water Treatment Bridge" · Diseño

**Fecha:** 2026-06-07
**Estado:** Borrador para revisión del usuario.
**Predecesora:** [`2026-06-03-landing-hub-design.md`](./2026-06-03-landing-hub-design.md) (aprobada e implementada en `app/page.js`).
**Archivos afectados:** `app/page.js` (reescritura), `src/lib/i18n.js` (extensión).

---

## 1. Contexto: ¿por qué una nueva spec si ya hay landing?

La spec de **2026-06-03** entregó un hub minimalista de 4 cards (`01 Calculadoras · 02 Flujo guiado · 03 Asistente IA · 04 Licitaciones`) con estética **Mission-Control Console**: Orbitron + IBM Plex Mono, fondo teal oscuro, neón cyan `#00F5FF`, glifos Unicode `⬡ ◈ ◉ ⊞`.

Esa landing cumple su función como escaparate. Esta evolución la lleva al siguiente nivel para resolver **dos problemas concretos**:

1. **Identidad visual**: la estética cyber-teal se lee como "cyberpunk genérico"; el sector real (agua/saneamiento, B2B, profesionales técnicos) demanda un tono **engineering-sobrio**.
2. **Operabilidad**: el hub actual presenta 4 pilares top-level pero **esconde** el acceso directo a los 4 sub-destinos operativos (`/calculators/geo`, `/calculators/fosa-septica`, `/calculators/mantenimiento`, y el interior del `BuildFlow`). El usuario pidió explícitamente que la landing sea el **puente operativo** que conecta "todo lo que ha estado haciendo: el calculador, el gemelo digital, la fosa séptica, la licitación".

### Decisión de producto (aprobada en brainstorming 2026-06-07)
- **Identidad**: Hub multi-herramienta de 4 pilares con peso equivalente. Audiencia mixta (sin priorizar). Profundidad: minimal estricta (un solo scroll).
- **Dirección visual**: Opción B — **engineering sobrio** con tratamiento gráfico sutil orientado al sector agua (no literal).
- **Operabilidad**: Opción α — **cards con sub-links integrados**. Las cards con sub-rutas reales (Calculadoras) exponen tira de sub-links; las que no las tienen (Build, Agente, Licitaciones) usan chips técnicos para señalar lo que contienen.

---

## 2. Qué cambia · qué se conserva

### Se reescribe
- **`app/page.js`** — reemplazo completo del componente. Se elimina el bloque `HUB_CSS` con barra cyan izquierda, el grid actual, el footer compacto. Se introduce el nuevo sistema visual (Opción B).
- **Layout interno**: la landing tiene su propio mark inline (logo + nombre + bar + lang switch) en el hero; **no** depende de la navbar para identidad. (Razón: la navbar del proyecto existe pero su rol en `/` queda subordinado al hero auto-contenido. La navbar sigue intacta y operativa en el resto del sitio.)

### Se extiende
- **`src/lib/i18n.js`** — claves nuevas bajo `t.landing` (sección 4). Las claves de la spec previa (`hubTag`, `hubTitle`, `hubLead`, `mod1..4.title/desc`, `cardCta`) **se conservan**: las nuevas claves son aditivas (`hero*`, `pillars*`, `submod*`, `meta*`, `footer*`).

### NO se toca
- Navbar del proyecto (`src/components/Navbar.js` — sigue como hoy).
- Las 4 páginas destino y sus sub-páginas (`/calculators/*`, `/build`, `/chat`, `/licitaciones`).
- `app/globals.css` — la landing introduce sus estilos vía bloque `<style dangerouslySetInnerHTML>` y objeto `const S = {}` (mismo patrón). Si en algún momento se decide promover tokens "engineering sobrio" a globals, será en una spec posterior.
- Las 8 rutas operativas (todas existen y se exponen sin cambios al backend).
- `HydroAgent` y demás componentes — no se embeben aquí.

### Riesgo documentado (aceptado)
La landing usa un sistema visual distinto al del resto de la app (fondo claro `#FAFAF7` vs el dark cyber del interior). Es un **cambio de modo deliberado**: la landing es la fachada comercial; el interior es la consola de trabajo. La transición se justifica como "vestíbulo claro → consola oscura", patrón común en SaaS técnicos. **Mitigación**: el accent `#0F766E` se mantiene en hover de cards y links como pista de continuidad cromática. Si más adelante se considera intrusivo, se puede migrar el interior al modo claro en una fase futura.

---

## 3. Spec visual

### 3.1 Tokens nuevos (locales a la landing)
| Token | Valor | Uso |
|---|---|---|
| `--ls-bg` | `#FAFAF7` | fondo de página |
| `--ls-surface` | `#FFFFFF` | superficie de cards |
| `--ls-ink` | `#0A1F1C` | texto principal |
| `--ls-ink-2` | `#525B5A` | texto secundario |
| `--ls-border` | `#E5E5E0` | bordes y separadores |
| `--ls-border-soft` | `#E8E8E2` | borde nav/footer |
| `--ls-chip-bg` | `#F4F4EE` | fondo de chip técnico |
| `--ls-accent` | `#0F766E` | verde-petróleo: links, números, hover, glifos |
| `--ls-accent-soft` | `rgba(15,118,110,0.13)` | bordes tag, gradientes |
| `--ls-state` | `#16A34A` | dot de estado operativo |

Tipografías: **Inter** (400/500/600/700) para todo el cuerpo; **JetBrains Mono** (400/500) para tags, números, chips, datos. Se cargan vía `<link>` a Google Fonts dentro del `<head>` del bloque `<style dangerouslySetInnerHTML>` con `@import`, **o** mejor: declaradas en `app/layout.js` con `next/font` para evitar FOUT (preferida).

### 3.2 Estructura general
```
┌─────────────────────────────────────────────────┐
│  HERO                                            │
│   · mark inline (logo · nombre · bar · ES·EN)    │
│   · tag con dot pulsante                         │
│   · título grande (em con water-line sutil)      │
│   · lead 2 líneas                                │
│   · meta-strip (4 items normativos)              │
├─────────────────────────────────────────────────┤
│  PILARES                                         │
│   · label + h2 + side-flow                       │
│   · grid 2×2 de 4 cards                          │
│     [01]  [02]                                   │
│     [03]  [04]                                   │
├─────────────────────────────────────────────────┤
│  FOOTER (onda sutil en borde superior)           │
└─────────────────────────────────────────────────┘
```

### 3.3 Hero
- Padding vertical `clamp(96px, 12vw, 140px) 0 clamp(72px, 10vw, 100px)`.
- **Fondo del hero**: grilla muy tenue con `linear-gradient` de líneas verdes (opacity 0.04), tamaño `48px`, enmascarada por `radial-gradient` hacia esquina superior derecha. Lectura: "medio filtrante / cuadrícula técnica".
- **Mark inline**: cuadrado `28×28px` con "H" blanca sobre `--ls-accent`, nombre **HydroStack** (15px/700), barra horizontal `gradient(to right, accent-soft, transparent)`, switch `ES · EN` en mono 11px.
- **Tag**: pill con `dot` izquierdo. El dot tiene animación CSS `pulse` (escala + opacity) cada 2.4s — sutil "live signal". Texto en mono 11px `▸ Plataforma del sector agua` (o equivalente i18n).
- **Título**: Inter 700, `clamp(38px, 5.5vw, 60px)`, letter-spacing `-0.028em`, line-height `1.04`, max-width `760px`. El segmento clave (`<em>`) usa color `--ls-accent` (no italic) y lleva una **water-line SVG** repetitiva como `background-image` bajo el texto (path `M0,3 Q15,0 30,3 T60,3` repetido). Es el motivo de agua principal.
- **Lead**: Inter 400, 18px, color `--ls-ink-2`, max-width `600px`, line-height `1.55`.
- **Meta-strip**: borde superior `dashed --ls-accent-soft`, items separados por borde derecho, cada uno con `<strong>` en `--ls-ink` y resto en `--ls-ink-2`, todo mono 11px.

### 3.4 Pilares
- Label mono uppercase `▸ Módulos` en accent.
- h2 Inter 600, 24px, `Cuatro herramientas, un mismo dominio.`
- **Side-flow** a la derecha del h2 (mono 11px): `Flujo: cálculo → diseño → consulta → oportunidad` — hila narrativamente los 4 módulos como un proceso de tratamiento. Si no cabe (móvil), pasa debajo.
- **Grid**: `repeat(auto-fit, minmax(min(320px, 100%), 1fr))` con `gap: 14px`. Forzar 2 columnas en desktop con `max-width: 1100px` del contenedor.

### 3.5 Anatomía de card (refinada)
```
┌──────────────────────────────────────┐
│ 01 · CALCULADORAS              [glyph]│  num mono accent + glifo SVG accent
│                                       │
│ Cálculo técnico normativo             │  título Inter 600/18
│ Fosa séptica, perc test ASTM, campo   │  desc Inter 13.5 muted, flex-grow
│ de drenaje y mantenimiento. PDF con   │
│ área de firma.                        │
│                                       │
│ Geo · Fosa séptica · Mantenimiento    │  sub-links (mono 11) — solo card 01
│                                       │
│ [chip] [chip] [chip]                  │  chips técnicos mono 10
│                                       │
│ Abrir calculadoras →                  │  cta accent
└──────────────────────────────────────┘
```

Detalles:
- `background: #FFFFFF`, `border: 1px solid var(--ls-border)`, `border-radius: 12px`, `padding: 24px`, `min-height: 260px`, `display: flex; flex-direction: column; gap: 14px`.
- Hover: `transform: translateY(-3px); border-color: rgba(15,118,110,0.33); box-shadow: 0 18px 32px -20px rgba(15,118,110,0.3);`. Al hover aparece una **línea gradient accent en el borde superior interno** (vía `::before`) — lectura: "caudal entrando".
- **Sub-links** (solo cards con sub-rutas reales — ver 3.6): fila horizontal de `<Link>` separados por `·`, mono 11px, color `--ls-ink-2`. Hover: color `--ls-accent`. Esta tira **no aparece** en cards que no tienen sub-rutas, para mantener consistencia.
- **CTA**: Inter 500/13, color `--ls-accent`, flecha `→` con `translateX(4px)` en hover de card.

### 3.6 Mapeo de los 4 pilares con sub-links

| # | Card | Ruta principal | Sub-links | Chips | Glifo SVG |
|---|---|---|---|---|---|
| 01 | Calculadoras (Cálculo técnico normativo) | `/calculators` | `/calculators/geo` · `/calculators/fosa-septica` · `/calculators/mantenimiento` | `V_N · Cr 0.85` · `Van't Hoff` · `FS configurable` | Corte transversal de fosa con tabique |
| 02 | Build (Gemelo digital · Flujo guiado) | `/build` | — (no hay sub-rutas; BuildFlow es SPA) | `Babylon.js` · `Isométrico` · `Geo` | Cubo isométrico con grilla |
| 03 | Agente (Hydro_Agent bilingüe) | `/chat` | — | `ES · EN` · `Auto-perfil` · `4 sub-escenarios` | Burbuja diálogo + hoja spec |
| 04 | Licitaciones (Inteligencia de contratación) | `/licitaciones` | — (es un único dashboard) | `SECOP II` · `Datos públicos` · `ELT` | Pipeline + chart |

Estructura de datos en `app/page.js`:
```js
const MODULES = [
  {
    n: "01",
    key: "mod1",
    href: "/calculators",
    glyph: "calc",                                  // selector del SVG inline
    subRoutes: [                                    // omitir si vacío
      { key: "submod1a", href: "/calculators/geo" },
      { key: "submod1b", href: "/calculators/fosa-septica" },
      { key: "submod1c", href: "/calculators/mantenimiento" },
    ],
  },
  { n: "02", key: "mod2", href: "/build",        glyph: "build", subRoutes: [] },
  { n: "03", key: "mod3", href: "/chat",         glyph: "agent", subRoutes: [] },
  { n: "04", key: "mod4", href: "/licitaciones", glyph: "tender", subRoutes: [] },
];
```

Los glifos viven como componentes SVG inline locales (`function GlyphCalc()`, etc.) — 4 funciones cortas en el mismo archivo, `viewBox="0 0 40 40"`, stroke `currentColor`, sin librería. Paths exactos en `option-b-water.html` (Visual Companion, sirven como referencia 1:1).

### 3.7 Footer
- Borde superior con **onda SVG verde** sutil como `background-image` (path `M0,1 Q30,0 60,1 T120,1`, opacity 0.4) — eco visual del water-line del hero.
- Contenido en `JetBrains Mono` 11px, `--ls-ink-2`:
  - Izquierda: `HydroStack · Plataforma del sector agua y saneamiento`
  - Derecha: dot verde con halo (`box-shadow: 0 0 0 3px var(--state-soft)`) + `Fase 0.6 · ingesta operativa · hydrostack.io`

---

## 4. Copy bilingüe (extensión de `src/lib/i18n.js`)

Las claves de la spec previa (`hubTag`, `hubTitle`, `hubLead`, `mod1..4.title/desc`, `cardCta`, `footerDesc`) **se conservan**. Las nuevas son aditivas:

### ES (`translations.es.landing`)
```js
heroTag: "Plataforma del sector agua",
heroTitleA: "Cálculo, diseño e ",
heroTitleEm: "inteligencia de contratación",
heroTitleB: " para el sector agua y saneamiento.",
heroLead: "Cuatro módulos integrados sobre una base normativa estricta y datos públicos abiertos. Para propietarios, profesionales y empresas que persiguen contratos del sector.",
meta: {
  reg1: { value: "Res. 0330/2017", scope: "CO" },
  reg2: { value: "CTE DB-HS 5",    scope: "ES" },
  reg3: { value: "ASTM D6391",     scope: "US" },
  reg4: { value: "SECOP II",       scope: "datos.gov.co" },
},
pillarsLabel: "▸ Módulos",
pillarsH: "Cuatro herramientas, un mismo dominio.",
pillarsFlow: "Flujo: cálculo → diseño → consulta → oportunidad",
mod1Title: "Cálculo técnico normativo",
mod1Desc:  "Fosa séptica, perc test ASTM, campo de drenaje y mantenimiento. PDF con área de firma.",
mod1Cta:   "Abrir calculadoras",
submod1a: "Geo",
submod1b: "Fosa séptica",
submod1c: "Mantenimiento",
mod2Title: "Diseño 3D guiado · Gemelo digital",
mod2Desc:  "Flujo paso a paso con isometría y geolocalización real (Leaflet + Open-Meteo).",
mod2Cta:   "Empezar diseño",
mod3Title: "Agente experto bilingüe",
mod3Desc:  "Detecta perfil y sub-escenario; orienta por país (LATAM · EE.UU. · España).",
mod3Cta:   "Hablar con el agente",
mod4Title: "Inteligencia de contratación",
mod4Desc:  "Procesos y contratos SECOP II del sector agua. ELT extensible a OCDS, RUP, RUES, SUI.",
mod4Cta:   "Explorar oportunidades",
footerTagline: "Plataforma del sector agua y saneamiento",
footerPhase:   "Fase 0.6 · ingesta operativa",
chips: {
  m1: ["V_N · Cr 0.85", "Van't Hoff", "FS configurable"],
  m2: ["Babylon.js", "Isométrico", "Geo"],
  m3: ["ES · EN", "Auto-perfil", "4 sub-escenarios"],
  m4: ["SECOP II", "Datos públicos", "ELT"],
},
```

### EN (`translations.en.landing`)
Mismas claves, traducciones:
- `heroTag: "Water-sector platform"`
- `heroTitleA: "Engineering, design and "`, `heroTitleEm: "procurement intelligence"`, `heroTitleB: " for water and sanitation."`
- `heroLead: "Four integrated modules on a strict regulatory base and open public data. For owners, professionals, and companies pursuing sector contracts."`
- `meta.reg1.scope: "CO"`, etc. (sin cambio)
- `pillarsLabel: "▸ Modules"`, `pillarsH: "Four tools, one domain."`, `pillarsFlow: "Flow: calc → design → consult → opportunity"`
- `mod1Title: "Code-compliant engineering"`, `mod1Desc: "Septic tank, ASTM perc test, drainage field and maintenance. PDF with signature area."`, `mod1Cta: "Open calculators"`
- `submod1a: "Geo"`, `submod1b: "Septic tank"`, `submod1c: "Maintenance"`
- `mod2Title: "Guided 3D design · Digital twin"`, `mod2Desc: "Step-by-step flow with isometric view and real geolocation (Leaflet + Open-Meteo)."`, `mod2Cta: "Start designing"`
- `mod3Title: "Bilingual expert agent"`, `mod3Desc: "Detects profile and sub-scenario; orients by country (LATAM · US · Spain)."`, `mod3Cta: "Talk to the agent"`
- `mod4Title: "Procurement intelligence"`, `mod4Desc: "SECOP II water-sector processes and contracts. ELT extensible to OCDS, RUP, RUES, SUI."`, `mod4Cta: "Explore opportunities"`
- `footerTagline: "Water and sanitation platform"`, `footerPhase: "Phase 0.6 · ingest operational"`
- `chips.*` idénticos al ES (son tecnicismos).

---

## 5. Restricciones a preservar

Heredadas tal cual de la spec **2026-06-03 §5**:
- App Router (`app/` páginas, `src/` código).
- `app/page.js` es Client Component (`"use client"`).
- Estilos: CSS puro vía `const S = {}` + bloque `<style dangerouslySetInnerHTML>` (no Tailwind, no CSS Modules).
- Si se usan keyframes (animación del dot del tag), van en el bloque `<style>` con clase `.ls-tag-dot`.
- `GROQ_API_KEY` / `SECOP_APP_TOKEN` no se exponen client-side (no aplica aquí — esta landing no hace fetch).
- Alias `@/*` → raíz.
- Las fuentes Inter + JetBrains Mono se cargan vía **`next/font`** en `app/layout.js` para evitar FOUT. Si no hay capacidad para tocar layout, fallback a `<link>` Google Fonts dentro del bloque `<style>`.

---

## 6. Plan de implementación (resumen — el detalle va en el plan)

1. **`src/lib/i18n.js`** — añadir las claves nuevas de la Sección 4 en `es.landing` y `en.landing` (conservar todas las viejas).
2. **`app/layout.js`** — agregar carga de `Inter` y `JetBrains_Mono` vía `next/font/google` y exponer como CSS variables `--font-inter`, `--font-jbmono`. (Si esto rompe páginas existentes que dependen de Orbitron+Plex Mono, mantener ambos sets co-existiendo. Verificar que no haya regresión en `/calculators` y `/build`.)
3. **`app/page.js`** — reescribir el componente:
   - Mantener `"use client"`, `import Link`, `import { useLang }`.
   - Definir `const MODULES = [...]` (Sec. 3.6) y 4 funciones `Glyph*()` (paths SVG de la mockup).
   - Render: `<div style={S.page}>` → `<header style={S.hero}>` (mark inline + tag + título con `<em>` water-lined + lead + meta-strip) → `<section style={S.pillars}>` (label + h2 + side-flow + grid `.map(MODULES)`) → `<footer>`.
   - Bloque `<style dangerouslySetInnerHTML>` para: `@keyframes pulse`, `.ls-card:hover`, `.ls-card::before`, water-line `data: URI` SVG en `.ls-title em::after`, hex-grid bg del hero, onda del footer.
4. **Verificación** (idéntico patrón a las fases):
   - `npx tsc --noEmit` limpio (con `// @ts-check` si el archivo es `.js`, o tipado del objeto MODULES por inferencia).
   - `npm run build` limpio.
   - Preview manual con `preview_start`:
     - Hero respira; water-line bajo `<em>` visible; dot pulsa.
     - Grid 2×2 en desktop, 1 columna en `preview_resize(375)`.
     - Hover de card: translateY + borde accent + línea superior gradient.
     - Las 4 cards navegan a sus rutas; sub-links de card 01 navegan a las 3 sub-rutas (verificar con `preview_click` + URL en `preview_snapshot`).
     - Toggle ES/EN cambia el copy del hero, h2, side-flow, cards, sub-links, chips, footer.
     - 0 errores en `preview_console_logs`. Sin hydration mismatch.
   - Responsive: 320, 768, 1100, 1440 px.

---

## 7. Fuera de alcance (YAGNI explícito)

- ❌ Reescribir la navbar global ni los temas de las páginas internas (`/calculators/*`, `/build`, etc.). El cambio de modo "claro fachada → oscuro consola" es deliberado (§2).
- ❌ Animaciones de scroll, parallax, partículas.
- ❌ Sección de testimonios, FAQ, pricing, blog.
- ❌ Persistencia o telemetría de clics en sub-links (puede ser fase futura).
- ❌ Modo oscuro de la landing (la decisión fue fondo claro).
- ❌ Cambios a `CLAUDE.md` (la roadmap conversacional sigue independiente del módulo SITARD).
- ❌ Migrar tokens "engineering sobrio" a `app/globals.css` como tema base — se hará en una spec posterior si se decide.

---

## 8. Checklist de auto-revisión

- [x] **Sin placeholders / TBD.** Todas las decisiones de copy, color, tipografía, anatomía de card y sub-links están explícitas. La referencia visual canónica es `option-b-water.html` (Visual Companion) y se mantiene como fuente de paths SVG.
- [x] **Consistencia interna.** §2 (alcance) ↔ §3 (visual) ↔ §4 (copy) ↔ §6 (implementación) están alineadas en nombres de claves, rutas y elementos.
- [x] **Alcance acotado.** Un solo plan, 3 archivos tocados (`app/page.js`, `src/lib/i18n.js`, `app/layout.js`), sin decomposición necesaria.
- [x] **Ambigüedad resuelta.**
  - Fuentes: cargadas vía `next/font` en `layout.js` (preferido); fallback documentado.
  - Sub-links: solo card 01 (las demás no tienen sub-rutas reales).
  - Mark inline en hero **reemplaza** la navbar como identidad en `/`, pero la navbar sigue intacta y aparece en el resto del sitio.
  - Estilos: `const S` + `<style dangerouslySetInnerHTML>`, mismo patrón ya probado en SecopExplorer.
- [x] **Trazabilidad.** Refiere y respeta la spec predecesora; lista qué cambia y qué conserva.
