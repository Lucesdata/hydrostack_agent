# Hydrostack — Rediseño Landing + Navbar + Hubs internos

- **Fecha**: 2026-06-09
- **Autor**: rediseño impulsado por agente, validado por usuario
- **Scope**: `/` (landing), Navbar global, `/calculators`, `/chat`, `/build`, `/licitaciones`
- **Deploy target**: Vercel (proyecto `hydrostacks`)

## 1. Motivación

El proyecto convive con tres identidades visuales en conflicto:

| Capa | Paleta | Tipografía | Estilo |
|---|---|---|---|
| Landing (`/`) | Crema `#FAFAF7` + verde `#0F766E` | Inter + JetBrains Mono | Sobrio, editorial, "water-evolution" |
| Navbar | Dark `rgba(2,12,16,0.92)` + cyan `#00F5FF` | Orbitron + IBM Plex Mono | Futurista, glow, blink |
| `/calculators` hub | Gradient azul `#0a1628` + cyan `#00d4ff` | IBM Plex Mono | Tech dark, emojis como íconos |

El navbar dark sobre la landing clara rompe visualmente la página. El hub de calculadoras usa emojis (📍🪣🔧⚗️) como íconos estructurales, lo que viola la regla `no-emoji-icons` del skill UI/UX Pro Max (Priority 4 — Style Selection).

**Objetivo**: unificar las tres capas hacia el lenguaje de la landing (claro, sobrio, ingeniería seria) y establecer una base de tokens que evite que la inconsistencia se repita en próximas páginas.

## 2. Decisiones tomadas

| Decisión | Elección | Alternativas descartadas |
|---|---|---|
| Dirección visual | Claro/sobrio (estilo landing actual) | Dark/cyan; híbrido claro+dark |
| Profundidad técnica | Tokens CSS + repintar | Repintar superficial (sin tokens); componentes reutilizables tipo shadcn |
| Stack de estilos | CSS variables en `globals.css` + inline styles existentes | Tailwind; CSS-in-JS runtime; shadcn |
| Tipografía final | Inter + JetBrains Mono | Mantener Orbitron / IBM Plex Sans / IBM Plex Mono |
| Dark mode | Fuera de scope ahora, pero la base de tokens lo permite | Implementarlo en esta ronda |

## 3. Sistema de tokens

Todos los tokens viven en `app/globals.css` bajo `:root`. Los componentes consumen `var(--token)` en lugar de hex literales.

### 3.1 Color

```css
:root {
  /* Superficie */
  --bg:           #FAFAF7;
  --surface:      #FFFFFF;
  --surface-alt:  #F4F4EE;

  /* Tinta */
  --ink-900:      #0A1F1C;
  --ink-600:      #525B5A;
  --ink-300:      #8A938F;

  /* Línea */
  --line:         #E5E5E0;
  --line-soft:    #E8E8E2;

  /* Acento */
  --accent:       #0F766E;
  --accent-soft:  rgba(15,118,110,0.13);
  --accent-faint: rgba(15,118,110,0.04);

  /* Semánticos */
  --success:      #16A34A;
  --warning:      #D97706;
  --danger:       #DC2626;

  /* Foco */
  --focus-ring:   #0F766E;
}
```

**Contrastes verificados** (sobre `--bg`):
- `--ink-900`: 15.8:1 ✓ AAA
- `--ink-600`: 6.2:1 ✓ AA
- `--accent`: 5.1:1 ✓ AA

### 3.2 Tipografía

```css
:root {
  --font-sans: 'Inter', -apple-system, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, 'Menlo', monospace;

  --fs-xs:   11px;
  --fs-sm:   13.5px;
  --fs-base: 16px;
  --fs-md:   18px;
  --fs-lg:   24px;
  --fs-xl:   32px;
  --fs-hero: clamp(38px, 5.5vw, 60px);

  --lh-tight: 1.04;
  --lh-snug:  1.3;
  --lh-base:  1.55;
}
```

### 3.3 Spacing (4pt scale)

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-14: 56px;
  --space-20: 80px;
  --space-section: clamp(96px, 12vw, 140px);
}
```

### 3.4 Radii + sombras

```css
:root {
  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-pill: 999px;

  --shadow-card-hover: 0 18px 32px -20px rgba(15,118,110,0.3);
  --shadow-logo:       0 6px 20px -8px rgba(15,118,110,0.5);
}
```

### 3.5 Layout

```css
:root {
  --container:        1100px;
  --container-narrow: 760px;
  --nav-h:            56px;
  --z-nav:            100;
  --z-overlay:        200;

  --bp-sm: 640px;
  --bp-md: 768px;
  --bp-lg: 1024px;
}
```

### 3.6 Lo que NO está en tokens

- **Glifos SVG**: viven como componentes React en `src/components/icons/`. No son tokens.
- **Animaciones**: por ahora siguen en sus archivos. Si se reutilizan en más de un componente, se promueven a `globals.css` con `--motion-fast`, `--ease-out`. Fuera del scope inicial.

## 4. Navbar (`src/components/Navbar.js`)

### 4.1 Visual

- **Fondo**: `var(--surface)` con `rgba(255,255,255,0.92)` y `backdrop-filter: blur(8px)` sutil. Borde inferior `1px solid var(--line)`.
- **Sin** `box-shadow` oscura, sin glow cyan, sin blink en el status dot.
- **Logo**: marca cuadrada 28×28 en `var(--accent)` con `box-shadow: var(--shadow-logo)` (mismo treatment que el `markLogo` de landing). Texto "HydroStack" en `var(--font-sans)` 600.
- **Status dot**: `var(--success)` 6×6 con `box-shadow: 0 0 0 3px rgba(22,163,74,0.13)` (mismo que footer landing).
- **Links**: `var(--font-mono)`, `var(--fs-xs)`, color `var(--ink-600)`. Hover → `var(--ink-900)`. Activo → `var(--accent)` con `border-bottom: 1px solid var(--accent)`.
- **Toggle idioma**: chip rectangular borde `var(--line)`, hover borde `var(--accent-soft)`.
- **Altura**: `var(--nav-h)` = 56px (era 52px).

### 4.2 Mobile

- Hamburguesa `☰` mantiene comportamiento actual (dropdown debajo del nav).
- Cada link mobile: `min-height: 48px` (cumple `touch-friendly-input`).
- Sin scrim global; solo dropdown.

### 4.3 Accesibilidad

- `aria-label="Menú principal"` en `<nav>`.
- Hamburguesa: `aria-expanded={open}` + `aria-controls="mobile-menu"`.
- Link activo: `aria-current="page"` (color + subrayado → cumple `color-not-only`).
- Focus rings globales via `:focus-visible`.
- Reading order DOM = visual order.

### 4.4 Lo que se elimina

- `Orbitron` (auditar y quitar de `app/layout.js` si nadie más la usa).
- `text-shadow: 0 0 16px rgba(0,245,255,0.5)` en logo y status.
- `box-shadow: 0 1px 32px rgba(0,0,0,0.6)`.
- Hex `#00F5FF`, `#4A7A8A`.
- Clase `.blink` en status dot (cumple `excessive-motion`).

## 5. `/calculators` — hub de módulos

### 5.1 Estructura

Mantiene el layout actual (header + banner guiado + grid de 8 módulos, 3 ready + 5 soon). Cambia el lenguaje visual.

### 5.2 Cambios

- **Fondo**: `var(--bg)`. Elimina gradient `#0a1628 → #0d2137`.
- **Tag superior** `"calculators"`: chip pill `var(--font-mono)` + `var(--accent)` sobre `var(--accent-faint)`, mismo tratamiento que `heroTag` de landing.
- **Título**: `var(--font-sans)` `var(--fs-xl)` `var(--ink-900)` (era IBM Plex Mono cyan).
- **Banner guiado**: icono SVG compass (sustituye 🧭). Borde `var(--line)`, fondo `var(--surface)`. Hover → `var(--accent-soft)` + lift como `.ls-card:hover` de landing. CTA `var(--accent)` con flecha animada (`.ls-cta-arrow`).
- **Grid de módulos**: cards en estilo `.ls-card` de landing (mismo hover lift, mismo `::after` con linear-gradient). Layout:
  - Header card: `XX · LABEL` (mono) + glifo SVG a la derecha.
  - Título: `var(--fs-md)` `var(--ink-900)` sans 600.
  - Descripción: `var(--fs-sm)` `var(--ink-600)`.
  - Chip normativas: `var(--font-mono)` `var(--fs-xs)` `var(--surface-alt)`.
  - CTA `var(--accent)` con flecha.
- **Card "soon"**: misma forma, `opacity: 0.55`, badge `Próximamente` arriba a la derecha en mono + xs. No clickable.

### 5.3 Glifos SVG (sustituyen emojis)

8 componentes en `src/components/icons/calculators/`, `viewBox=0 0 40 40`, `stroke=currentColor`, `stroke-width=1.2`. Mismo lenguaje que `GlyphCalc`/`GlyphBuild`/etc de landing.

| Slug | Concepto del glifo |
|---|---|
| `geo` | Pin + curvas de nivel |
| `fosa-septica` | Tanque seccionado en cámaras |
| `mantenimiento` | Reloj + tick |
| `imhoff` | Tanque con cono interior |
| `lodos` | Vial/bottle + ondas |
| `uasb` | Reactor con flujo ascendente |
| `filtro` | Capas horizontales |
| `potable` | Gota + tick |

## 6. `/chat`, `/build`, `/licitaciones` — cáscaras

Estas páginas son shells (6–11 líneas) que renderean componentes cliente (`ChatClient`, `BuildFlow`, `SecopBoard`). El rediseño aquí es **mínimo**: solo unificar el wrapper.

- Background `var(--bg)`.
- Container `max-width: var(--container)` centrado.
- Padding superior `var(--space-section)` para respirar bajo el navbar.

**Explícitamente fuera de scope**: el styling interno de `ChatClient`, `BuildFlow`, `SecopBoard`. Eso queda como deuda visible para una ronda futura.

## 7. Migración de la landing actual

La landing (`app/page.js`) ya está pulida visualmente. La migración:

- **No** cambia un solo pixel del contenido de la landing.
- Sustituye los hex literales del objeto `S = {}` por `var(--token)`.
- Sustituye los hex en el bloque `LANDING_CSS` por `var(--token)`.
- Diff visual del **cuerpo** de la landing debe ser cero. Verificación con screenshot lado a lado.
- **Excepción esperada**: el navbar global crece de 52→56px (sección 4.1), lo que empuja todo el contenido 4px abajo en todas las páginas, incluida la landing. No es regresión, es consecuencia documentada.

Si algo más se ve distinto: rollback de ese punto, landing intacta.

## 8. Accesibilidad — checklist global

| Regla skill | Aplicación |
|---|---|
| `color-contrast` | Todos los pares verificados (sección 3.1). |
| `focus-states` | `:focus-visible` global con `outline: 2px solid var(--focus-ring); outline-offset: 2px`. |
| `aria-labels` | Hamburguesa, status dot. |
| `keyboard-nav` | Tab order = visual. Cards como `<Link>`. |
| `heading-hierarchy` | h1 único por página; h2 secundario. Sin saltos. |
| `reduced-motion` | `@media (prefers-reduced-motion: reduce)` desactiva `ls-pulse`, hover lifts, fade-ins. |
| `color-not-only` | Link activo: color + subrayado. Card soon: opacity + badge. |
| `touch-target-size` | Mobile links ≥ 48px alto. Botones ≥ 44px. |

## 9. Performance — checklist

| Regla skill | Aplicación |
|---|---|
| `font-loading` | `font-display: swap` en todas las fuentes. |
| `font-preload` | Solo Inter (400, 500, 600, 700) y JetBrains Mono (400, 500). Audit y quitar Orbitron / IBM Plex si nadie más las usa. |
| `image-optimization` | N/A — sin imágenes en el scope. |
| `bundle-splitting` | Next.js per-route ya activo, sin cambios. |
| `content-jumping` | Reservar espacio en cards (min-height). |

## 10. Plan de implementación (alto nivel)

Detalle por archivo en el plan de implementación. Aquí el orden y el riesgo:

| # | Archivo | Cambio | Riesgo |
|---|---|---|---|
| 1 | `app/globals.css` | Agregar tokens, focus-visible global, prefers-reduced-motion | Bajo |
| 2 | `app/layout.js` | Auditar fuentes, quitar Orbitron/IBM Plex si no se usan | Medio |
| 3 | `src/components/Navbar.js` | Refactor a tokens, quitar glow/blink, a11y | Medio |
| 4 | `src/components/icons/calculators/*.jsx` | 8 SVG nuevos | Bajo |
| 5 | `app/calculators/page.js` | Refactor a tokens, sustituir emojis por SVG | Medio |
| 6 | `app/page.js` | Migración mecánica de hex a tokens. Visual idéntica | Bajo |
| 7 | `app/chat/page.js`, `app/build/page.jsx`, `app/licitaciones/page.js` | Wrapper unificado | Bajo |

## 11. Verificación previa a deploy

1. `npm run dev` + preview en `localhost:3000`.
2. Tour visual: `/`, `/calculators`, `/chat`, `/build`, `/licitaciones`. Mobile 375 + desktop 1280.
3. `preview_inspect` en focus states de un link y un botón.
4. Lighthouse a11y score ≥ 95.
5. Diff visual landing antes/después (screenshot).
6. Solo entonces `git push` + Vercel deploy a `hydrostacks`.

## 12. Fuera de scope (explícito)

- Calculadoras concretas (`/calculators/geo`, `/calculators/fosa-septica`, `/calculators/mantenimiento`).
- Componentes internos: `BuildFlow`, `HydroAgent`, `SepticTankCalculator`, `MaintenanceCalculator`, `IsometricDiagram`.
- API routes, lógica de negocio, base de datos, agente.
- Dark mode (la base de tokens lo permite, pero no se implementa ahora).
- Animaciones globales sistematizadas (`--motion-fast`, `--ease-*`).
- i18n: no se tocan textos ni el sistema `useLang()`.

## 13. Riesgos conocidos

- **Landing actual está commiteada hace pocos días** (`3de3cbd feat(landing): water-evolution`). Migración a tokens debe ser **invisible visualmente**. Mitigación: screenshot before/after, rollback puntual si algo se ve distinto.
- **`Orbitron` u otras fuentes** pueden estar referenciadas fuera del navbar. Mitigación: `grep` global antes de quitar.
- **Componentes internos con styling viejo** dentro de `/chat`, `/build`, `/licitaciones` van a verse desalineados con la nueva cáscara. Esto es **deuda explícita** declarada en el scope.
