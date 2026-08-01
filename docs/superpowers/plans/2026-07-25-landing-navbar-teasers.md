# Landing Teasers + Navbar Anchors (Option B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the 4 non-hero navbar items (Proyectos, Calculadoras, Asistente, Nosotros) from direct route links into short teaser cards anchored on the home page, with the navbar scrolling to them and highlighting the active section — without touching the internals of `/build`, `/calculators`, or `/chat`.

**Architecture:** Option B from the audit — home (`app/page.js`) stays a single component; a new teaser section with 4 `.clr-card`-style cards (id-anchored) replaces the current bare-link "pillars" row. `src/components/Navbar.js` NAV_ITEMS gain an `anchor` + `route` pair per item: anchor items link to `/#id` and are highlighted via IntersectionObserver when on `/`; route items (Licitaciones) keep linking straight to their page, per explicit decision. `/nosotros` does not exist today and is created as a minimal page so the new teaser's CTA isn't a dead link.

**Deviations from the source spec (flagged, not silent):**
- Proyectos teaser CTA points to `/build` (the only route that exists for that nav slot), not `/proyectos` — that route was never built; the plan's literal path was aspirational.
- No automated tests are added for these changes. This repo's entire `vitest` suite (`src/__tests__/**`) covers backend/calculation/ingest logic only — zero precedent for testing JSX/component markup. Each task instead ends with a manual dev-server verification step, matching the "For UI or frontend changes ... test in browser" rule and this codebase's actual convention.
- Reuses existing `.clr-card`, `.clr-grid`, `.clr-guided-banner`-adjacent tokens/classes already defined in `app/globals.css`. No new hex colors are introduced anywhere in this plan.

**Tech Stack:** Next.js 15 App Router, plain CSS custom properties (no Tailwind), client components (`"use client"`), no test framework touched.

---

### Task 1: Create the `/nosotros` page

**Files:**
- Create: `app/nosotros/page.js`

- [x] **Step 1: Write the page**

```jsx
export const metadata = {
  title: "Nosotros · HydroStack",
};

export default function NosotrosPage() {
  return (
    <div className="clr-page">
      <div className="clr-container">
        <header style={{ marginBottom: 22 }}>
          <span className="clr-tag">nosotros</span>
          <h1 className="clr-h1">Un ingeniero especialista, no una startup genérica</h1>
          <p className="clr-sub">
            11 años en agua y saneamiento, planes directores ejecutados y licencia
            profesional vigente — el método detrás de cada indicador que ves en
            HydroStack.
          </p>
        </header>
      </div>
    </div>
  );
}
```

- [x] **Step 2: Verify it renders**

Run: `npm run dev`, open `http://localhost:3000/nosotros`.
Expected: page loads with the light theme (white background, navy text, blue tag pill), no console errors. No navbar link points here yet — that's Task 3.

- [x] **Step 3: Commit**

```bash
git add app/nosotros/page.js
git commit -m "feat(nosotros): agrega página mínima de Nosotros"
```

---

### Task 2: Replace the "pillars" row in `app/page.js` with 4 anchored teaser cards

**Files:**
- Modify: `app/page.js:36-81` (glyph registry + `MODULES`/`TOOLS_LITE`/`TOOL_COPY` constants)
- Modify: `app/page.js:188-304` (`LANDING_CSS` template string)
- Modify: `app/page.js:426-444` (the `<section style={S.pillars}>` block)
- Modify: `app/page.js:553-563` (`S.pillars`/`S.pillarsH`/`S.toolsRow`/`S.toolItem`/`S.toolTitle`/`S.toolDesc` — no longer used, remove)

- [x] **Step 1: Add the Nosotros glyph next to the other `Glyph*` functions (after `GlyphTender`, line 61)**

```jsx
function GlyphAbout({ size = 36 }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ ...S.glyph, width: size, height: size }}>
      <circle cx="20" cy="13" r="6" />
      <path d="M8 34 C8 24 14 20 20 20 C26 20 32 24 32 34" />
    </svg>
  );
}
```

- [x] **Step 2: Register it in `GLYPHS` (line 63)**

Replace:
```jsx
const GLYPHS = { calc: GlyphCalc, build: GlyphBuild, agent: GlyphAgent, tender: GlyphTender };
```
With:
```jsx
const GLYPHS = { calc: GlyphCalc, build: GlyphBuild, agent: GlyphAgent, tender: GlyphTender, about: GlyphAbout };
```

- [x] **Step 3: Replace `MODULES` / `TOOLS_LITE` / `TOOL_COPY` (lines 65-81) with a single `TEASERS` array**

Replace the whole block (from `const MODULES = [` through the end of `const TOOL_COPY = { ... };`) with:

```jsx
const TEASERS = [
  {
    id: "proyectos", n: "02", glyph: "build", href: "/build",
    title: "Planes directores de alcantarillado ejecutados en Cali",
    desc: "3 corregimientos, modelado hidráulico y gemelo digital como herramienta de entrega.",
  },
  {
    id: "calculadoras", n: "03", glyph: "calc", href: "/calculators",
    title: "Fosas sépticas, PTAR y redes — dimensionadas según RAS",
    desc: "Calculadoras que aplican la normativa colombiana automáticamente, sin fórmulas sueltas en una hoja de cálculo.",
  },
  {
    id: "asistente", n: "04", glyph: "agent", href: "/chat",
    title: "Lee un pliego de 100 páginas en minutos",
    desc: "El asistente extrae los requisitos legales y técnicos del pliego, para que sepas qué te falta antes de invertir tiempo armando la oferta.",
  },
  {
    id: "nosotros", n: "05", glyph: "about", href: "/nosotros",
    title: "Un ingeniero especialista, no una startup genérica",
    desc: "11 años en agua y saneamiento, planes directores ejecutados y licencia profesional vigente — el método detrás de cada indicador.",
  },
];
```

- [x] **Step 4: Append scroll-margin rule to `LANDING_CSS` (end of the template string, just before the closing `` ` ``, line 303)**

Add this rule right before the final backtick:

```css
.ls-teaser-card { scroll-margin-top: calc(var(--nav-h) + 24px); }
```

- [x] **Step 5: Replace the pillars `<section>` (lines 426-444)**

Replace:
```jsx
      <section style={S.pillars}>
        <div style={S.container}>
          <h2 className="ls-reveal" style={S.pillarsH}>Una vez identificas el proceso, HydroStack te acompaña con:</h2>

          <div style={S.toolsRow}>
            {TOOLS_LITE.map((m, i) => {
              const Glyph = GLYPHS[m.glyph];
              const copy = TOOL_COPY[m.glyph];
              return (
                <Link key={m.n} href={m.href} className="ls-tool-link ls-reveal" style={{ ...S.toolItem, transitionDelay: `${i * 0.09}s` }}>
                  <Glyph size={28} />
                  <span className="ls-tool-title" style={S.toolTitle}>{copy.title}</span>
                  <p style={S.toolDesc}>{copy.desc}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
```

With:
```jsx
      <section style={S.pillars}>
        <div style={S.container}>
          <h2 className="ls-reveal" style={S.pillarsH}>Una vez identificas el proceso, HydroStack te acompaña con:</h2>

          <div className="clr-grid">
            {TEASERS.map((t, i) => {
              const Glyph = GLYPHS[t.glyph];
              return (
                <Link
                  key={t.id}
                  id={t.id}
                  href={t.href}
                  className="clr-card is-active ls-teaser-card ls-reveal"
                  style={{ transitionDelay: `${i * 0.09}s` }}
                >
                  <div className="clr-card-top">
                    <span className="clr-card-num">{t.n}</span>
                    <Glyph size={36} />
                  </div>
                  <div className="clr-card-title">{t.title}</div>
                  <p className="clr-card-desc">{t.desc}</p>
                  <span className="clr-card-cta">
                    Ver más
                    <span className="clr-cta-arrow">→</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
```

- [x] **Step 6: Remove the now-unused style entries (lines 553-563 in the `S` object)**

Delete:
```jsx
  toolsRow: { display: "flex", flexWrap: "wrap", gap: 40 },
  toolItem: { display: "flex", flexDirection: "column", gap: 8, minWidth: 200, flex: "1 1 200px" },
  toolTitle: { fontSize: 15, fontWeight: 600, color: "var(--ink-900)" },
  toolDesc: { fontSize: 13, color: "var(--ink-600)", lineHeight: 1.5, margin: 0 },
```
Keep `S.pillars`, `S.pillarsH`, and `S.glyph` (still used by the `Glyph*` components and the section wrapper).

- [x] **Step 7: Verify in the browser**

Run `npm run dev`, open `http://localhost:3000/`, scroll to the teaser row.
Expected: 4 cards in a responsive grid (`.clr-grid` — `repeat(auto-fill, minmax(280px,1fr))`), each with number/glyph/title/desc/"Ver más →", using the existing light theme (white card, navy title, blue accent) — no new colors. Clicking each card navigates to `/build`, `/calculators`, `/chat`, `/nosotros` respectively.

- [x] **Step 8: Commit**

```bash
git add app/page.js
git commit -m "feat(landing): reemplaza fila de herramientas por tarjetas-teaser ancladas"
```

---

### Task 3: Update the navbar — anchor links + active-section highlighting

**Files:**
- Modify: `src/components/Navbar.js`

- [x] **Step 1: Add `useEffect` to the import (line 4)**

Replace:
```js
import { useState } from "react";
```
With:
```js
import { useEffect, useState } from "react";
```

- [x] **Step 2: Replace `NAV_ITEMS` (lines 7-12)**

Replace:
```js
const NAV_ITEMS = [
  { href: "/licitaciones", index: "01", label: "Licitaciones" },
  { href: "/build", index: "02", label: "Proyectos" },
  { href: "/calculators", index: "03", label: "Calculadoras" },
  { href: "/chat", index: "04", label: "Asistente" },
];
```
With:
```js
const NAV_ITEMS = [
  { href: "/licitaciones", route: "/licitaciones", index: "01", label: "Licitaciones" },
  { href: "/#proyectos", route: "/build", anchor: "proyectos", index: "02", label: "Proyectos" },
  { href: "/#calculadoras", route: "/calculators", anchor: "calculadoras", index: "03", label: "Calculadoras" },
  { href: "/#asistente", route: "/chat", anchor: "asistente", index: "04", label: "Asistente" },
  { href: "/#nosotros", route: "/nosotros", anchor: "nosotros", index: "05", label: "Nosotros" },
];
```

- [x] **Step 3: Replace the `isActive` helper and add scrollspy state (lines 16-22)**

Replace:
```js
  const path = usePathname();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const isActive = (href) => path.startsWith(href);
  const navAria = (active) => (active ? { "aria-current": "page" } : {});
```
With:
```js
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [activeAnchor, setActiveAnchor] = useState(null);

  const close = () => setOpen(false);

  useEffect(() => {
    if (path !== "/") return;
    const anchors = NAV_ITEMS.filter((item) => item.anchor);
    const els = anchors
      .map((item) => document.getElementById(item.anchor))
      .filter(Boolean);
    if (!("IntersectionObserver" in window) || els.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveAnchor(entry.target.id);
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [path]);

  const isActive = (item) =>
    item.anchor ? path === "/" && activeAnchor === item.anchor : path.startsWith(item.route);
  const navAria = (active) => (active ? { "aria-current": "page" } : {});
```

- [x] **Step 4: Update the desktop links block (lines 39-55) to use `isActive(item)` and drop the hardcoded `#about` link**

Replace:
```jsx
        <div className="clr-links">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="clr-nav-link"
              {...navAria(isActive(item.href))}
            >
              <span className="clr-nav-index" aria-hidden="true">{item.index}</span>
              {item.label}
            </Link>
          ))}
          <a href="#about" className="clr-nav-link">
            <span className="clr-nav-index" aria-hidden="true">05</span>
            Nosotros
          </a>
        </div>
```
With:
```jsx
        <div className="clr-links">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="clr-nav-link"
              {...navAria(isActive(item))}
            >
              <span className="clr-nav-index" aria-hidden="true">{item.index}</span>
              {item.label}
            </Link>
          ))}
        </div>
```

- [x] **Step 5: Update the mobile menu block (lines 77-93) the same way**

Replace:
```jsx
      <div id="clr-mobile-menu" className={`clr-mobile-menu${open ? " open" : ""}`}>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="clr-mobile-link"
            {...navAria(isActive(item.href))}
            onClick={close}
          >
            <span className="clr-nav-index" aria-hidden="true">{item.index}</span>
            {item.label}
          </Link>
        ))}
        <a href="#about" className="clr-mobile-link" onClick={close}>
          <span className="clr-nav-index" aria-hidden="true">05</span>
          Nosotros
        </a>
```
With:
```jsx
      <div id="clr-mobile-menu" className={`clr-mobile-menu${open ? " open" : ""}`}>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="clr-mobile-link"
            {...navAria(isActive(item))}
            onClick={close}
          >
            <span className="clr-nav-index" aria-hidden="true">{item.index}</span>
            {item.label}
          </Link>
        ))}
```

(The closing `</div>` two lines below stays as-is — only the hardcoded `<a href="#about">` is removed, since Nosotros is now part of the mapped `NAV_ITEMS`.)

- [x] **Step 6: Verify in the browser**

Run `npm run dev`.
1. On `/`: click "Proyectos", "Calculadoras", "Asistente", "Nosotros" in the navbar — each should smooth-scroll to its card and get `aria-current="page"` (visually: accent color + underline) as it enters the vertical center of the viewport.
2. Navigate to `/build` directly (paste URL) — "Proyectos" nav item should be highlighted (route-based, not anchor-based).
3. Navigate to `/nosotros` directly — "Nosotros" nav item should be highlighted.
4. Resize to mobile width, open the hamburger menu, confirm all 5 items appear (no duplicate Nosotros) and each link/scrolls correctly, then closes the menu on click.

- [x] **Step 7: Commit**

```bash
git add src/components/Navbar.js
git commit -m "feat(navbar): navbar apunta a anchors de home + resalta sección activa"
```

---

### Task 4: Full manual QA pass

**Files:** none (verification only)

- [x] **Step 1: Full click-through from a cold load**

Run `npm run dev`, open `http://localhost:3000/` in a fresh tab.
Check: hero renders (Licitaciones content unchanged), 4 teaser cards render below "Cómo funciona", each links out correctly, footer unchanged.

> Verified 2026-08-01: hero, teaser cards, and card CTAs (`/build`, `/calculators`, `/chat`, `/nosotros`) all confirmed via accessibility-tree read + `curl` 200s on all 6 routes. A separate deep-scroll visual check was blocked by an unrelated browser-pane glitch after the host machine woke from sleep (`window.scrollTo`/wheel stopped registering even on a fresh tab) — nav click-through (Licitaciones, Nosotros) and active-state highlighting were confirmed directly instead.

- [ ] **Step 2: Keyboard navigation**

Tab through the navbar links and the 4 teaser cards. Confirm each receives a visible focus ring (`*:focus-visible` in `app/globals.css:415-419` — already global, no new code needed) and Enter activates the link/scroll.

> Not verified 2026-08-01 — skipped due to the browser-pane scroll glitch above; links are plain `<a>`/`next/link` elements so native focus-visible should apply, but this wasn't visually confirmed.

- [x] **Step 3: Confirm no dead links remain**

Grep for any remaining reference to the old `#about` anchor or `TOOLS_LITE`/`TOOL_COPY`/`MODULES` identifiers in `app/page.js` to confirm the Task 2 replacement was complete:

```bash
grep -n "TOOLS_LITE\|TOOL_COPY\|#about" app/page.js src/components/Navbar.js
```
Expected: no matches.

- [ ] **Step 4: Final commit (only if Step 3 required fixes)**

```bash
git add -A
git commit -m "fix(landing): limpia referencias residuales de la fila de herramientas anterior"
```

---

## Self-Review

**Spec coverage:** navbar → anchors for the 4 teasers (Task 3), Licitaciones kept as a direct route link per explicit user decision (Task 3, `NAV_ITEMS[0]`), teaser card pattern reusing existing `.clr-card` tokens (Task 2), all 4 closed-copy blocks from the spec used verbatim (Task 2 `TEASERS`), missing `/nosotros` page created (Task 1), active-section highlighting included now rather than deferred (Task 3 Step 3), design-token rule respected — zero new hex added anywhere (noted in Architecture, verified in Task 2/3 code — only `var(--*)` and `currentColor` used).

**Placeholder scan:** no TBD/TODO markers; every step has literal code.

**Type/naming consistency:** `TEASERS[].id` values (`proyectos`, `calculadoras`, `asistente`, `nosotros`) match `NAV_ITEMS[].anchor` values exactly in Task 3 — verified across Task 2 Step 3 and Task 3 Step 2.

---

Plan complete and saved to `docs/superpowers/plans/2026-07-25-landing-navbar-teasers.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
