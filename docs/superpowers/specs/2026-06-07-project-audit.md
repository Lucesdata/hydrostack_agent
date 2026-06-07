# Auditoría de proyecto post-landing — Hallazgos

**Fecha:** 2026-06-07
**Estado:** Reporte de auditoría. NO se ha tocado código. Decisiones de acción pendientes.
**Alcance:** Rutas `/`, `/calculators`, `/calculators/geo|fosa-septica|mantenimiento`, `/build`, `/chat`, `/licitaciones`; Navbar global; `app/globals.css`; `app/layout.js`; tras el commit `3de3cbd` (landing water-evolution).

---

## 1. Contexto

La spec `2026-06-07-landing-water-evolution-design.md` introdujo un sistema visual nuevo solo en `/` (engineering sobrio, fondo claro `#FAFAF7`, accent verde-petróleo `#0F766E`, Inter + JetBrains Mono). El interior conserva el sistema cyber-teal (cyan `#00F5FF`, Orbitron + IBM Plex Mono, fondo `#020C10`).

El cambio de modo "vestíbulo claro → consola oscura" se aceptó como deliberado. Esta auditoría revisa cómo de limpia es la separación y qué leaks o inconsistencias quedan.

---

## 2. Hallazgos

### 🔴 Críticos (rompen la coherencia visual de la landing)

**H1. `cursor: crosshair` global se hereda en la landing.**
`app/globals.css:28` aplica `cursor: crosshair` a `body`. La landing engineering-sobrio lo hereda. Visualmente disonante con el tono comercial pretendido.
**Severidad:** baja-media. No afecta funcionalidad pero rompe la identidad.

**H2. `.bg-grid` cyan y `.scanline` cyan animada renderizan bajo la landing.**
`app/layout.js:25-27` inserta `<div class="bg-grid">` y `<div class="scanline">` dentro del `<body>`, antes de `<main>`. Son `position: fixed`, `z-index: 0` y `z-index: 9999` respectivamente. Aunque `.ls-page` tiene `background: #FAFAF7` opaco, la **scanline** está sobre TODO el contenido (z-index 9999) — atraviesa la landing periódicamente con un trazo cyan de 2px.
**Severidad:** media. La scanline es perceptible.

**H3. Scrollbar global cyber.**
`app/globals.css:240-251` define scrollbar oscuro con thumb `var(--muted)` y `--cyan` para componentes internos (`.hs-content`, `.hs-side`). La landing hereda el scrollbar global.
**Severidad:** baja. Visible en pantallas con scroll vertical.

### 🟠 Altos (inconsistencias funcionales o de copy)

**H4. `Licitaciones` hardcodeado en el Navbar.**
`src/components/Navbar.js:38` y `:69` renderizan literalmente `Licitaciones` en lugar de leer de `t.nav.*`. En modo EN la navbar muestra `Calculators · Assistant · Licitaciones · About` — mezcla idiomas. El i18n tiene `mod4.title: "Tenders"` para EN; el nav debería usar una clave análoga.
**Severidad:** media-alta. Defecto evidente al cambiar a EN.

**H5. `/build` no aparece en la Navbar.**
La nueva landing card 02 lleva a `/build` (gemelo digital / flujo guiado), pero la Navbar tiene solo Calculadoras · Asistente · Licitaciones · About. Usuarios dentro del proyecto no pueden volver a `/build` salvo regresando a `/`.
**Severidad:** media. Limita navegabilidad.

**H6. Hub `/calculators` redundante con sub-links de la landing.**
La landing card 01 expone `Geo · Fosa séptica · Mantenimiento` directamente. El `/calculators/page.js` re-renderiza el mismo grid (3 cards con emojis 📍🪣🔧). El usuario que entra por sub-link de la landing salta una capa; el que entra por la card principal aterriza en el hub redundante.
**Severidad:** media. No es bug pero genera fricción y duplica la fuente de verdad del catálogo de calculadoras.

**H7. Vocabulario visual desconectado: SVG schematic vs emojis.**
La landing introdujo glifos SVG técnicos (corte de fosa, cubo isométrico, diálogo, pipeline). El hub `/calculators` usa emojis 📍🪣🔧 — mensaje visual contradictorio: la landing dice "ingeniería seria"; el hub dice "iconos decorativos genéricos".
**Severidad:** media. Más estética que funcional.

### 🟡 Medios (riesgos o detalles)

**H8. `CalculatorContextBanner` asume flujo BuildFlow.**
Las 3 sub-páginas (`/calculators/geo`, `/fosa-septica`, `/mantenimiento`) montan `<CalculatorContextBanner step={1|2|3}>` antes del cuerpo. Cuando entras directo desde la landing — saltándote BuildFlow — el banner puede mostrar contexto irrelevante o navegación inconsistente. **Pendiente verificar UX exacta**.
**Severidad:** media. Posible confusión de usuario.

**H9. `body { font-family: var(--mono) }` como default global.**
`app/globals.css:24` hace que IBM Plex Mono sea el default. La landing lo overrides explícitamente con Inter en `.ls-page`, pero cualquier elemento que herede `initial` o sin override puede caer en mono. Fuente de regresiones silenciosas.
**Severidad:** baja. Riesgo latente.

**H10. Doble identidad de marca en `/` (Navbar oscura + Mark inline clara).**
Sticky-top: Navbar oscura `HydroStack` en cyan Orbitron. Bajo ella: mark inline `H + HydroStack` en verde Inter. Mismo nombre, dos estéticas a 50px de distancia. La spec asumió que la Navbar quedaría intacta, pero el roce visual es real.
**Severidad:** baja-media. Aceptable si se documenta como "Navbar = chrome del producto; landing mark = mensaje editorial". Reemplazable.

### 🟢 OK (verificados sin novedad)

- 4 sub-rutas operativas (`/calculators/*`, `/build`, `/chat`, `/licitaciones`) renderizan sin errores.
- Build limpio en todas las páginas.
- i18n ES↔EN funciona en landing, calculadoras, agente.
- Sub-links de la landing navegan correctamente a las 3 sub-rutas.
- Glifos SVG no se rompen en distintos viewports.

---

## 3. Recomendaciones de fase próxima

### Opción α — Limpieza mínima (1 sprint corto)
Atacar **H1, H2, H3, H4** sin cambios estructurales:
- En `.ls-page` reset de `cursor`, ocultar `.bg-grid` y `.scanline` (via `body.lp .bg-grid { display: none }` o clase aplicada al body cuando estás en `/`).
- Resetear scrollbar para la landing.
- Añadir `t.nav.tenders` y usarlo en Navbar.
- Añadir link `/build` en Navbar.

### Opción β — Reconciliación visual (fase intermedia)
α + **H6, H7, H10**:
- Decidir si `/calculators` hub se elimina o se reduce a redirect a sub-rutas.
- Migrar emojis a glifos SVG en el hub interno (reutilizar los de la landing).
- Decidir si la Navbar global se simplifica/oculta en `/` para evitar la doble marca.

### Opción γ — Migración profunda (fase mayor)
β + migrar interior al modo claro o introducir tema dual aplicado consistentemente. Requiere spec separada y mucho más trabajo. No recomendada salvo decisión de producto.

---

## 4. Cosas a NO tocar (intencional)

- El cambio de modo "claro fachada → oscuro consola" sigue siendo válido; los hallazgos no lo cuestionan, solo piden limpiar el código global que filtra.
- Las páginas internas conservan su identidad cyber-teal en esta auditoría.
- `CLAUDE.md` instrucciones del agente conversacional (no afectado por landing).

---

## 5. Decisión pendiente

¿Cuál opción atacamos? α / β / γ / mixta / dejar como está.
