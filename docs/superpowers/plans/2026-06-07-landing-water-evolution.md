# Landing "Water Treatment Bridge" — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolucionar la landing actual (`app/page.js`) al sistema visual "engineering sobrio" con tratamiento gráfico orientado a aguas y exposición de sub-rutas operativas, siguiendo la spec `docs/superpowers/specs/2026-06-07-landing-water-evolution-design.md`.

**Architecture:** Reescritura inline de `app/page.js` (Client Component, sin nuevos componentes ni rutas). Extensión aditiva de `src/lib/i18n.js` (claves viejas conservadas). Adición de la fuente **JetBrains Mono** en `app/layout.js`. Sin nuevas dependencias.

**Tech Stack:** Next.js 14 App Router · React 18 · CSS inline (`const S = {}`) + bloque `<style dangerouslySetInnerHTML>` · `next/link` · `useLang()` (custom i18n) · Inter + JetBrains Mono vía Google Fonts.

**Referencia visual canónica:** `.superpowers/brainstorm/19417-1780843460/content/option-b-water.html` (paths SVG y valores 1:1).

**Spec:** [`docs/superpowers/specs/2026-06-07-landing-water-evolution-design.md`](../specs/2026-06-07-landing-water-evolution-design.md).

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `app/layout.js` | Modificar (1 línea) | Cargar JetBrains Mono junto a las fuentes existentes |
| `src/lib/i18n.js` | Modificar (2 bloques) | Añadir claves nuevas en `es.landing` y `en.landing` |
| `app/page.js` | Reescribir | Hero + grid 2×2 con sub-links + footer en estilo engineering sobrio |

---

## Task 1: Añadir JetBrains Mono al layout

**Files:**
- Modify: `app/layout.js:18-21`

- [ ] **Step 1.1: Editar el `<link>` de Google Fonts**

Abrir `app/layout.js`. Buscar la línea 19:

```js
href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Inter:wght@400;500;600;700&display=swap"
```

Reemplazar por (añade `JetBrains+Mono`):

```js
href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
```

- [ ] **Step 1.2: Verificar carga sin romper el layout existente**

Ejecutar:

```bash
npx tsc --noEmit
```

Esperado: 0 errores. (`app/layout.js` solo cambia el atributo `href` de un `<link>` — no afecta tipos.)

- [ ] **Step 1.3: Commit**

```bash
git add app/layout.js
git commit -m "$(cat <<'EOF'
feat(landing): cargar JetBrains Mono en layout

Necesaria para la nueva landing (style "engineering sobrio"). Se añade
sin desplazar Orbitron / IBM Plex Mono / Inter — el resto de páginas
no cambia.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Extender `src/lib/i18n.js` — bloque ES

**Files:**
- Modify: `src/lib/i18n.js:12-39` (bloque `es.landing`)

- [ ] **Step 2.1: Localizar el cierre de `es.landing`**

Abrir `src/lib/i18n.js`. El bloque `es.landing` contiene hoy las claves antiguas (`tagline`, `subtitle`, `cta`, `feat*`, `modulesTitle`) más las del hub previo (`hubTag`, `hubTitle`, `hubLead`, `cardCta`, `mod1..mod4`). Encontrar la línea con `mod4: { title: "Licitaciones", desc: "Explora contratación pública del sector agua (SECOP II)." },` y la línea siguiente que cierra el objeto `landing: { ... }` con `},`.

- [ ] **Step 2.2: Insertar bloque nuevo justo antes del cierre**

Insertar dentro de `es.landing` (entre `mod4: { ... },` y el `},` del cierre del bloque `landing`):

```js
// --- Landing 2026-06-07 (water-evolution) ---
heroTag: "Plataforma del sector agua",
heroTitleA: "Cálculo, diseño e ",
heroTitleEm: "inteligencia de contratación",
heroTitleB: " para el sector agua y saneamiento.",
heroLead: "Cuatro módulos integrados sobre una base normativa estricta y datos públicos abiertos. Para propietarios, profesionales y empresas que persiguen contratos del sector.",
meta: [
  { value: "Res. 0330/2017", scope: "CO" },
  { value: "CTE DB-HS 5",    scope: "ES" },
  { value: "ASTM D6391",     scope: "US" },
  { value: "SECOP II",       scope: "datos.gov.co" },
],
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

Las claves `mod1..mod4` (objetos `{title, desc}`) ya existen y **se conservan** intactas — no se borran. Las nuevas `mod1Title/Desc/Cta` son aditivas para evitar romper consumidores actuales.

- [ ] **Step 2.3: Verificación sintáctica**

```bash
node -e "require('./src/lib/i18n.js')"
```

Esperado: ejecuta sin error (no `SyntaxError`). Si falla, revisar comas y cierre del objeto `landing`.

---

## Task 3: Extender `src/lib/i18n.js` — bloque EN

**Files:**
- Modify: `src/lib/i18n.js:174-198` (bloque `en.landing`)

- [ ] **Step 3.1: Localizar el cierre de `en.landing`**

Mismo procedimiento que Task 2 pero en el bloque inglés. Encontrar la línea con `mod4: { title: "Tenders", desc: "Explore public water-sector contracting (SECOP II)." },` y el `},` del cierre del bloque `landing`.

- [ ] **Step 3.2: Insertar el bloque equivalente en inglés**

Insertar dentro de `en.landing` (mismo lugar que en ES):

```js
// --- Landing 2026-06-07 (water-evolution) ---
heroTag: "Water-sector platform",
heroTitleA: "Engineering, design and ",
heroTitleEm: "procurement intelligence",
heroTitleB: " for water and sanitation.",
heroLead: "Four integrated modules on a strict regulatory base and open public data. For owners, professionals, and companies pursuing sector contracts.",
meta: [
  { value: "Res. 0330/2017", scope: "CO" },
  { value: "CTE DB-HS 5",    scope: "ES" },
  { value: "ASTM D6391",     scope: "US" },
  { value: "SECOP II",       scope: "datos.gov.co" },
],
pillarsLabel: "▸ Modules",
pillarsH: "Four tools, one domain.",
pillarsFlow: "Flow: calc → design → consult → opportunity",
mod1Title: "Code-compliant engineering",
mod1Desc:  "Septic tank, ASTM perc test, drainage field and maintenance. PDF with signature area.",
mod1Cta:   "Open calculators",
submod1a: "Geo",
submod1b: "Septic tank",
submod1c: "Maintenance",
mod2Title: "Guided 3D design · Digital twin",
mod2Desc:  "Step-by-step flow with isometric view and real geolocation (Leaflet + Open-Meteo).",
mod2Cta:   "Start designing",
mod3Title: "Bilingual expert agent",
mod3Desc:  "Detects profile and sub-scenario; orients by country (LATAM · US · Spain).",
mod3Cta:   "Talk to the agent",
mod4Title: "Procurement intelligence",
mod4Desc:  "SECOP II water-sector processes and contracts. ELT extensible to OCDS, RUP, RUES, SUI.",
mod4Cta:   "Explore opportunities",
footerTagline: "Water and sanitation platform",
footerPhase:   "Phase 0.6 · ingest operational",
chips: {
  m1: ["V_N · Cr 0.85", "Van't Hoff", "FS configurable"],
  m2: ["Babylon.js", "Isometric", "Geo"],
  m3: ["ES · EN", "Auto-profile", "4 sub-scenarios"],
  m4: ["SECOP II", "Public data", "ELT"],
},
```

- [ ] **Step 3.3: Verificación sintáctica**

```bash
node -e "const i = require('./src/lib/i18n.js'); console.log(Object.keys(i.translations.es.landing).length, Object.keys(i.translations.en.landing).length);"
```

Esperado: imprime dos números iguales (la cantidad de claves en `es.landing` y `en.landing` coinciden). Si el i18n no exporta `translations` con ese nombre, ajustar el test:

```bash
grep -c "heroTitleEm" src/lib/i18n.js
```

Esperado: `2` (una vez en ES, una vez en EN).

- [ ] **Step 3.4: Commit (Task 2 + Task 3 juntas)**

```bash
git add src/lib/i18n.js
git commit -m "$(cat <<'EOF'
feat(landing): copy bilingüe water-evolution (ES + EN)

Claves nuevas aditivas bajo es.landing y en.landing: heroTag,
heroTitleA/Em/B, heroLead, meta[], pillarsLabel/H/Flow, modN-Title/Desc/Cta,
submod1a/b/c, chips, footerTagline, footerPhase. Las claves del hub
2026-06-03 se conservan intactas.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Reescribir `app/page.js`

**Files:**
- Replace: `app/page.js`

- [ ] **Step 4.1: Reemplazar el archivo completo**

Sobrescribir `app/page.js` con este contenido íntegro:

```js
"use client";
import Link from "next/link";
import { useLang } from "@/src/lib/i18n";

/* --- Glifos SVG inline (referencia 1:1 con option-b-water.html) --- */

function GlyphCalc() {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" style={S.glyph}>
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

function GlyphBuild() {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" style={S.glyph}>
      <path d="M20 6 L34 14 L34 28 L20 36 L6 28 L6 14 Z" />
      <path d="M20 6 L20 20 M6 14 L20 20 L34 14" />
      <line x1="11" y1="22" x2="11" y2="30" opacity="0.5" />
      <line x1="15" y1="24" x2="15" y2="32" opacity="0.5" />
      <line x1="19" y1="22" x2="19" y2="34" opacity="0.5" />
    </svg>
  );
}

function GlyphAgent() {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" style={S.glyph}>
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

function GlyphTender() {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" style={S.glyph}>
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
  {
    n: "01",
    label: "CALCULADORAS",
    href: "/calculators",
    glyph: "calc",
    chipsKey: "m1",
    titleKey: "mod1Title",
    descKey: "mod1Desc",
    ctaKey: "mod1Cta",
    subRoutes: [
      { labelKey: "submod1a", href: "/calculators/geo" },
      { labelKey: "submod1b", href: "/calculators/fosa-septica" },
      { labelKey: "submod1c", href: "/calculators/mantenimiento" },
    ],
  },
  { n: "02", label: "BUILD",        href: "/build",        glyph: "build",  chipsKey: "m2", titleKey: "mod2Title", descKey: "mod2Desc", ctaKey: "mod2Cta", subRoutes: [] },
  { n: "03", label: "AGENTE",       href: "/chat",         glyph: "agent",  chipsKey: "m3", titleKey: "mod3Title", descKey: "mod3Desc", ctaKey: "mod3Cta", subRoutes: [] },
  { n: "04", label: "LICITACIONES", href: "/licitaciones", glyph: "tender", chipsKey: "m4", titleKey: "mod4Title", descKey: "mod4Desc", ctaKey: "mod4Cta", subRoutes: [] },
];

const LANDING_CSS = `
.ls-page { background: #FAFAF7; color: #0A1F1C; font-family: 'Inter', -apple-system, system-ui, sans-serif; }
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
.ls-tag-dot { position: relative; width: 6px; height: 6px; border-radius: 50%; background: #0F766E; display: inline-block; }
.ls-tag-dot::after {
  content: ""; position: absolute; inset: -3px; border-radius: 50%;
  border: 1px solid #0F766E; opacity: .5;
  animation: ls-pulse 2.4s ease-out infinite;
}
@keyframes ls-pulse { 0% { transform: scale(.8); opacity: .8; } 100% { transform: scale(1.6); opacity: 0; } }
.ls-title em {
  font-style: normal; color: #0F766E; position: relative;
}
.ls-title em::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: -6px; height: 6px;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 6' preserveAspectRatio='none'><path d='M0,3 Q15,0 30,3 T60,3' stroke='%230F766E' stroke-width='1.2' fill='none' opacity='0.55'/></svg>");
  background-repeat: repeat-x; background-size: 60px 6px;
}
.ls-card {
  background: #FFFFFF; border: 1px solid #E5E5E0; border-radius: 12px;
  padding: 24px; display: flex; flex-direction: column; gap: 14px;
  min-height: 260px; position: relative; overflow: hidden;
  text-decoration: none; color: inherit;
  transition: border-color .18s, transform .18s, box-shadow .18s;
}
.ls-card::before {
  content: ""; position: absolute; top: 0; left: 24px; right: 24px; height: 1px;
  background: linear-gradient(to right, #0F766E, transparent);
  opacity: 0; transition: opacity .18s;
}
.ls-card:hover {
  border-color: rgba(15,118,110,0.33);
  transform: translateY(-3px);
  box-shadow: 0 18px 32px -20px rgba(15,118,110,0.3);
}
.ls-card:hover::before { opacity: 1; }
.ls-card:hover .ls-cta-arrow { transform: translateX(4px); }
.ls-cta-arrow { display: inline-block; transition: transform .18s; }
.ls-sub a { color: #525B5A; text-decoration: none; }
.ls-sub a:hover { color: #0F766E; }
.ls-footer-wave {
  position: absolute; top: -1px; left: 0; right: 0; height: 2px;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 2' preserveAspectRatio='none'><path d='M0,1 Q30,0 60,1 T120,1' stroke='%230F766E' stroke-width='0.8' fill='none' opacity='0.4'/></svg>");
  background-repeat: repeat-x; background-size: 120px 2px;
}
`;

export default function LandingPage() {
  const { t } = useLang();
  const tl = t.landing;

  return (
    <div style={S.page} className="ls-page">
      <style dangerouslySetInnerHTML={{ __html: LANDING_CSS }} />

      <header className="ls-hero">
        <div style={S.container}>
          <div style={S.mark}>
            <div style={S.markLogo}>H</div>
            <div style={S.markName}>HydroStack</div>
            <div style={S.markBar} />
            <div style={S.markLang}>ES · EN</div>
          </div>

          <span style={S.tag}>
            <span className="ls-tag-dot" />
            <span style={{ marginLeft: 8 }}>{tl.heroTag}</span>
          </span>

          <h1 className="ls-title" style={S.title}>
            {tl.heroTitleA}<em>{tl.heroTitleEm}</em>{tl.heroTitleB}
          </h1>

          <p style={S.lead}>{tl.heroLead}</p>

          <div style={S.meta}>
            {tl.meta.map((m, i) => (
              <div key={i} style={{ ...S.metaItem, ...(i === tl.meta.length - 1 ? S.metaItemLast : null) }}>
                <strong style={S.metaStrong}>{m.value}</strong> · {m.scope}
              </div>
            ))}
          </div>
        </div>
      </header>

      <section style={S.pillars}>
        <div style={S.container}>
          <div style={S.pillarsHead}>
            <div>
              <div style={S.pillarsLabel}>{tl.pillarsLabel}</div>
              <h2 style={S.pillarsH}>{tl.pillarsH}</h2>
            </div>
            <div style={S.pillarsSide}>{tl.pillarsFlow}</div>
          </div>

          <div style={S.grid}>
            {MODULES.map((m) => {
              const Glyph = GLYPHS[m.glyph];
              const chips = tl.chips[m.chipsKey];
              return (
                <Link key={m.n} href={m.href} className="ls-card">
                  <div style={S.cardTop}>
                    <span style={S.cardNum}>{m.n} · {m.label}</span>
                    <Glyph />
                  </div>
                  <span style={S.cardTitle}>{tl[m.titleKey]}</span>
                  <p style={S.cardDesc}>{tl[m.descKey]}</p>

                  {m.subRoutes.length > 0 && (
                    <div className="ls-sub" style={S.cardSub}>
                      {m.subRoutes.map((s, i) => (
                        <span key={s.href}>
                          {i > 0 && <span style={S.subSep}> · </span>}
                          <Link href={s.href} onClick={(e) => e.stopPropagation()}>
                            {tl[s.labelKey]}
                          </Link>
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={S.chips}>
                    {chips.map((c, i) => <span key={i} style={S.chip}>{c}</span>)}
                  </div>

                  <span style={S.cardCta}>
                    {tl[m.ctaKey]} <span className="ls-cta-arrow">→</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <footer style={S.footer}>
        <div className="ls-footer-wave" />
        <div style={{ ...S.container, ...S.footerInner }}>
          <div style={S.footerLeft}>
            <span style={{ fontWeight: 600, color: "#0A1F1C" }}>HydroStack</span>
            <span>·</span>
            <span>{tl.footerTagline}</span>
          </div>
          <div style={S.footerRight}>
            <span style={S.footerDot} />
            <span>{tl.footerPhase}</span>
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
  mark: { display: "flex", alignItems: "center", gap: 10, marginBottom: 28 },
  markLogo: {
    width: 28, height: 28, borderRadius: 7, background: "#0F766E", color: "white",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 700, fontSize: 13, boxShadow: "0 6px 20px -8px rgba(15,118,110,0.5)",
  },
  markName: { fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" },
  markBar: { flex: 1, height: 1, background: "linear-gradient(to right, rgba(15,118,110,0.13), transparent)", maxWidth: 120 },
  markLang: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#525B5A", letterSpacing: ".08em" },

  tag: {
    display: "inline-flex", alignItems: "center",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, color: "#0F766E",
    letterSpacing: "0.18em", textTransform: "uppercase",
    marginBottom: 28, padding: "4px 12px 4px 8px",
    border: "1px solid rgba(15,118,110,0.13)", borderRadius: 999,
    background: "rgba(15,118,110,0.03)",
  },

  title: {
    fontSize: "clamp(38px, 5.5vw, 60px)", fontWeight: 700,
    letterSpacing: "-0.028em", lineHeight: 1.04,
    color: "#0A1F1C", marginBottom: 24, maxWidth: 760,
  },
  lead: { fontSize: 18, color: "#525B5A", maxWidth: 600, lineHeight: 1.55, margin: 0 },

  meta: {
    marginTop: 36, display: "flex", gap: 0, flexWrap: "wrap",
    borderTop: "1px dashed rgba(15,118,110,0.2)",
    paddingTop: 20, maxWidth: 760,
  },
  metaItem: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, color: "#525B5A", letterSpacing: ".04em",
    padding: "4px 18px 4px 0", marginRight: 18,
    borderRight: "1px solid #E5E5E0",
  },
  metaItemLast: { borderRight: "none", marginRight: 0 },
  metaStrong: { color: "#0A1F1C", fontWeight: 600 },

  /* PILLARS */
  pillars: { paddingBottom: "clamp(96px, 12vw, 140px)", position: "relative" },
  pillarsHead: {
    display: "flex", alignItems: "flex-end", justifyContent: "space-between",
    gap: 24, flexWrap: "wrap", marginBottom: 32,
  },
  pillarsLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, color: "#0F766E", letterSpacing: ".15em", textTransform: "uppercase",
  },
  pillarsH: {
    fontSize: 24, fontWeight: 600, letterSpacing: "-0.015em",
    marginTop: 8, color: "#0A1F1C", maxWidth: 520,
  },
  pillarsSide: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, color: "#525B5A", letterSpacing: ".04em",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))",
    gap: 14,
  },

  /* CARD */
  cardTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  cardNum: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, color: "#0F766E", letterSpacing: ".12em", fontWeight: 500,
  },
  glyph: { width: 36, height: 36, color: "#0F766E", flexShrink: 0 },
  cardTitle: { fontSize: 18, fontWeight: 600, letterSpacing: "-0.012em", color: "#0A1F1C" },
  cardDesc: { fontSize: 13.5, color: "#525B5A", lineHeight: 1.55, flexGrow: 1, margin: 0 },
  cardSub: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, color: "#525B5A", display: "flex", flexWrap: "wrap", alignItems: "center",
  },
  subSep: { color: "#E5E5E0", margin: "0 4px" },
  chips: { display: "flex", gap: 6, flexWrap: "wrap" },
  chip: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10, padding: "3px 8px",
    background: "#F4F4EE", border: "1px solid #E5E5E0", borderRadius: 4,
    color: "#525B5A", letterSpacing: ".03em",
  },
  cardCta: {
    marginTop: 4, fontSize: 13, fontWeight: 500, color: "#0F766E",
    display: "flex", alignItems: "center", gap: 6,
  },

  /* FOOTER */
  footer: { borderTop: "1px solid #E8E8E2", padding: "28px 0", background: "#fff", position: "relative" },
  footerInner: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: 12,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, color: "#525B5A", letterSpacing: ".04em",
  },
  footerLeft: { display: "flex", gap: 12, alignItems: "center" },
  footerRight: { display: "flex", gap: 14, alignItems: "center" },
  footerDot: {
    width: 6, height: 6, borderRadius: "50%", background: "#16A34A",
    boxShadow: "0 0 0 3px rgba(22,163,74,0.13)",
  },
};
```

- [ ] **Step 4.2: Typecheck**

```bash
npx tsc --noEmit
```

Esperado: 0 errores nuevos (el archivo es `.js`, así que tsc lo ignora si no hay `// @ts-check`, pero verifica que no rompió tipos en cascada).

- [ ] **Step 4.3: Build**

```bash
npm run build
```

Esperado: build exitoso, sin errores ni warnings de Next.js sobre `app/page.js`.

- [ ] **Step 4.4: Commit**

```bash
git add app/page.js
git commit -m "$(cat <<'EOF'
feat(landing): reescribir como "water treatment bridge"

Implementa la spec 2026-06-07: hero engineering-sobrio con water-line
SVG, hex-grid sutil, mark inline + dot pulsante, meta-strip normativa;
grid 2×2 de cards con glifos SVG por pilar; sub-links operativos en
card 01 (Geo · Fosa séptica · Mantenimiento); footer con onda sutil.
Sin nuevas rutas, sin nuevas dependencias.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Verificación end-to-end con preview

**Files:** ninguno (solo verificación).

- [ ] **Step 5.1: Iniciar el dev server**

Usar la herramienta `preview_start` para arrancar `npm run dev`.

- [ ] **Step 5.2: Snapshot inicial**

`preview_snapshot` en `/`. Confirmar que aparecen:
- Mark `HydroStack` arriba a la izquierda con cuadradito `H` verde.
- Switch `ES · EN` a la derecha de la barra.
- Tag pill verde con dot.
- Título grande con `inteligencia de contratación` resaltado en verde y line ondulada bajo.
- Lead de 2 líneas.
- Meta-strip con `Res. 0330/2017 · CO` etc., separados por borde derecho.
- Sección "Módulos" con h2 y side-flow.
- 4 cards: `01 · CALCULADORAS`, `02 · BUILD`, `03 · AGENTE`, `04 · LICITACIONES`.
- En `01 · CALCULADORAS`: sub-links `Geo · Fosa séptica · Mantenimiento`.
- Footer con dot verde + `Fase 0.6 · ingesta operativa · hydrostack.io`.

- [ ] **Step 5.3: Navegación de pilares**

Para cada card, `preview_click` y verificar URL en `preview_snapshot`:

| Acción | URL esperada |
|---|---|
| Click card 01 (zona sin sub-links) | `/calculators` |
| Click sub-link "Geo" en card 01 | `/calculators/geo` |
| Click sub-link "Fosa séptica" en card 01 | `/calculators/fosa-septica` |
| Click sub-link "Mantenimiento" en card 01 | `/calculators/mantenimiento` |
| Click card 02 | `/build` |
| Click card 03 | `/chat` |
| Click card 04 | `/licitaciones` |

Volver a `/` entre clicks con `preview_eval: window.history.back()` o navegación directa.

- [ ] **Step 5.4: Toggle bilingüe**

Click en navbar para cambiar de ES a EN. `preview_snapshot` y verificar que el copy del hero, h2, side-flow, cards, sub-links, chips y footer cambian a inglés. Si no hay link explícito en navbar para cambiar idioma, verificar el mecanismo con `grep -r "setLang\|toggleLang\|switchLang" src/components/Navbar.js` y disparar el evento equivalente.

- [ ] **Step 5.5: Responsive**

```
preview_resize(375, 800)   # móvil
preview_resize(768, 1024)  # tablet
preview_resize(1440, 900)  # desktop
```

Esperado:
- 375px: 1 columna; mark + tag respiran; título no se rompe en horrible.
- 768px: 1 ó 2 columnas (`minmax(320px, 1fr)` decide); side-flow puede pasar bajo h2.
- 1440px: grid 2×2 limpio, contenedor centrado.

- [ ] **Step 5.6: Consola sin errores**

`preview_console_logs` debe estar limpio de:
- Hydration mismatches.
- 404 de fuentes (Inter, JetBrains Mono, Orbitron, IBM Plex Mono).
- `Warning: Each child in a list should have a unique "key" prop`.

- [ ] **Step 5.7: Screenshot final + commit doc opcional**

`preview_screenshot` y entregarlo al usuario como evidencia de la nueva landing.

No hay commit en este step — toda la verificación es validación, no cambios.

---

## Self-Review

**Cobertura de la spec:**
- §3.1 tokens nuevos → presentes inline en `S` y en `LANDING_CSS` (Task 4).
- §3.2 estructura general → orden de elementos en el JSX (Task 4).
- §3.3 hero (mark, tag, título, lead, meta) → Task 4.
- §3.4 pilares (label + h2 + side-flow + grid) → Task 4.
- §3.5 anatomía de card (num+glyph, title, desc, sub-links, chips, cta) → Task 4.
- §3.6 mapeo MODULES con sub-links solo en card 01 → Task 4.
- §3.7 footer con onda → Task 4 (`.ls-footer-wave`).
- §4 copy bilingüe → Task 2 (ES) y Task 3 (EN).
- §5 restricciones → respetadas: `"use client"`, `const S` + `<style dangerouslySetInnerHTML>`, no Tailwind, no nuevas deps.
- §6 plan resumen → todas las verificaciones presentes en Task 5.

**Placeholders:** ningún TBD/TODO. Todas las cadenas y paths SVG están escritas.

**Consistencia de tipos/nombres:**
- `chipsKey` = `m1..m4` ↔ `tl.chips.m1..m4` en Task 2/3 ✓
- `titleKey`/`descKey`/`ctaKey` = `mod1Title/mod1Desc/mod1Cta` ↔ claves en i18n ✓
- `submod1a/b/c` ↔ usados como `s.labelKey` en MODULES y resueltos como `tl[s.labelKey]` ✓
- `glyph` selector (`calc/build/agent/tender`) ↔ `GLYPHS` map ✓
- Clases CSS (`ls-page`, `ls-hero`, `ls-card`, `ls-tag-dot`, `ls-title`, `ls-cta-arrow`, `ls-sub`, `ls-footer-wave`) declaradas en `LANDING_CSS` y referenciadas en JSX ✓

**Spec requirements con riesgo:**
- Carga de fuentes vía Google Fonts CDN (Task 1) en lugar de `next/font`. La spec mencionaba preferir `next/font` pero permitía el fallback CDN — se eligió CDN porque `app/layout.js` ya usa ese patrón y migrarlo sería un cambio fuera de alcance. Riesgo aceptado: FOUT mínimo en primera carga.
- Sub-link click usa `e.stopPropagation()` para no disparar el `<Link>` padre de la card. Verificado funcionalmente en Task 5.3.
