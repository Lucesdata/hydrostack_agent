# Landing Blueprint Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar los puntos accionables de `docs/landing-hydrostack-cambios.md` (spec de rediseño de la landing) contra el estado real de `app/page.js` y sus componentes, sin duplicar trabajo ya hecho ni regresionar funcionalidad viva (auth, datos en vivo de SECOP, matching de oferente).

**Architecture:** El spec de 15 puntos fue escrito sobre una versión anterior de la landing que ya evolucionó más allá de varios de ellos. Este plan solo implementa lo que **no** está resuelto todavía. Cambios pequeños y aislados van directo sobre `app/page.js` / `src/components/landing/*`; el rediseño grande del punto 14 (diagrama de recorrido) se extrae a un componente nuevo, `IntentJourney.jsx`, siguiendo el patrón ya establecido de la carpeta (`PlantaHero.jsx`, `LandingCards.jsx`, `ProcesosTicker.jsx`).

**Tech Stack:** Next.js 14 (App Router, Client Components), React 18, CSS plano vía `<style dangerouslySetInnerHTML>` por componente + `app/globals.css` para tokens/clases compartidas. Sin Tailwind, sin CSS Modules.

---

## Cobertura del spec — qué se implementa y qué no

| Punto | Estado real | Acción en este plan |
|---|---|---|
| 1. Fusionar rejillas | Ya fusionado (Fig. 02 tiene 5 rutas + waitlist; no existe Fig. 06) | Ninguna — superado por el punto 14 |
| 2. Quitar `<ul>` del hero | Esa lista nunca existió en el hero actual | Ninguna |
| 3. CTA único | Ya implementado exactamente como pide el spec (hero + cierre + botón secundario en la card destacada) | Ninguna |
| 4. Reducir ruido blueprint | Cotas inventadas, `cursor:crosshair` y etiqueta `x:1440 y:0` no existen en el código | Ninguna |
| 5. Quitar 22 lámparas parpadeantes | Siguen presentes (`pt-lampA/B/C`) | **Task 1** |
| 6. Quitar emoji 🔒 | Presente en `LandingCards.jsx:330` | **Task 2** |
| 7. Header con logo | Ya existe `<Navbar>` global con logo y nav — más completo que el spec (4 rutas reales + auth), rehacerlo al diseño minimal del spec sería una regresión funcional. Se ajusta solo el padding lateral a la regla responsive del punto 13 | **Task 4** (parcial) |
| 8. Hover states | Falta `translateY(-2px)` + `.16s ease` en `.bp-card` | **Task 3** |
| 9. Línea de métricas | `LandingCards.jsx` ya resuelve el problema original (bloque huérfano) con datos en vivo de `/api/landing-stats` + card destacada con gates reales; reescribirlo como banda estática de 3 columnas quitaría esa funcionalidad | Ninguna — documentado, no se toca |
| 10. Renumerar Fig. | Secuencia real es 01→02→03→05 (sin 04). Se cierra el hueco | **Task 5** |
| 11. Fig. "Quién está detrás" | Sigue titulada "Herramientas de soporte" con grid de cards | **Task 5** |
| 12. Un solo lenguaje de tarjeta | Ya unificado; la card destacada de `LandingCards` ya no tiene escuadras (nunca las tuvo) | Ninguna |
| 13. Responsive | Paddings/h1/hero-grid siguen en px fijos, no `clamp()` | **Task 4** |
| 14. Fig. 02 → diagrama de recorrido | No implementado — sigue siendo grid de cards | **Task 6** |
| 15. Fondo "infinity cove" del hero | Ya implementado en `HeroCove()` (`app/page.js:381-454`) y `.pt-shade` (`PlantaHero.jsx:43`), valores idénticos al spec | Ninguna |

---

## File Structure

- **Modify:** `src/components/landing/PlantaHero.jsx` — quita las 22 lámparas parpadeantes (Task 1)
- **Modify:** `src/components/landing/LandingCards.jsx` — quita el emoji 🔒 (Task 2)
- **Modify:** `app/page.js` — hover de cards, responsive, renumeración de Fig., strip de credenciales, integra `IntentJourney` (Tasks 3, 4, 5, 6)
- **Modify:** `app/globals.css` — padding responsive del navbar (Task 4)
- **Create:** `src/components/landing/IntentJourney.jsx` — diagrama de recorrido de Fig. 02 (Task 6)

---

### Task 1: Quitar las 22 lámparas parpadeantes de la planta

**Files:**
- Modify: `src/components/landing/PlantaHero.jsx`

- [ ] **Step 1: Eliminar los tres `@keyframes pt-lamp*`**

En `src/components/landing/PlantaHero.jsx`, dentro de `PLANTA_CSS` (línea 27), borra estas tres líneas:

```css
@keyframes pt-lampA  { 0%,44% { opacity:1; } 48%,60% { opacity:0; } 64%,100% { opacity:1; } }
@keyframes pt-lampB  { 0%,20% { opacity:0; } 25%,70% { opacity:1; } 75%,100% { opacity:0; } }
@keyframes pt-lampC  { 0%,100% { opacity:1; } 30%,34% { opacity:.15; } 68%,72% { opacity:.4; } }
```

- [ ] **Step 2: Borrar los paths grises y la animación de los amarillos**

Reemplaza el bloque (líneas 89-101):

```jsx
        <g>
        {WINDOWS.map((d, i) => (
          <path key={"off" + i} d={d} fill="#8E9BA2"></path>
        ))}
        {WINDOWS.map((d, i) => (
          <path
            key={"on" + i}
            d={d}
            fill="#F2C24A"
            style={{ animation: `${["pt-lampA", "pt-lampC", "pt-lampB", "pt-lampC", "pt-lampA"][i % 5]} ${14 + (i % 7) * 3.5}s ease-in-out ${((i * 1.9) % 13).toFixed(1)}s infinite` }}
          ></path>
        ))}
        </g>
```

por:

```jsx
        <g>
        {WINDOWS.map((d, i) => (
          <path key={"on" + i} d={d} fill="#F2C24A"></path>
        ))}
        </g>
```

- [ ] **Step 3: Verificar**

Run: `npx eslint src/components/landing/PlantaHero.jsx`
Expected: sin errores nuevos (0 problemas relacionados con este archivo).

- [ ] **Step 4: Commit**

```bash
git add src/components/landing/PlantaHero.jsx
git commit -m "fix(landing): quita lámparas parpadeantes de la planta isométrica"
```

---

### Task 2: Quitar el emoji 🔒 y alinear transición del CTA a .16s

**Files:**
- Modify: `src/components/landing/LandingCards.jsx`

- [ ] **Step 1: Reemplazar el emoji por `[ ● ]`**

En `src/components/landing/LandingCards.jsx:330`, reemplaza:

```jsx
                <p className="lc-locked-msg">🔒 Detalle disponible al registrarte</p>
```

por:

```jsx
                <p className="lc-locked-msg">
                  <span style={{ font: "10px var(--font-jetbrains-mono),monospace", color: "#6B746F" }}>
                    [ ● ]
                  </span>{" "}
                  Detalle disponible al registrarte
                </p>
```

- [ ] **Step 2: Alinear la transición del botón a `.16s ease`**

En `CARDS_CSS` (línea 171), reemplaza:

```css
.lc-cta-btn {
  ...
  transition: background .18s, color .18s;
}
```

por:

```css
.lc-cta-btn {
  ...
  transition: background .16s ease, color .16s ease;
}
```

(Solo cambia la línea `transition`, el resto de la regla `.lc-cta-btn` queda igual.)

- [ ] **Step 3: Verificar**

Run: `npx eslint src/components/landing/LandingCards.jsx`
Expected: sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add src/components/landing/LandingCards.jsx
git commit -m "fix(landing): quita emoji de la card destacada y alinea transición a .16s"
```

---

### Task 3: Hover de `.bp-card` — `translateY(-2px)` + `.16s ease`

**Files:**
- Modify: `app/page.js`

- [ ] **Step 1: Actualizar el hover pattern**

En `app/page.js`, dentro de `BLUEPRINT_CSS` (línea 175-176), reemplaza:

```css
.bp-card { position: relative; overflow: hidden; cursor: pointer; transition: border-color .2s, background .2s; }
.bp-card:hover { border-color: #0369A1; }
```

por:

```css
.bp-card { position: relative; overflow: hidden; cursor: pointer; transition: border-color .16s ease, background .16s ease, transform .16s ease; }
.bp-card:hover { border-color: #0369A1; transform: translateY(-2px); }
```

- [ ] **Step 2: Alinear la transición del CTA primario a `.16s ease`**

En la misma hoja (línea 193), reemplaza:

```css
.bp-cta {
  cursor: pointer;
  clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
  padding: 13px 26px 13px 24px;
  transition: background .2s;
}
```

por:

```css
.bp-cta {
  cursor: pointer;
  clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
  padding: 13px 26px 13px 24px;
  transition: background .16s ease;
}
```

- [ ] **Step 3: Verificar**

Run: `npx eslint app/page.js`
Expected: sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add app/page.js
git commit -m "fix(landing): hover de cards con translateY(-2px) y transición .16s"
```

---

### Task 4: Responsive — paddings a `clamp()`, H1 fluido, hero-grid `auto-fit`, navbar

**Files:**
- Modify: `app/page.js`
- Modify: `app/globals.css`

- [ ] **Step 1: H1 fluido**

En `app/page.js`, dentro de `BLUEPRINT_CSS` (línea 109), reemplaza:

```css
.bp-h1 {
  font-family: var(--font-ibm-plex-sans-condensed), var(--font-inter), sans-serif;
  font-size: 46px;
  line-height: 1.15;
```

por:

```css
.bp-h1 {
  font-family: var(--font-ibm-plex-sans-condensed), var(--font-inter), sans-serif;
  font-size: clamp(32px, 4.2vw, 46px);
  line-height: 1.15;
```

- [ ] **Step 2: Paddings laterales a `clamp(24px,4vw,48px)`**

En la misma hoja, reemplaza estas cinco reglas (líneas 200-212):

```css
.bp-hero-wrap { position: relative; isolation: isolate; overflow: hidden; padding: 88px 48px 64px; }
.bp-hero-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 48px; align-items: start; }
.bp-probhow-wrap { padding: 64px 48px; border-top: 1px dashed #DADAD2; }
```

por:

```css
.bp-hero-wrap { position: relative; isolation: isolate; overflow: hidden; padding: clamp(56px,7vw,88px) clamp(24px,4vw,48px) 64px; }
.bp-hero-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 48px; align-items: start; }
.bp-probhow-wrap { padding: 64px clamp(24px,4vw,48px); border-top: 1px dashed #DADAD2; }
```

y estas tres (líneas 209-212):

```css
.bp-pillars-wrap { padding: 64px 48px; border-top: 1px dashed #DADAD2; }
.bp-pillars-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
.bp-closing-wrap { padding: 56px 48px; border-top: 1px dashed #DADAD2; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
.bp-footer-wrap { padding: 20px 48px; border-top: 1px solid #DADAD2; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; font: 11px var(--font-jetbrains-mono),monospace; color: #525B5A; }
```

por:

```css
.bp-pillars-wrap { padding: 64px clamp(24px,4vw,48px); border-top: 1px dashed #DADAD2; }
.bp-pillars-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
.bp-closing-wrap { padding: 56px clamp(24px,4vw,48px); border-top: 1px dashed #DADAD2; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
.bp-footer-wrap { padding: 20px clamp(24px,4vw,48px); border-top: 1px solid #DADAD2; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; font: 11px var(--font-jetbrains-mono),monospace; color: #525B5A; }
```

(`.bp-pillars-grid` queda igual en este paso — Task 6 la elimina cuando deje de usarse.)

- [ ] **Step 3: Quitar los overrides de padding/columnas que ahora son redundantes**

En el media query `@media (max-width: 900px)` (línea 217-224), reemplaza:

```css
@media (max-width: 900px) {
  .bp-hero-grid { grid-template-columns: 1fr; gap: 36px; }
  .bp-ps-row { grid-template-columns: 1fr; grid-template-areas: "pain" "answer"; row-gap: 12px; padding: 20px 0; }
  .bp-ps-connector { display: none; }
  .bp-ps-pain { justify-content: flex-start; }
  .bp-ps-pain-text { text-align: left; }
  .bp-ps-answer { padding-left: 0; }
}
```

por (solo cambia la primera línea — `auto-fit` ya colapsa a una columna, pero el gap más ajustado en mobile se conserva):

```css
@media (max-width: 900px) {
  .bp-hero-grid { gap: 36px; }
  .bp-ps-row { grid-template-columns: 1fr; grid-template-areas: "pain" "answer"; row-gap: 12px; padding: 20px 0; }
  .bp-ps-connector { display: none; }
  .bp-ps-pain { justify-content: flex-start; }
  .bp-ps-pain-text { text-align: left; }
  .bp-ps-answer { padding-left: 0; }
}
```

En el media query `@media (max-width: 640px)` (línea 225-232), reemplaza:

```css
@media (max-width: 640px) {
  .bp-hero-wrap { padding: 48px 20px 40px; }
  .bp-probhow-wrap { padding: 48px 20px; }
  .bp-pillars-wrap { padding: 48px 20px; }
  .bp-pillars-grid { grid-template-columns: 1fr; }
  .bp-closing-wrap { padding: 40px 20px; }
  .bp-footer-wrap { padding: 20px; }
}
```

por (el horizontal ya lo resuelve `clamp()`; solo queda el ajuste vertical):

```css
@media (max-width: 640px) {
  .bp-hero-wrap { padding-top: 48px; padding-bottom: 40px; }
  .bp-probhow-wrap { padding-top: 48px; padding-bottom: 48px; }
  .bp-pillars-wrap { padding-top: 48px; padding-bottom: 48px; }
  .bp-pillars-grid { grid-template-columns: 1fr; }
  .bp-closing-wrap { padding-top: 40px; padding-bottom: 40px; }
  .bp-footer-wrap { padding: 20px; }
}
```

- [ ] **Step 4: Padding lateral del navbar a `clamp()`**

En `app/globals.css:733-745`, reemplaza:

```css
.clr-nav {
  position: sticky;
  top: 0;
  z-index: var(--z-nav);
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(10px) saturate(1.4);
  -webkit-backdrop-filter: blur(10px) saturate(1.4);
  border-bottom: 1px solid var(--line);
  height: var(--nav-h);
  display: flex;
  align-items: center;
  padding: 0 28px;
}
```

por:

```css
.clr-nav {
  position: sticky;
  top: 0;
  z-index: var(--z-nav);
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(10px) saturate(1.4);
  -webkit-backdrop-filter: blur(10px) saturate(1.4);
  border-bottom: 1px solid var(--line);
  height: var(--nav-h);
  display: flex;
  align-items: center;
  padding: 0 clamp(24px, 4vw, 48px);
}
```

- [ ] **Step 5: Verificar**

Run: `npx eslint app/page.js app/globals.css`
Expected: sin errores nuevos (el segundo archivo no es JS, eslint lo ignorará sin fallar).

- [ ] **Step 6: Commit**

```bash
git add app/page.js app/globals.css
git commit -m "fix(landing): paddings responsive con clamp(), H1 fluido y hero-grid auto-fit"
```

---

### Task 5: Renumerar Fig. 05→04 y convertir "Herramientas de soporte" en franja de credenciales

**Files:**
- Modify: `app/page.js`

- [ ] **Step 1: Reemplazar `PILLARS` por `CREDENTIALS`**

En `app/page.js`, reemplaza el const `PILLARS` (líneas 78-98):

```js
const PILLARS = [
  {
    n: "02",
    title: "Planes directores de alcantarillado en Cali",
    desc: "3 corregimientos, modelado hidráulico y gemelo digital.",
    href: "/nosotros",
  },
  {
    n: "03",
    title: "Lee un pliego de 100 páginas en minutos",
    desc: "El asistente extrae los requisitos legales y técnicos automáticamente.",
    href: "/pliego",
  },
  {
    n: "04",
    title: "Un ingeniero especialista, no una startup",
    desc: "11 años en agua y saneamiento, licencia profesional vigente.",
    href: "/nosotros",
    dark: true,
  },
];
```

por:

```js
const CREDENTIALS = [
  {
    label: "Experiencia",
    title: "11 años en agua y saneamiento",
    body: "Un ingeniero especialista con licencia profesional vigente, no una startup de software.",
  },
  {
    label: "Proyecto",
    title: "3 planes directores en Cali",
    body: "Alcantarillado de tres corregimientos, con modelado hidráulico y gemelo digital.",
  },
  {
    label: "Resultado",
    title: "Un pliego de 100 páginas, en minutos",
    body: "Requisitos legales y técnicos extraídos y citados, listos para verificar.",
  },
];
```

- [ ] **Step 2: Renumerar y retitular la etiqueta `Fig.`**

En `app/page.js:943`, reemplaza:

```jsx
              Fig. 05 — Herramientas de soporte
```

por:

```jsx
              Fig. 04 — Quién está detrás
```

- [ ] **Step 3: Reemplazar el grid de cards por la franja de credenciales**

Reemplaza el bloque completo `<div className="bp-pillars-grid">...</div>` (líneas 946-1030, el que mapea `PILLARS`) por:

```jsx
          <div className="bp-credentials-strip">
            {CREDENTIALS.map((c, i) => (
              <div
                key={c.label}
                style={{
                  flex: "1 1 260px",
                  padding: i === 0 ? "4px 32px 4px 0" : "4px 32px",
                  borderLeft: i === 0 ? "none" : "1px solid #DADAD2",
                }}
              >
                <span
                  style={{
                    display: "block",
                    font: "10px var(--font-jetbrains-mono),monospace",
                    color: "#6B746F",
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  {c.label}
                </span>
                <div
                  style={{
                    font: "600 15px/1.4 var(--font-inter)",
                    color: "#0A1F1C",
                    marginBottom: 6,
                  }}
                >
                  {c.title}
                </div>
                <p style={{ font: "13px/1.5 var(--font-inter)", color: "#525B5A", margin: 0 }}>
                  {c.body}
                </p>
              </div>
            ))}
          </div>
```

- [ ] **Step 4: Añadir la clase `.bp-credentials-strip`**

En `BLUEPRINT_CSS`, justo debajo de la línea `.bp-pillars-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }`, añade:

```css
.bp-credentials-strip { display: flex; flex-wrap: wrap; }
```

Y en el media query `@media (max-width: 640px)`, añade una línea nueva:

```css
  .bp-credentials-strip > div { flex-basis: 100%; border-left: none !important; padding: 16px 0 !important; border-top: 1px solid #DADAD2; }
  .bp-credentials-strip > div:first-child { border-top: none; padding-top: 0 !important; }
```

(Va dentro del mismo bloque `@media (max-width: 640px) { ... }` que ya editaste en el Task 4, después de la línea `.bp-footer-wrap { padding: 20px; }`.)

- [ ] **Step 5: Verificar**

Run: `npx eslint app/page.js`
Expected: sin errores nuevos. La sección `PILLARS` no debe quedar referenciada en ningún otro punto del archivo (`grep -n "PILLARS" app/page.js` solo debe listar `CREDENTIALS` en adelante).

- [ ] **Step 6: Commit**

```bash
git add app/page.js
git commit -m "fix(landing): renumera Fig.05→04 y convierte pilares en franja de credenciales"
```

---

### Task 6: Fig. 02 — diagrama de recorrido (`IntentJourney`)

Reemplaza la rejilla de 5 tarjetas de `INTENT_ROUTES` por la línea de nodos + paneles con vista previa descrita en el punto 14 del spec. Vive en un componente nuevo para no seguir engordando `app/page.js`.

**Files:**
- Create: `src/components/landing/IntentJourney.jsx`
- Modify: `app/page.js`

- [ ] **Step 1: Crear el componente**

Crea `src/components/landing/IntentJourney.jsx` con este contenido completo:

```jsx
"use client";
// src/components/landing/IntentJourney.jsx
// Fig. 02 — diagrama de recorrido: línea de 4 nodos del proceso de
// licitación + entrada alterna (problema de agua) + panel con vista previa
// real del producto por momento. El estado del waitlist ("Vendo o fabrico
// soluciones") sube al padre porque app/page.js ya maneja el fetch a
// /api/mercado/waitlist — este componente solo lo pinta.

import Link from "next/link";
import { useState } from "react";

const NODES = [
  { id: 1, n: "01", title: "Busco contratos", phase: "entrada" },
  { id: 2, n: "02", title: "Tengo un pliego que descifrar", phase: "preparación" },
  { id: 3, n: "03", title: "Gané un contrato", phase: "ejecución" },
  { id: 4, n: "04", title: "Opero un acueducto o una ESP", phase: "operación" },
];

const ALT_ENTRY_ID = 5;
const ALT_ENTRY_TITLE = "Tengo un problema de agua o vertimientos";

const PANELS = {
  1: {
    title: "Busca procesos y sabe de entrada si calificas",
    body: "Cruzamos los procesos activos de agua y saneamiento del SECOP II con tu RUP, y te decimos cuáles puedes ganar antes de que escribas una sola página.",
    cta: "BUSCAR PROCESOS",
    href: "/licitaciones",
  },
  2: {
    title: "Un pliego de 104 páginas, en checklist",
    body: "El asistente extrae requisitos habilitantes, técnicos y financieros, y te muestra cada uno con su página y numeral para que puedas verificarlo.",
    cta: "DECODIFICAR PLIEGO",
    href: "/pliego",
  },
  3: {
    title: "Ganaste. Ahora hay que ejecutar sin sanciones",
    body: "Actas, pólizas, informes de avance y liquidación con sus plazos. Te avisamos antes de cada vencimiento, no después.",
    cta: "EMPEZAR",
    href: "/asistente/ejecucion",
  },
  4: {
    title: "Normativa respondida y citada",
    body: "RAS, Res. 0330, CRA y reportes al SUI. Cada respuesta trae el artículo exacto, para que puedas sustentarla ante quien sea.",
    cta: "CONSULTAR",
    href: "/asistente/operacion",
  },
  5: {
    title: "De un problema de agua a una solución contratable",
    body: "Te llevamos del diagnóstico a la alternativa técnica y de ahí a cómo contratarla: modalidad, presupuesto y quién puede ejecutarla.",
    cta: "VER EL CAMINO",
    href: "/soluciones",
  },
};

const PROCESOS_PREVIEW_ROWS = [
  { entidad: "Aguas del Norte E.S.P.", cuantia: "$4.850 M", cierre: "28 ago", estado: "ok" },
  { entidad: "Alcaldía de Tumaco", cuantia: "$1.230 M", cierre: "02 sep", estado: "warn" },
  { entidad: "EPS Nariño", cuantia: "$3.850 M", cierre: "11 sep", estado: "ok" },
];

const REQUISITOS_PREVIEW_ROWS = [
  { text: "Experiencia específica en PTAR", page: "pág. 34", status: "ok" },
  { text: "Índice de liquidez ≥ 1,5", page: "pág. 41", status: "ok" },
  { text: "Capacidad residual insuficiente", page: "pág. 42", status: "warn" },
  { text: "Certificación RETIE del proveedor", page: "pág. 58", status: "unknown" },
];

const EJECUCION_PREVIEW_ROWS = [
  { label: "Acta de inicio y pólizas", status: "100% entregado", pct: 100 },
  { label: "Informe de avance 01", status: "100% aprobado", pct: 100 },
  { label: "Informe de avance 02", status: "45% en curso", pct: 45 },
  { label: "Acta de liquidación", status: "0% pendiente", pct: 0 },
];

const NORMATIVA_PREVIEW = {
  question: "¿Cada cuánto debo reportar al SUI el índice de agua no contabilizada?",
  answer:
    "Reporte trimestral, dentro de los 30 días siguientes al cierre del trimestre; el cargue se hace por el formulario de gestión comercial.",
  citations: ["Res. CRA 906 · Art. 12", "Res. 0330 · Art. 34"],
};

const RUTA_PREVIEW_STEPS = [
  { n: "01", title: "Diagnóstico", desc: "Caudal, carga contaminante y norma que te aplica" },
  { n: "02", title: "Alternativa técnica", desc: "Qué tecnología resuelve tu caso y qué cuesta operarla" },
  { n: "03", title: "Cómo contratarlo", desc: "Modalidad, presupuesto oficial y quién puede ejecutarlo" },
];

const INTENT_JOURNEY_CSS = `
@keyframes ij-dash { to { background-position: 20px 0; } }
@keyframes ij-ping { 0%,100% { transform: scale(1); opacity: .25; } 50% { transform: scale(1.8); opacity: 0; } }

.ij-wrap { position: relative; }

.ij-line { position: relative; display: flex; flex-wrap: wrap; }
.ij-line::before {
  content: "";
  position: absolute;
  top: 9px;
  left: 12%;
  right: 12%;
  height: 1px;
  background: repeating-linear-gradient(90deg, #0369A1 0 9px, transparent 9px 20px);
  opacity: .45;
  animation: ij-dash 6s linear infinite;
  pointer-events: none;
}

.ij-node {
  position: relative;
  flex: 1 1 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 0 8px 14px;
  background: transparent;
  border: 0;
  cursor: pointer;
  text-align: center;
  transition: transform .16s ease;
}
.ij-node:hover { transform: translateY(-2px); }
.ij-node-circle {
  position: relative;
  width: 19px;
  height: 19px;
  border-radius: 50%;
  border: 1.5px solid #0369A1;
  background: #FCFCF9;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ij-node-ping {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: #0369A1;
  opacity: .25;
  animation: ij-ping 3s ease-out infinite;
}
.ij-node-dot { position: relative; width: 9px; height: 9px; border-radius: 50%; background: #0369A1; }
.ij-node-label { font: 10px var(--font-jetbrains-mono), monospace; color: #6B746F; text-transform: uppercase; }
.ij-node-title { font: 600 14px/1.35 var(--font-inter); color: #0A1F1C; }
.ij-node-phase { font: 11px var(--font-jetbrains-mono), monospace; color: #6B746F; }
.ij-node-bar {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 2px;
  background: #0369A1;
}

.ij-alt-row { display: flex; align-items: center; gap: 12px; margin-top: 20px; flex-wrap: wrap; }
.ij-alt-label { font: 10px var(--font-jetbrains-mono), monospace; color: #6B746F; letter-spacing: .1em; text-transform: uppercase; white-space: nowrap; }
.ij-alt-dash { width: 40px; height: 1px; border-top: 1px dashed #DADAD2; }
.ij-alt-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: transparent;
  border: 1px solid #DADAD2;
  padding: 9px 16px;
  font: 600 13px var(--font-inter);
  color: #0A1F1C;
  cursor: pointer;
  transition: border-color .16s ease;
}
.ij-alt-btn:hover, .ij-alt-btn[aria-pressed="true"] { border-color: #0369A1; }
.ij-alt-circle { width: 15px; height: 15px; border-radius: 50%; border: 1.5px solid #0369A1; flex-shrink: 0; }

.ij-panel {
  border-top: 1px dashed #DADAD2;
  padding-top: 34px;
  margin-top: 34px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 36px;
  align-items: start;
}
.ij-panel-title {
  font-family: var(--font-ibm-plex-sans-condensed), var(--font-inter), sans-serif;
  font-weight: 700;
  font-size: 28px;
  line-height: 1.2;
  color: #0A1F1C;
  margin: 0 0 14px;
}
.ij-panel-body { font: 14.5px/1.6 var(--font-inter); color: #525B5A; max-width: 420px; text-wrap: pretty; margin: 0 0 22px; }
.ij-panel-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #0369A1;
  color: #fff;
  font: 600 12px var(--font-jetbrains-mono), monospace;
  padding: 11px 22px 11px 20px;
}

.ij-preview {
  position: relative;
  background: #fff;
  border: 1px solid #DADAD2;
  padding: 20px;
  min-height: 236px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.ij-preview-corner { position: absolute; width: 10px; height: 10px; }
.ij-preview-corner-tl { top: -1px; left: -1px; border-top: 2px solid #0369A1; border-left: 2px solid #0369A1; }
.ij-preview-corner-br { bottom: -1px; right: -1px; border-bottom: 2px solid #0369A1; border-right: 2px solid #0369A1; }

.ij-preview-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.ij-preview-head-title { font: 600 13px var(--font-inter); color: #0A1F1C; }
.ij-preview-head-badge { font: 600 11px var(--font-jetbrains-mono), monospace; color: #6B746F; }
.ij-badge-ok { color: #16A34A; }
.ij-badge-accent { color: #0369A1; }

.ij-preview-rows { display: flex; flex-direction: column; }
.ij-preview-row { padding: 9px 0; border-top: 1px solid #F0F0EA; display: grid; align-items: center; gap: 8px; }
.ij-preview-row:first-child { border-top: none; }
.ij-preview-row-procesos { grid-template-columns: 1fr 92px 62px 12px; }
.ij-preview-cell-entidad { font: 12.5px var(--font-inter); color: #0A1F1C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ij-preview-cell-cuantia { font: 12px var(--font-jetbrains-mono), monospace; color: #0369A1; font-variant-numeric: tabular-nums; text-align: right; }
.ij-preview-cell-fecha { font: 11px var(--font-jetbrains-mono), monospace; color: #6B746F; text-align: right; }
.ij-preview-status-dot { width: 7px; height: 7px; border-radius: 50%; justify-self: center; }
.ij-status-ok { background: #16A34A; }
.ij-status-warn { background: #D97706; }

.ij-preview-foot { padding-top: 12px; border-top: 1px dashed #DADAD2; font: 12px var(--font-inter); color: #525B5A; }
.ij-preview-foot-ok { color: #16A34A; font-weight: 600; }
.ij-preview-foot-warn { color: #D97706; }

.ij-preview-row-requisitos { grid-template-columns: 16px 1fr auto; }
.ij-preview-glyph { font: 700 12px var(--font-jetbrains-mono), monospace; text-align: center; }
.ij-glyph-ok { color: #16A34A; }
.ij-glyph-warn { color: #D97706; }
.ij-glyph-unknown { color: #6B746F; }
.ij-preview-cell-text { font: 12.5px var(--font-inter); color: #0A1F1C; }
.ij-preview-cell-page { font: 11px var(--font-jetbrains-mono), monospace; color: #6B746F; }

.ij-preview-hito { display: flex; flex-direction: column; gap: 6px; padding: 8px 0; }
.ij-preview-hito-top { display: flex; justify-content: space-between; gap: 8px; }
.ij-preview-hito-label { font: 12.5px var(--font-inter); color: #0A1F1C; }
.ij-preview-hito-status { font: 11px var(--font-jetbrains-mono), monospace; color: #6B746F; }
.ij-preview-bar-track { height: 5px; background: #F0F0EA; }
.ij-preview-bar-fill { height: 100%; background: #0369A1; }

.ij-preview-question { font: italic 13px/1.5 var(--font-inter); color: #525B5A; margin: 0; }
.ij-preview-answer { font: 12.5px/1.6 var(--font-inter); color: #0A1F1C; padding-top: 12px; border-top: 1px solid #F0F0EA; margin: 0; }
.ij-preview-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.ij-preview-chip { font: 10px var(--font-jetbrains-mono), monospace; color: #0369A1; border: 1px solid rgba(3,105,161,.25); padding: 4px 8px; }

.ij-preview-step { display: grid; grid-template-columns: 26px 1fr; gap: 10px; padding: 8px 0; }
.ij-preview-step-n { font: 600 11px var(--font-jetbrains-mono), monospace; color: #0369A1; }
.ij-preview-step-title { font: 600 13px var(--font-inter); color: #0A1F1C; }
.ij-preview-step-desc { font: 12.5px/1.5 var(--font-inter); color: #525B5A; margin: 4px 0 0; }

.ij-soon-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 34px;
  padding-top: 20px;
  border-top: 1px dashed #DADAD2;
}
.ij-soon-label { font: 10px var(--font-jetbrains-mono), monospace; color: #6B746F; letter-spacing: .1em; text-transform: uppercase; }
.ij-soon-title { font: 500 14px var(--font-inter); color: #0A1F1C; }
.ij-soon-desc { font: 13px var(--font-inter); color: #525B5A; }
.ij-soon-btn, .ij-soon-done { margin-left: auto; white-space: nowrap; }
.ij-soon-btn {
  background: transparent;
  border: 1px solid #0369A1;
  padding: 6px 12px;
  font: 600 12px var(--font-jetbrains-mono), monospace;
  color: #0369A1;
  cursor: pointer;
  transition: background .16s ease, color .16s ease;
}
.ij-soon-btn:hover { background: #0369A1; color: #fff; }
.ij-soon-btn:disabled { cursor: not-allowed; opacity: .6; }
.ij-soon-done { font: 600 12px var(--font-jetbrains-mono), monospace; color: #16A34A; }
.ij-soon-error { width: 100%; font: 11px var(--font-inter); color: #DC2626; }

@media (max-width: 640px) {
  .ij-panel { gap: 24px; }
  .ij-soon-btn, .ij-soon-done { margin-left: 0; }
}
`;

function PreviewCorners() {
  return (
    <>
      <span className="ij-preview-corner ij-preview-corner-tl" aria-hidden="true" />
      <span className="ij-preview-corner ij-preview-corner-br" aria-hidden="true" />
    </>
  );
}

function PreviewBox({ active }) {
  if (active === 1) {
    return (
      <div className="ij-preview">
        <PreviewCorners />
        <div className="ij-preview-head">
          <span className="ij-preview-head-title">Procesos activos · SECOP II</span>
          <span className="ij-preview-head-badge ij-badge-ok">3 de 38</span>
        </div>
        <div className="ij-preview-rows">
          {PROCESOS_PREVIEW_ROWS.map((row) => (
            <div key={row.entidad} className="ij-preview-row ij-preview-row-procesos">
              <span className="ij-preview-cell-entidad">{row.entidad}</span>
              <span className="ij-preview-cell-cuantia">{row.cuantia}</span>
              <span className="ij-preview-cell-fecha">{row.cierre}</span>
              <span
                className={`ij-preview-status-dot ij-status-${row.estado}`}
                aria-hidden="true"
              />
            </div>
          ))}
        </div>
        <div className="ij-preview-foot">
          <span className="ij-preview-foot-ok">✓ CALIFICAS EN 2 DE 3</span> · según tu RUP
        </div>
      </div>
    );
  }

  if (active === 2) {
    return (
      <div className="ij-preview">
        <PreviewCorners />
        <div className="ij-preview-head">
          <span className="ij-preview-head-title">Requisitos extraídos</span>
          <span className="ij-preview-head-badge">104 pág · 38 s</span>
        </div>
        <div className="ij-preview-rows">
          {REQUISITOS_PREVIEW_ROWS.map((row) => (
            <div key={row.text} className="ij-preview-row ij-preview-row-requisitos">
              <span className={`ij-preview-glyph ij-glyph-${row.status}`} aria-hidden="true">
                {row.status === "ok" ? "✓" : row.status === "warn" ? "!" : "?"}
              </span>
              <span className="ij-preview-cell-text">{row.text}</span>
              <span className="ij-preview-cell-page">{row.page}</span>
            </div>
          ))}
        </div>
        <div className="ij-preview-foot">Cada requisito citado con su página y numeral.</div>
      </div>
    );
  }

  if (active === 3) {
    return (
      <div className="ij-preview">
        <PreviewCorners />
        <div className="ij-preview-head">
          <span className="ij-preview-head-title">Ejecución · contrato 2026-0418</span>
          <span className="ij-preview-head-badge ij-badge-accent">62 %</span>
        </div>
        <div className="ij-preview-rows">
          {EJECUCION_PREVIEW_ROWS.map((row) => (
            <div key={row.label} className="ij-preview-hito">
              <div className="ij-preview-hito-top">
                <span className="ij-preview-hito-label">{row.label}</span>
                <span className="ij-preview-hito-status">{row.status}</span>
              </div>
              <div className="ij-preview-bar-track">
                <div className="ij-preview-bar-fill" style={{ width: `${row.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="ij-preview-foot ij-preview-foot-warn">▸ Próximo vencimiento: 12 sep</div>
      </div>
    );
  }

  if (active === 4) {
    return (
      <div className="ij-preview">
        <PreviewCorners />
        <div className="ij-preview-head">
          <span className="ij-preview-head-title">Consulta de normativa</span>
        </div>
        <p className="ij-preview-question">{NORMATIVA_PREVIEW.question}</p>
        <p className="ij-preview-answer">{NORMATIVA_PREVIEW.answer}</p>
        <div className="ij-preview-chips">
          {NORMATIVA_PREVIEW.citations.map((c) => (
            <span key={c} className="ij-preview-chip">
              {c}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="ij-preview">
      <PreviewCorners />
      <div className="ij-preview-head">
        <span className="ij-preview-head-title">Ruta sugerida</span>
      </div>
      <div className="ij-preview-rows">
        {RUTA_PREVIEW_STEPS.map((step) => (
          <div key={step.n} className="ij-preview-step">
            <span className="ij-preview-step-n">{step.n}</span>
            <div>
              <div className="ij-preview-step-title">{step.title}</div>
              <p className="ij-preview-step-desc">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="ij-preview-foot">Sin cuenta · resultado en 2 min</div>
    </div>
  );
}

export default function IntentJourney({ waitlistStatus, waitlistError, onWaitlist }) {
  const [active, setActive] = useState(1);
  const panel = PANELS[active];

  return (
    <div className="ij-wrap">
      <style dangerouslySetInnerHTML={{ __html: INTENT_JOURNEY_CSS }} />

      <div className="ij-line">
        {NODES.map((node) => {
          const isActive = active === node.id;
          return (
            <button
              key={node.id}
              type="button"
              className="ij-node"
              onClick={() => setActive(node.id)}
              aria-pressed={isActive}
            >
              <span className="ij-node-circle">
                {isActive && (
                  <>
                    <span className="ij-node-ping" aria-hidden="true" />
                    <span className="ij-node-dot" aria-hidden="true" />
                  </>
                )}
              </span>
              <span className="ij-node-label">[ {node.n} ]</span>
              <span className="ij-node-title">{node.title}</span>
              <span className="ij-node-phase">{node.phase}</span>
              {isActive && <span className="ij-node-bar" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      <div className="ij-alt-row">
        <span className="ij-alt-label">Entrada alterna</span>
        <span className="ij-alt-dash" aria-hidden="true" />
        <button
          type="button"
          className="ij-alt-btn"
          onClick={() => setActive(ALT_ENTRY_ID)}
          aria-pressed={active === ALT_ENTRY_ID}
        >
          <span className="ij-alt-circle" aria-hidden="true" />
          {ALT_ENTRY_TITLE}
        </button>
      </div>

      <div className="ij-panel">
        <div>
          <h3 className="ij-panel-title">{panel.title}</h3>
          <p className="ij-panel-body">{panel.body}</p>
          <Link href={panel.href} className="bp-cta bp-cta-dark ij-panel-cta">
            [ {panel.cta} → ]
          </Link>
        </div>
        <PreviewBox active={active} />
      </div>

      <div className="ij-soon-row">
        <span className="ij-soon-label">Próximamente</span>
        <span className="ij-soon-title">Vendo o fabrico soluciones</span>
        <span className="ij-soon-desc">
          — oportunidades reales de comunidades y ESP que necesitan lo que ofreces.
        </span>
        {waitlistStatus === "done" ? (
          <span className="ij-soon-done">[ Te avisaremos ]</span>
        ) : (
          <button
            type="button"
            className="ij-soon-btn"
            onClick={onWaitlist}
            disabled={waitlistStatus === "loading"}
          >
            {waitlistStatus === "loading" ? "[ Guardando… ]" : "[ Avísame cuando abra ]"}
          </button>
        )}
        {waitlistStatus === "error" && waitlistError && (
          <span className="ij-soon-error">{waitlistError}</span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar el componente aislado**

Run: `npx eslint src/components/landing/IntentJourney.jsx`
Expected: sin errores.

- [ ] **Step 3: Integrar en `app/page.js` — importar**

Añade el import junto a los otros componentes de landing (línea 11):

```js
import PlantaHero from "@/src/components/landing/PlantaHero";
```

pásalo a:

```js
import PlantaHero from "@/src/components/landing/PlantaHero";
import IntentJourney from "@/src/components/landing/IntentJourney";
```

- [ ] **Step 4: Quitar el const `INTENT_ROUTES`**

Borra por completo el bloque `const INTENT_ROUTES = [ ... ];` (líneas 40-76 del archivo original).

- [ ] **Step 5: Reemplazar el grid de Fig. 02 por `<IntentJourney />`**

Reemplaza todo el bloque `<div className="bp-pillars-grid">...</div>` de la sección Fig. 02 (el que empieza en la línea 717 mapeando `INTENT_ROUTES` y termina con la caja de "Próximamente" en la línea 826) por:

```jsx
          <IntentJourney
            waitlistStatus={waitlistStatus}
            waitlistError={waitlistError}
            onWaitlist={handleWaitlist}
          />
```

El wrapper `<div className="bp-pillars-wrap" id="asistentes-proyecto">` y la etiqueta `Fig. 02 — ¿En qué momento estás?` que lo preceden **no se tocan** — solo se reemplaza el grid interior.

- [ ] **Step 6: Limpiar `.bp-pillars-grid` — ya no la usa nadie**

Tras el Step 5, `.bp-pillars-grid` ya no se usa en ningún lugar de `app/page.js` (Fig. 02 ahora usa `IntentJourney`, Fig. 04 usa `.bp-credentials-strip` desde el Task 5). Confirma con:

```bash
grep -n "bp-pillars-grid" "app/page.js"
```

Expected: únicamente las líneas que la **definen** en `BLUEPRINT_CSS` (la regla base + los dos overrides en media queries), cero usos en JSX.

Borra la definición base en `BLUEPRINT_CSS`:

```css
.bp-pillars-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
```

y los dos overrides en media queries:

```css
@media (max-width: 1100px) {
  .bp-pillars-grid { grid-template-columns: repeat(2,1fr); }
}
```

(borra solo esa línea interior, deja el bloque `@media (max-width: 1100px) { }` — si queda vacío tras borrarla, borra también el bloque completo) y:

```css
  .bp-pillars-grid { grid-template-columns: 1fr; }
```

dentro del `@media (max-width: 640px)`.

- [ ] **Step 7: Verificar la integración completa**

Run: `npx eslint app/page.js`
Expected: sin errores.

Run: `npm run build`
Expected: build exitoso, sin errores de tipo/sintaxis en `app/page.js` ni `IntentJourney.jsx`.

- [ ] **Step 8: Commit**

```bash
git add app/page.js src/components/landing/IntentJourney.jsx
git commit -m "feat(landing): Fig.02 como diagrama de recorrido con vista previa por momento"
```

---

### Task 7: Verificación visual en navegador

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Levantar el servidor de desarrollo**

Usa la herramienta de preview del entorno (`preview_start` con `name` apuntando al script `dev` de `.claude/launch.json`, o `npm run dev` si trabajas fuera del harness) y abre `/`.

- [ ] **Step 2: Revisar consola y red**

Confirma que no hay errores en consola ni requests fallidos a `/api/landing-stats` o `/api/mercado/waitlist`.

- [ ] **Step 3: Probar la interacción del diagrama de recorrido**

Haz clic en cada uno de los 4 nodos y en el botón de entrada alterna ("Tengo un problema de agua..."); confirma que el panel de la derecha cambia de contenido en los 5 casos y que el indicador activo (punto + ping + barra) se mueve al nodo correcto.

- [ ] **Step 4: Revisar responsive**

`resize_window` a `mobile` (375px) y `tablet` (768px): confirma que los nodos envuelven en filas, el panel pasa a una columna, y no hay overflow horizontal en ningún punto de la página.

- [ ] **Step 5: Captura de pantalla**

Toma un screenshot de escritorio y uno mobile de la landing completa como evidencia final.

---

## Self-Review

**Cobertura del spec:** los 15 puntos están mapeados en la tabla inicial; 8 ya estaban resueltos (documentados, sin tarea) y 6 tienen tarea concreta (Tasks 1-6) más una verificación final (Task 7).

**Escaneo de placeholders:** ningún paso usa "TBD"/"similar a"/"añadir manejo de errores" — todo el código de cada step está completo y es el código final a aplicar.

**Consistencia de tipos/nombres:** `IntentJourney` recibe exactamente `waitlistStatus`, `waitlistError`, `onWaitlist` — los mismos tres nombres que ya existen como estado (`waitlistStatus`, `waitlistError`) y función (`handleWaitlist`) en `app/page.js` (líneas 582-604), sin necesidad de tocar esa lógica.
