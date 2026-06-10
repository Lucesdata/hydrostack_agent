# Hydrostack Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify Hydrostack's landing, global Navbar, and internal hub pages (`/calculators`, `/chat`, `/build`, `/licitaciones`) into a single clear/sober visual language, driven by CSS variables, with SVG icons replacing emojis and improved accessibility.

**Architecture:** Add new design tokens in `app/globals.css` **alongside** existing dark-theme tokens (existing tokens stay because out-of-scope pages — concrete calculators, agent — still use them). Refactor Navbar, `/calculators` hub, and landing to consume new tokens. Replace emoji icons with SVG components. Remove CRT decorative overlays (`.bg-grid`, `.scanline`) from root layout. Cáscaras (`/chat`, `/build`, `/licitaciones`) get a consistent wrapper but their internal components stay untouched.

**Tech Stack:** Next.js 14 (Pages still in `app/`), React 18, CSS variables, plain CSS in `globals.css`, inline styles via JS objects. No new dependencies.

**Verification model:** This is a UI/CSS redesign. There is no useful TDD here — visual correctness is the test. Each task ends with **verify in browser via `npm run dev`** at `localhost:3000`, then commit. The agentic worker MUST start the dev server (or have it running) and confirm the page renders as described before marking a task complete.

**Reference spec:** [docs/superpowers/specs/2026-06-09-hydrostack-redesign-design.md](../specs/2026-06-09-hydrostack-redesign-design.md)

---

## File Structure

**Created:**
- `src/components/icons/Compass.jsx` — guided-flow banner glyph
- `src/components/icons/calculators/Geo.jsx`
- `src/components/icons/calculators/FosaSeptica.jsx`
- `src/components/icons/calculators/Mantenimiento.jsx`
- `src/components/icons/calculators/Imhoff.jsx`
- `src/components/icons/calculators/Lodos.jsx`
- `src/components/icons/calculators/Uasb.jsx`
- `src/components/icons/calculators/Filtro.jsx`
- `src/components/icons/calculators/Potable.jsx`

**Modified:**
- `app/globals.css` — append new tokens (`:root` block + classes), focus-visible, prefers-reduced-motion media query, rewrite mobile-nav classes
- `app/layout.js` — remove `.bg-grid` and `.scanline` divs; audit and trim font URL
- `src/components/Navbar.js` — refactor to new tokens
- `app/calculators/page.js` — refactor to new tokens; sub emojis for SVG; new card style
- `app/page.js` — migrate hex literals to `var(--token)` (visual identical)
- `app/chat/page.js`, `app/build/page.jsx`, `app/licitaciones/page.js` — only if they lack a consistent wrapper; minor edit

**NOT touched (out of scope):**
- Existing dark-theme tokens (`--cyan`, `--deep1`, etc.) in `globals.css` — concrete calculators still use them
- Concrete calculator pages: `app/calculators/geo/*`, `app/calculators/fosa-septica/*`, `app/calculators/mantenimiento/*`
- Internal components: `BuildFlow`, `HydroAgent`, `SepticTankCalculator`, `MaintenanceCalculator`, `IsometricDiagram`, `SecopBoard`
- Any API route, lib, db, agent

---

## Task 1: Add new design tokens to `globals.css`

**Files:**
- Modify: `app/globals.css` (append after the existing `:root` block at line 17)

- [ ] **Step 1: Append the new tokens block**

Open `app/globals.css`. Find the existing `:root { --cyan: ... }` block (lines 4–17). **Do not modify it.** Append a new `:root` block immediately after it (at line 18, before `html { scroll-behavior...`):

```css
/* ── Design tokens — clear theme (landing, navbar, hubs) ──────────────────── */
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

  /* Tipografía */
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

  /* Spacing (4pt) */
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

  /* Radii */
  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-pill: 999px;

  /* Sombras */
  --shadow-card-hover: 0 18px 32px -20px rgba(15,118,110,0.3);
  --shadow-logo:       0 6px 20px -8px rgba(15,118,110,0.5);

  /* Layout */
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

- [ ] **Step 2: Append global focus-visible at the end of `globals.css`**

At the very end of the file (after the `@media print { ... }` block), append:

```css
/* ── Clear theme — focus rings + reduced motion ──────────────────────────── */
*:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
  border-radius: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 3: Verify build still compiles**

Run:
```bash
npm run dev
```
Expected: Next.js dev server starts on `localhost:3000` without CSS errors. Open `localhost:3000` — landing still renders as before (you have not migrated it yet). Press Tab — focus rings should now appear teal (`var(--focus-ring)`) on landing links. Stop dev server with Ctrl-C.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "$(cat <<'EOF'
feat(design): add clear-theme tokens alongside dark tokens

Adds the new color/typography/spacing/radii/shadow/layout token set
that landing, navbar and hubs will consume. Existing dark tokens
stay untouched because concrete calculators and agent still use them.
Adds global :focus-visible ring and prefers-reduced-motion media query.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Remove CRT decorative overlays from root layout

The `.bg-grid` and `.scanline` divs in `app/layout.js` were part of the old dark CRT aesthetic. The `.scanline` is `position: fixed; z-index: 9999` — a cyan horizontal line that animates over **every** page including the new landing. Must go.

**Files:**
- Modify: `app/layout.js`

- [ ] **Step 1: Remove the two decorative divs**

Open `app/layout.js`. Find the `<body>` block (lines 23–34):

```js
<body>
  {/* Fixed background grid */}
  <div className="bg-grid" aria-hidden="true"/>
  {/* CRT scanline */}
  <div className="scanline" aria-hidden="true"/>
  <LangProvider>
    <Navbar />
    <main style={{ position: "relative", zIndex: 1 }}>{children}</main>
    <GlobalProgress />
  </LangProvider>
</body>
```

Replace with:

```js
<body>
  <LangProvider>
    <Navbar />
    <main style={{ position: "relative", zIndex: 1 }}>{children}</main>
    <GlobalProgress />
  </LangProvider>
</body>
```

- [ ] **Step 2: Verify visually**

Run `npm run dev`. Visit `localhost:3000`. The cyan scanline that animated every ~8s is gone. The faint grid background is gone. Landing still renders as before. Stop dev server with Ctrl-C.

The `.bg-grid` and `.scanline` CSS classes in `globals.css` stay untouched — if any out-of-scope page references them via className they still work. We only stopped rendering them in the root layout.

- [ ] **Step 3: Commit**

```bash
git add app/layout.js
git commit -m "$(cat <<'EOF'
refactor(layout): remove CRT bg-grid and scanline overlays

These were part of the old dark theme. The scanline (z-index 9999, fixed)
was animating a cyan line over the clear landing. CSS classes stay in
globals.css in case any out-of-scope page still references them.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Add clear-theme mobile-nav and utility classes

The current `.nav-mobile-menu`, `.nav-mobile-link`, `.nav-mobile-lang`, `.nav-hamburger` classes in `globals.css` (lines 268–323) are hard-coded with dark theme colors (`rgba(2,12,16,0.97)`, `#4A7A8A`, `#00F5FF`). The new Navbar needs clear-theme versions. We'll add new classes prefixed with `cln-` (clear) so the old classes stay intact for any out-of-scope reference.

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Append clear-theme nav classes at the end of `globals.css`**

After the block added in Task 1, Step 2, append:

```css
/* ── Clear theme — navbar (clr-*) ────────────────────────────────────────── */
.clr-nav {
  position: sticky;
  top: 0;
  z-index: var(--z-nav);
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--line);
  height: var(--nav-h);
  display: flex;
  align-items: center;
  padding: 0 28px;
}
.clr-nav-inner {
  max-width: var(--container);
  width: 100%;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 20px;
}
.clr-nav-link {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-600);
  text-decoration: none;
  padding: 4px 0;
  border-bottom: 1px solid transparent;
  transition: color 0.18s, border-color 0.18s;
}
.clr-nav-link:hover {
  color: var(--ink-900);
}
.clr-nav-link[aria-current="page"] {
  color: var(--accent);
  border-bottom-color: var(--accent);
}
.clr-lang-btn {
  background: transparent;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 4px 12px;
  color: var(--ink-600);
  font-size: var(--fs-xs);
  font-family: var(--font-mono);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  transition: border-color 0.18s, color 0.18s;
}
.clr-lang-btn:hover {
  border-color: var(--accent-soft);
  color: var(--ink-900);
}
.clr-hamburger {
  background: transparent;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 5px 9px;
  color: var(--ink-600);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  margin-left: auto;
  transition: border-color 0.18s, color 0.18s;
}
.clr-hamburger:hover {
  border-color: var(--accent-soft);
  color: var(--ink-900);
}
.clr-mobile-menu {
  display: none;
  flex-direction: column;
  position: absolute;
  top: var(--nav-h);
  left: 0;
  right: 0;
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  padding: 16px 28px 20px;
  gap: 4px;
  z-index: 99;
}
.clr-mobile-menu.open { display: flex; }
.clr-mobile-link {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-600);
  text-decoration: none;
  padding: 14px 0;
  min-height: 48px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--line-soft);
  transition: color 0.18s;
}
.clr-mobile-link:hover,
.clr-mobile-link[aria-current="page"] {
  color: var(--accent);
}
.clr-mobile-lang {
  margin-top: 8px;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 12px 0;
  min-height: 48px;
  color: var(--ink-600);
  font-size: var(--fs-xs);
  font-family: var(--font-mono);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  text-align: center;
}
.clr-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 0 3px rgba(22,163,74,0.13);
  flex-shrink: 0;
}
```

- [ ] **Step 2: Verify CSS compiles**

Run `npm run dev`. Open browser console — no CSS errors. Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "$(cat <<'EOF'
feat(design): add clear-theme nav classes (clr-*)

New navbar utility classes that consume the clear-theme tokens.
Prefixed clr- so the old dark .nav-* classes stay intact for any
out-of-scope reference.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Refactor Navbar to clear theme

**Files:**
- Modify: `src/components/Navbar.js`

- [ ] **Step 1: Replace the file entirely**

The Navbar currently mixes inline styles (`S = {}`) with classNames (`nav-mobile-menu`, `nav-hamburger`). Rewrite to use the new `clr-*` classes for everything:

```js
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useLang } from "@/src/lib/i18n";

export default function Navbar() {
  const { t, toggle } = useLang();
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
```

- [ ] **Step 2: Verify visually**

Run `npm run dev`. Visit `localhost:3000`. The navbar should now be:
- White-ish background, thin border below
- Teal "H" logo square + "ydroStack" sans-serif
- Status dot green with halo (no blinking)
- Links in mono uppercase, ink-600 color, hover → ink-900
- Active link (visit `/calculators`) → teal with underline
- Toggle "ES · EN" → bordered chip, hover → teal border

Mobile: resize to 375px. Hamburger appears. Open it — menu drops below nav, each link ≥48px tall. Tab through — focus rings should be teal.

If the active link looks wrong, double-check `aria-current="page"` is applied (DevTools inspect).

Stop dev server with Ctrl-C.

- [ ] **Step 3: Commit**

```bash
git add src/components/Navbar.js
git commit -m "$(cat <<'EOF'
refactor(navbar): clear theme, sans-serif logo, mono links

Replaces dark/cyan/Orbitron navbar with the new clear-theme tokens.
Adds aria-current on active link, aria-expanded on hamburger, named
labels in Spanish. Mobile links bump to 48px min-height for touch.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Audit Orbitron font usage and remove if unused

**Files:**
- Read: any file potentially using Orbitron
- Modify: `app/layout.js` (only if Orbitron is unused)

- [ ] **Step 1: Search for any reference to Orbitron**

Run:
```bash
grep -rn "Orbitron\|--orb" app src --include="*.js" --include="*.jsx" --include="*.css" --include="*.ts" --include="*.tsx" 2>/dev/null
```

Expected: previously the Navbar used `'Orbitron'` (now removed in Task 4) and `--orb` was declared in `globals.css` line 16. If grep shows references in out-of-scope files (e.g., `HydroAgent`, calculator components, `BuildFlow`), Orbitron must stay.

- [ ] **Step 2a: IF no references found outside globals.css** — trim font URL in `app/layout.js`

Open `app/layout.js`. The `<link>` tag (lines 18–21) currently loads:
```
family=Orbitron:wght@400;700;900&family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500
```

Replace with:
```js
<link
  href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
  rel="stylesheet"
/>
```

IBM Plex Mono stays because the existing dark tokens (`--mono: 'IBM Plex Mono'`) and out-of-scope pages (`/calculators/geo`, etc.) still use it.

- [ ] **Step 2b: IF references found** — skip this task

Document in the commit message which files keep Orbitron and move on.

- [ ] **Step 3: Verify Orbitron does not load**

Run `npm run dev`. Open DevTools → Network. Reload. Filter by "fonts". Orbitron `.woff2` should not appear. Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add app/layout.js
git commit -m "$(cat <<'EOF'
perf(fonts): drop Orbitron from layout (unused after navbar refactor)

Orbitron was loaded only for the old futuristic navbar logo. Navbar
now uses Inter. Keeps IBM Plex Mono since dark tokens still depend
on it for out-of-scope pages.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Create generic Compass SVG component

**Files:**
- Create: `src/components/icons/Compass.jsx`

- [ ] **Step 1: Create the file**

Same visual language as the existing landing glyphs in `app/page.js` (`GlyphCalc`, `GlyphBuild`...): `viewBox=0 0 40 40`, `fill: none`, `stroke: currentColor`, `stroke-width: 1.2`.

```jsx
export default function Compass({ size = 22, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      style={style}
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="14" />
      <path d="M20 8 L22 20 L20 32 L18 20 Z" fill="currentColor" opacity="0.8" />
      <circle cx="20" cy="20" r="1.4" fill="currentColor" />
      <line x1="20" y1="4" x2="20" y2="7" />
      <line x1="20" y1="33" x2="20" y2="36" />
      <line x1="4" y1="20" x2="7" y2="20" />
      <line x1="33" y1="20" x2="36" y2="20" />
    </svg>
  );
}
```

- [ ] **Step 2: Verify file is valid React/JSX**

The file is imported in Task 7. No standalone verification — its rendering is checked then.

- [ ] **Step 3: Commit**

```bash
git add src/components/icons/Compass.jsx
git commit -m "$(cat <<'EOF'
feat(icons): Compass SVG for guided-flow banner

Same visual language as landing glyphs: viewBox 40x40, stroke 1.2,
currentColor. Replaces the 🧭 emoji in /calculators hub.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Create 8 calculator glyph SVG components

**Files:**
- Create: `src/components/icons/calculators/Geo.jsx`
- Create: `src/components/icons/calculators/FosaSeptica.jsx`
- Create: `src/components/icons/calculators/Mantenimiento.jsx`
- Create: `src/components/icons/calculators/Imhoff.jsx`
- Create: `src/components/icons/calculators/Lodos.jsx`
- Create: `src/components/icons/calculators/Uasb.jsx`
- Create: `src/components/icons/calculators/Filtro.jsx`
- Create: `src/components/icons/calculators/Potable.jsx`

Each component follows the same signature. Below are the 8 SVG bodies. Common wrapper:

```jsx
export default function NAME({ size = 36, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40"
         fill="none" stroke="currentColor" strokeWidth="1.2"
         style={style} aria-hidden="true">
      {/* PATHS */}
    </svg>
  );
}
```

- [ ] **Step 1: Create `Geo.jsx`** (pin + contour lines)

```jsx
export default function Geo({ size = 36, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" style={style} aria-hidden="true">
      <path d="M4 30 Q12 26 20 30 T36 30" opacity="0.4" />
      <path d="M4 34 Q12 30 20 34 T36 34" opacity="0.3" />
      <path d="M20 6 C14 6 10 10 10 16 C10 22 20 32 20 32 C20 32 30 22 30 16 C30 10 26 6 20 6 Z" />
      <circle cx="20" cy="16" r="3" fill="currentColor" />
    </svg>
  );
}
```

- [ ] **Step 2: Create `FosaSeptica.jsx`** (sectioned tank)

```jsx
export default function FosaSeptica({ size = 36, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" style={style} aria-hidden="true">
      <rect x="4" y="10" width="32" height="22" rx="1.5" />
      <line x1="16" y1="10" x2="16" y2="32" />
      <line x1="26" y1="10" x2="26" y2="32" />
      <line x1="4" y1="20" x2="36" y2="20" strokeDasharray="2 2" opacity="0.5" />
      <path d="M8 6 L12 6 L12 10" />
      <path d="M32 6 L28 6 L28 10" />
      <line x1="6" y1="14" x2="14" y2="14" opacity="0.4" />
      <line x1="18" y1="14" x2="24" y2="14" opacity="0.4" />
      <line x1="28" y1="14" x2="34" y2="14" opacity="0.4" />
    </svg>
  );
}
```

- [ ] **Step 3: Create `Mantenimiento.jsx`** (clock + tick)

```jsx
export default function Mantenimiento({ size = 36, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" style={style} aria-hidden="true">
      <circle cx="20" cy="20" r="13" />
      <path d="M20 11 L20 20 L26 23" />
      <path d="M28 8 L34 8 L34 14" />
      <path d="M14 32 L20 38 L30 26" strokeWidth="1.6" />
    </svg>
  );
}
```

- [ ] **Step 4: Create `Imhoff.jsx`** (tank with inner cone)

```jsx
export default function Imhoff({ size = 36, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" style={style} aria-hidden="true">
      <path d="M6 8 L34 8 L30 22 L22 36 L18 36 L10 22 Z" />
      <line x1="6" y1="14" x2="34" y2="14" opacity="0.5" />
      <path d="M12 16 L20 30 L28 16" opacity="0.6" />
      <circle cx="20" cy="11" r="0.8" fill="currentColor" />
    </svg>
  );
}
```

- [ ] **Step 5: Create `Lodos.jsx`** (vial + waves)

```jsx
export default function Lodos({ size = 36, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" style={style} aria-hidden="true">
      <path d="M14 4 L26 4 L26 10 L30 18 L30 32 Q30 36 26 36 L14 36 Q10 36 10 32 L10 18 L14 10 Z" />
      <line x1="14" y1="4" x2="26" y2="4" strokeWidth="1.6" />
      <path d="M10 26 Q14 24 18 26 T26 26 T30 26" opacity="0.5" />
      <path d="M10 30 Q14 28 18 30 T26 30 T30 30" opacity="0.4" />
    </svg>
  );
}
```

- [ ] **Step 6: Create `Uasb.jsx`** (upflow reactor)

```jsx
export default function Uasb({ size = 36, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" style={style} aria-hidden="true">
      <rect x="8" y="6" width="24" height="28" rx="1.5" />
      <path d="M14 26 L14 22 M20 28 L20 22 M26 26 L26 22" opacity="0.6" />
      <path d="M14 18 L14 14 M20 20 L20 14 M26 18 L26 14" opacity="0.5" />
      <path d="M14 10 L14 8 M20 10 L20 8 M26 10 L26 8" opacity="0.4" />
      <path d="M12 34 L14 32 M20 34 L20 32 M28 34 L26 32" />
    </svg>
  );
}
```

- [ ] **Step 7: Create `Filtro.jsx`** (horizontal media layers)

```jsx
export default function Filtro({ size = 36, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" style={style} aria-hidden="true">
      <rect x="6" y="8" width="28" height="26" rx="1.5" />
      <path d="M6 16 Q10 14 14 16 T22 16 T34 16" opacity="0.7" />
      <path d="M6 22 Q10 20 14 22 T22 22 T34 22" opacity="0.5" />
      <circle cx="12" cy="28" r="0.8" fill="currentColor" opacity="0.5" />
      <circle cx="18" cy="29" r="0.8" fill="currentColor" opacity="0.5" />
      <circle cx="24" cy="28" r="0.8" fill="currentColor" opacity="0.5" />
      <circle cx="29" cy="30" r="0.8" fill="currentColor" opacity="0.5" />
      <path d="M14 4 L14 8 M26 4 L26 8" opacity="0.6" />
    </svg>
  );
}
```

- [ ] **Step 8: Create `Potable.jsx`** (drop + tick)

```jsx
export default function Potable({ size = 36, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" style={style} aria-hidden="true">
      <path d="M20 4 C20 4 8 18 8 26 C8 32 13 36 20 36 C27 36 32 32 32 26 C32 18 20 4 20 4 Z" />
      <path d="M14 24 L19 29 L26 21" strokeWidth="1.6" />
    </svg>
  );
}
```

- [ ] **Step 9: Commit**

```bash
git add src/components/icons/calculators
git commit -m "$(cat <<'EOF'
feat(icons): 8 SVG glyphs for calculator modules

Replaces emoji icons (📍🪣🔧🏗🔬⚗️🧱💧) in /calculators hub.
Same visual language as landing glyphs (40x40 viewBox, stroke 1.2,
currentColor). Each accepts size and style props.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Add clear-theme card classes to `globals.css`

The new `/calculators` hub will use card classes that mirror the landing `.ls-card`. Adding them globally so the hub stays inline-light.

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Append at end of file**

```css
/* ── Clear theme — page shell + cards (clr-*) ────────────────────────────── */
.clr-page {
  min-height: calc(100vh - var(--nav-h));
  background: var(--bg);
  color: var(--ink-900);
  font-family: var(--font-sans);
  cursor: auto;
  padding: clamp(56px, 9vw, 96px) clamp(16px, 5vw, 28px) 80px;
}
.clr-container {
  max-width: var(--container);
  margin: 0 auto;
  position: relative;
}
.clr-tag {
  display: inline-flex;
  align-items: center;
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--accent);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  margin-bottom: 16px;
  padding: 4px 12px 4px 8px;
  border: 1px solid var(--accent-soft);
  border-radius: var(--radius-pill);
  background: var(--accent-faint);
}
.clr-h1 {
  font-family: var(--font-sans);
  font-size: var(--fs-xl);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--ink-900);
  margin-bottom: 10px;
}
.clr-sub {
  font-size: var(--fs-sm);
  color: var(--ink-600);
  margin: 0;
  max-width: 600px;
  line-height: var(--lh-base);
}
.clr-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 260px;
  position: relative;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.18s, transform 0.18s, box-shadow 0.18s;
}
.clr-card::after {
  content: "";
  position: absolute;
  top: 0;
  left: 24px;
  right: 24px;
  height: 1px;
  background: linear-gradient(to right, var(--accent), transparent);
  opacity: 0;
  transition: opacity 0.18s;
  pointer-events: none;
}
.clr-card.is-active:hover {
  border-color: var(--accent-soft);
  transform: translateY(-3px);
  box-shadow: var(--shadow-card-hover);
}
.clr-card.is-active:hover::after { opacity: 1; }
.clr-card.is-soon {
  opacity: 0.55;
  cursor: default;
}
.clr-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.clr-card-num {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--accent);
  letter-spacing: 0.12em;
  font-weight: 500;
}
.clr-card-soon-badge {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--ink-600);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 2px 8px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
}
.clr-card-glyph {
  width: 36px;
  height: 36px;
  color: var(--accent);
  flex-shrink: 0;
}
.clr-card-title {
  font-size: var(--fs-md);
  font-weight: 600;
  letter-spacing: -0.012em;
  color: var(--ink-900);
}
.clr-card-desc {
  font-size: var(--fs-sm);
  color: var(--ink-600);
  line-height: var(--lh-base);
  flex-grow: 1;
  margin: 0;
}
.clr-card-norms {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--ink-300);
  letter-spacing: 0.05em;
}
.clr-card-cta {
  margin-top: 4px;
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--accent);
  display: flex;
  align-items: center;
  gap: 6px;
}
.clr-cta-arrow {
  display: inline-block;
  transition: transform 0.18s;
}
.clr-card.is-active:hover .clr-cta-arrow { transform: translateX(4px); }
.clr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}
.clr-guided-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  margin-bottom: 26px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  text-decoration: none;
  color: inherit;
  flex-wrap: wrap;
  transition: border-color 0.18s, transform 0.18s, box-shadow 0.18s;
}
.clr-guided-banner:hover {
  border-color: var(--accent-soft);
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
}
.clr-guided-banner-icon {
  color: var(--accent);
  flex-shrink: 0;
}
.clr-guided-banner-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1 1 auto;
  min-width: 0;
}
.clr-guided-banner-title {
  font-size: var(--fs-sm);
  color: var(--ink-900);
  font-weight: 600;
}
.clr-guided-banner-sub {
  font-size: 12px;
  color: var(--ink-600);
  line-height: var(--lh-base);
}
.clr-guided-banner-cta {
  font-size: var(--fs-sm);
  color: var(--accent);
  font-weight: 500;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}
.clr-guided-banner:hover .clr-cta-arrow { transform: translateX(4px); }
```

- [ ] **Step 2: Verify CSS compiles**

Run `npm run dev` — no console errors. Stop server.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "$(cat <<'EOF'
feat(design): add clear-theme page shell, cards and banner classes

clr-page, clr-container, clr-tag, clr-h1, clr-sub, clr-card,
clr-card-* variants, clr-grid, clr-guided-banner. Same hover/lift
treatment as landing .ls-card. Used next by /calculators hub.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Refactor `/calculators` hub

**Files:**
- Modify: `app/calculators/page.js`

- [ ] **Step 1: Replace the file entirely**

```js
"use client";
import Link from "next/link";
import { useLang } from "@/src/lib/i18n";

import Compass from "@/src/components/icons/Compass";
import Geo from "@/src/components/icons/calculators/Geo";
import FosaSeptica from "@/src/components/icons/calculators/FosaSeptica";
import Mantenimiento from "@/src/components/icons/calculators/Mantenimiento";
import Imhoff from "@/src/components/icons/calculators/Imhoff";
import Lodos from "@/src/components/icons/calculators/Lodos";
import Uasb from "@/src/components/icons/calculators/Uasb";
import Filtro from "@/src/components/icons/calculators/Filtro";
import Potable from "@/src/components/icons/calculators/Potable";

const MODULES = [
  { n: "01", slug: "geo",            Glyph: Geo,            ready: true,  norms: "OSM · Open-Meteo · Ley 99/1993", titleKey: "geoTitle",     descKey: "geoDesc" },
  { n: "02", slug: "fosa-septica",   Glyph: FosaSeptica,    ready: true,  norms: "RAS · España · EN 12566 · EPA",  titleKey: "septicTitle",  descKey: "septicDesc" },
  { n: "03", slug: "mantenimiento",  Glyph: Mantenimiento,  ready: true,  norms: "Res. 0330/2017 · RAS 2017",      titleKey: "maintTitle",   descKey: "maintDesc" },
  { n: "04", slug: "imhoff",         Glyph: Imhoff,         ready: false, titleKey: "imhoffTitle", descKey: "imhoffDesc" },
  { n: "05", slug: "lodos",          Glyph: Lodos,          ready: false, titleKey: "lodsTitle",   descKey: "lodsDesc"   },
  { n: "06", slug: "uasb",           Glyph: Uasb,           ready: false, titleKey: "uasbTitle",   descKey: "uasbDesc"   },
  { n: "07", slug: "filtro",         Glyph: Filtro,         ready: false, titleKey: "filterTitle", descKey: "filterDesc" },
  { n: "08", slug: "potable",        Glyph: Potable,        ready: false, titleKey: "potTitle",    descKey: "potDesc"    },
];

export default function CalculatorsPage() {
  const { t, lang } = useLang();
  const tc = t.calculators;
  const isEs = lang === "es";

  return (
    <div className="clr-page">
      <div className="clr-container">
        <header style={{ marginBottom: 22 }}>
          <span className="clr-tag">calculators</span>
          <h1 className="clr-h1">{tc.pageTitle}</h1>
          <p className="clr-sub">{tc.pageSubtitle}</p>
        </header>

        <Link href="/build" className="clr-guided-banner">
          <span className="clr-guided-banner-icon">
            <Compass size={26} />
          </span>
          <span className="clr-guided-banner-body">
            <span className="clr-guided-banner-title">
              {isEs ? "¿Primera vez?" : "First time?"}
            </span>
            <span className="clr-guided-banner-sub">
              {isEs
                ? "Prueba el flujo guiado paso a paso (incluye informe PDF al final)."
                : "Try the step-by-step guided flow (PDF report included)."}
            </span>
          </span>
          <span className="clr-guided-banner-cta">
            {isEs ? "Ir al flujo guiado" : "Go to guided flow"}
            <span className="clr-cta-arrow">→</span>
          </span>
        </Link>

        <div className="clr-grid">
          {MODULES.map((m) => {
            const Glyph = m.Glyph;
            if (m.ready) {
              return (
                <Link key={m.slug} href={`/calculators/${m.slug}`} className="clr-card is-active">
                  <div className="clr-card-top">
                    <span className="clr-card-num">{m.n} · {m.slug.toUpperCase()}</span>
                    <Glyph size={36} style={{ color: "var(--accent)" }} />
                  </div>
                  <div className="clr-card-title">{tc[m.titleKey]}</div>
                  <p className="clr-card-desc">{tc[m.descKey]}</p>
                  {m.norms && <div className="clr-card-norms">{m.norms}</div>}
                  <span className="clr-card-cta">
                    {tc.open}
                    <span className="clr-cta-arrow">→</span>
                  </span>
                </Link>
              );
            }
            return (
              <div key={m.slug} className="clr-card is-soon">
                <div className="clr-card-top">
                  <span className="clr-card-num">{m.n} · {m.slug.toUpperCase()}</span>
                  <span className="clr-card-soon-badge">{tc.soon}</span>
                </div>
                <Glyph size={36} style={{ color: "var(--ink-300)" }} />
                <div className="clr-card-title">{tc[m.titleKey]}</div>
                <p className="clr-card-desc">{tc[m.descKey]}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify visually**

Run `npm run dev`. Visit `localhost:3000/calculators`. Expected:
- Cream background. Tag "calculators" in teal pill mono.
- Title "Calculators" (or its translation) in sans-serif, large.
- Guided banner: white card, compass icon in teal, body sans-serif, CTA arrow shifts right on hover.
- Grid: 8 cards. First three are clickable (slug `geo`, `fosa-septica`, `mantenimiento`) with hover lift + teal top line. Last five are dimmed with "Próximamente" badge top-right.
- Each card: number+slug in teal mono, glyph SVG in teal top-right, title in ink sans-serif 600, description in ink-600, normativas chip in mono 10px ink-300, CTA in teal.

Switch language toggle in navbar — banner text switches ES/EN.

Tab through cards — focus rings teal.

Mobile 375px — grid collapses to single column. Cards 100% width.

Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add app/calculators/page.js
git commit -m "$(cat <<'EOF'
feat(calculators): redesign hub in clear theme

Replaces dark gradient + cyan + IBM Plex Mono palette with the new
clear theme tokens. Emojis 📍🪣🔧🏗🔬⚗️🧱💧 replaced by SVG glyph
components. Card layout mirrors landing ls-card hover treatment.
Numbered modules (01-08). Soon cards get a corner badge instead of
bottom-text "Próximamente". Guided banner uses Compass SVG icon.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Migrate landing (`app/page.js`) hex literals to tokens

Visual must stay identical. Only the source of values changes.

**Files:**
- Modify: `app/page.js`

- [ ] **Step 1: Take a screenshot of the current landing for diff**

Run `npm run dev`. Visit `localhost:3000`. Take a screenshot (use OS shortcut or `preview_screenshot` if available). Save as `/tmp/landing-before.png`. Stop server.

- [ ] **Step 2: Replace hex/font values in the `LANDING_CSS` template literal**

Open `app/page.js`. Find the `LANDING_CSS` template literal (around line 84). Replace each hex/font with the corresponding token. Specific substitutions inside that template literal:

| Find | Replace |
|---|---|
| `#FAFAF7` | `var(--bg)` |
| `#0A1F1C` | `var(--ink-900)` |
| `'Inter', -apple-system, system-ui, sans-serif` | `var(--font-sans)` |
| `rgba(15,118,110,0.04)` | `var(--accent-faint)` |
| `rgba(15,118,110,0.13)` | `var(--accent-soft)` |
| `rgba(15,118,110,0.2)` | `var(--accent-soft)` (matches close enough) |
| `rgba(15,118,110,0.33)` | `var(--accent-soft)` (matches close enough) |
| `rgba(15,118,110,0.3)` | (leave — used in shadow gradient) |
| `rgba(15,118,110,0.5)` | (leave — used in shadow) |
| `#0F766E` | `var(--accent)` |
| `#FFFFFF` | `var(--surface)` |
| `#E5E5E0` | `var(--line)` |
| `#F4F4EE` | `var(--surface-alt)` |
| `#525B5A` | `var(--ink-600)` |
| `#E8E8E2` | `var(--line-soft)` |
| `#16A34A` | `var(--success)` |
| `rgba(22,163,74,0.13)` | (leave — color-specific halo) |

The SVG patterns inside `data:image/svg+xml;utf8,...` keep their `%230F766E` (URL-encoded `#0F766E`) — **do not** try to substitute inside those strings. They're embedded SVG.

- [ ] **Step 3: Replace hex/font values in the `S = {}` object at the bottom**

Same substitution table. For shadow rgba()s that match no token exactly, leave them.

For shadows specifically:
- `0 6px 20px -8px rgba(15,118,110,0.5)` → `var(--shadow-logo)`
- `0 18px 32px -20px rgba(15,118,110,0.3)` → `var(--shadow-card-hover)` (if present anywhere in S — search for it)

For fonts:
- `'JetBrains Mono', monospace` → `var(--font-mono)`
- `'Inter', -apple-system, system-ui, sans-serif` → `var(--font-sans)` (this lives in `S.page` and on `.ls-page`)

Sizes:
- `clamp(38px, 5.5vw, 60px)` → `var(--fs-hero)`
- (Other sizes you may leave — they are not used elsewhere yet)

- [ ] **Step 4: Verify visual diff is invisible**

Run `npm run dev`. Visit `localhost:3000`. Take a screenshot, save as `/tmp/landing-after.png`. Compare side by side (open both in Preview / image viewer). Differences expected:
- **Nav 4px taller** (52→56) → content shifts down 4px globally. Acceptable per spec section 7.
- **Everything else** should be pixel-identical.

If you see any other diff (color shift, missing border, font swap), find the corresponding substitution that broke and revert it.

Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add app/page.js
git commit -m "$(cat <<'EOF'
refactor(landing): migrate hex literals to design tokens

Mechanical substitution of hardcoded #FAFAF7, #0F766E, #0A1F1C,
#525B5A, fonts, etc. to var(--bg), var(--accent), var(--ink-900),
var(--ink-600), var(--font-sans), var(--font-mono). Visual should
be identical except for the 4px navbar height bump documented in
the spec. Embedded SVG data-URIs keep their literal hex.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Final verification pass + a11y check

**Files:** none modified

- [ ] **Step 1: Visit each page and verify**

Run `npm run dev`. Tour at desktop 1280:
- `/` — landing renders, no scanline animation, no grid background. Hover cards lift. CTA arrows shift right.
- `/calculators` — clear hub, 8 cards with SVG glyphs, no emojis.
- `/chat` — renders whatever `ChatClient` shows. Navbar consistent. Internal styling may not match — that is **expected, out of scope**.
- `/build` — same expectation.
- `/licitaciones` — same expectation.

Now mobile 375 (DevTools device emulation):
- Navbar collapses to hamburger.
- Open hamburger — links stack, each ≥48px tall, language toggle at bottom.
- All grids reflow to 1 column.

- [ ] **Step 2: Keyboard navigation**

Reload `/`. Press Tab repeatedly. Each focused element should show a teal outline (2px, 2px offset). Order should match visual order.

- [ ] **Step 3: Reduced motion**

Open DevTools → Rendering → "Emulate CSS media feature `prefers-reduced-motion: reduce`". Reload. The card hover lift should still happen on hover but instantly (no transition). The `ls-pulse` halo on the hero tag dot should freeze. Untick the emulation when done.

- [ ] **Step 4: Lighthouse accessibility audit**

Open DevTools → Lighthouse → Accessibility only → Mobile → Analyze. Run against `/` and against `/calculators`. Expected score ≥ 95 on both.

If the score is below 95, read the failed audits. Most likely failures are color-contrast (verify against the spec section 8) or missing labels. Fix and re-run.

- [ ] **Step 5: Stop dev server. No commit unless fixes were made.**

If any fixes were needed in steps 1-4, commit them with:
```bash
git add -p
git commit -m "fix(redesign): a11y / verification fixes"
```

---

## Task 12: Deploy to Vercel (preview → production)

**Files:** none

- [ ] **Step 1: Confirm clean working tree**

Run:
```bash
git status
```
Expected: `nothing to commit, working tree clean`.

- [ ] **Step 2: Push to current branch**

```bash
git push origin main
```

If the Vercel project `hydrostacks` is linked to `main`, this triggers an auto-deploy. Otherwise:

- [ ] **Step 3 (optional): Manually deploy preview via Vercel CLI**

Run:
```bash
vercel
```

The CLI shows a preview URL. Visit it. Tour the same pages as Task 11. Confirm the deploy matches local.

- [ ] **Step 4: Promote to production**

If the preview looks correct, promote:
```bash
vercel --prod
```

Vercel returns the production URL. Tour once more.

- [ ] **Step 5: Tag the release**

```bash
git tag redesign/clear-theme-v1
git push origin redesign/clear-theme-v1
```

---

## Spec coverage check

| Spec section | Implemented in |
|---|---|
| 3.1 Color tokens | Task 1 |
| 3.2 Typography tokens | Task 1 |
| 3.3 Spacing tokens | Task 1 |
| 3.4 Radii + sombras | Task 1 |
| 3.5 Layout tokens | Task 1 |
| 4 Navbar visual / mobile / a11y / removals | Task 3 (classes) + Task 4 (component) + Task 5 (font cleanup) |
| 5.1–5.3 /calculators redesign + 8 glyphs | Task 7 (glyphs) + Task 8 (classes) + Task 9 (page) |
| 6 /chat, /build, /licitaciones cáscaras | Implicit — they render via root layout; the new navbar already gives them consistent shell. No edit needed unless they hide the navbar. (Verified in Task 11 step 1.) |
| 7 Landing migration | Task 10 |
| 8 Accessibility | Task 1 (focus-visible, prefers-reduced-motion) + Task 4 (aria attrs) + Task 11 (audit) |
| 9 Performance | Task 5 (font cleanup) + Task 11 (Lighthouse) |
| 11 Pre-deploy verification | Task 11 |
| Spec out-of-scope items | Respected — nothing in this plan touches concrete calculators, internal components, API, etc. |

Spec section 6 noted that `/chat`, `/build`, `/licitaciones` shells "wrap with consistent background and container". On rereading: they render their internal components inside `<main>` which already lives under the new Navbar. The cleanest interpretation is "don't touch them unless they explicitly fight the new theme". Skipping their edit is the YAGNI choice. If the user disagrees during execution, adding a wrapper is a single-step task.
