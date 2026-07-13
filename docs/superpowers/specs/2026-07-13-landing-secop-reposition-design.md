# Landing: reposicionamiento a SECOP/Licitaciones — Design

Fecha: 2026-07-13
Alcance: solo `app/page.js` (home), `src/components/Navbar.js`, y componentes nuevos en `src/components/landing/`. No se tocan `/calculators`, `/build`, `/chat`, `/licitaciones` ni `src/lib/i18n.js`.

## Contexto

HydroStack va en producción (hydrostacks.vercel.app). El hero actual presenta 4 módulos en igualdad de peso (Calculadoras, Build, Agente, Licitaciones), en inglés por defecto, tema claro. El nuevo enfoque: Licitaciones/SECOP pasa a ser el mensaje central de la landing; los otros 3 módulos se reposicionan como funcionalidades de soporte. Todo el copy pasa a español; se retira temporalmente el selector ES/EN.

## Decisiones cerradas (confirmadas con el usuario)

- **Ticker: scroll normal, no sticky.** Vive en el flujo del documento entre el nav y el hero; se desplaza con el contenido, no queda fijo bajo el nav sticky.
- **i18n: español directo en JSX.** El copy nuevo del home se escribe como strings en español dentro de los componentes de landing, sin pasar por `src/lib/i18n.js`. El diccionario existente no se toca (sigue sirviendo al resto del sitio). Cuando se reactive el selector ES/EN, se migra este copy a i18n en un trabajo aparte.
- **No reutilizar `.btn-cta` de `globals.css`.** Su `:hover` referencia `var(--cyan)`/`var(--deep1)`, tokens de un tema oscuro anterior no usado en la landing actual (tema claro `--accent` teal). El botón CTA nuevo se estila con los tokens vigentes.
- **Formato de valores COP en el ticker:** `"$450 M"` (espacio antes de la M), igual a `formatCopCompact()` en `src/components/secop/format.ts` — consistencia visual con `/licitaciones`, aunque el ticker use datos fijos, no la función real.

## Tokens de diseño existentes (no se introduce paleta nueva)

De `app/globals.css` (bloque `:root` activo, líneas 20+):

- Color: `--bg #FAFAF7`, `--surface #FFFFFF`, `--surface-alt #F4F4EE`, `--ink-900 #0A1F1C`, `--ink-600 #525B5A`, `--ink-300 #8A938F`, `--line #E5E5E0`, `--line-soft #E8E8E2`, `--accent #0F766E`, `--accent-soft`, `--accent-faint`, `--success #16A34A`.
- Tipografía: `--font-sans 'Inter'`, `--font-mono 'JetBrains Mono'`. Escalas `--fs-xs` (11px) a `--fs-hero` (clamp 38–60px).
- Sombras: `--shadow-card-hover`, `--shadow-logo`.
- Nota: existen tokens `--cyan`/`--deep1` y una clase `.ticker-inner`/`@keyframes tickerScroll` en `globals.css`, remanentes de un tema oscuro anterior, sin uso actual en componentes. No se reutilizan (colores incorrectos para el tema actual); el `ProcesosTicker` nuevo trae su propia animación con nombre distinto para no chocar.

## Componentes nuevos

### `src/components/landing/mockProcesos.js`

Array plano exportado por defecto, ~8 objetos:

```js
{ id, entidad, valor, ciudad, departamento, sector, href: null }
```

Datos ficticios realistas del sector agua/saneamiento en Colombia (PTAR, alcantarillado, acueducto rural, PSMV), valores en formato `"$XXX M"`. `href: null` por ahora — el componente ya soporta pintar un link si en el futuro se llena con datos reales de SECOP/Neon Postgres.

### `src/components/landing/ProcesosTicker.jsx`

- `"use client"`. Recibe los items de `mockProcesos.js` (import directo, sin props obligatorias).
- Track duplicado (`[...items, ...items]`) dentro de un contenedor `overflow: hidden`, animación `@keyframes ptr-scroll` (`translateX(0)` → `translateX(-50%)`), `linear infinite`, duración ~30–40s según cantidad de items.
- `:hover` sobre el track → `animation-play-state: paused`.
- Cada item: `entidad` en `--font-mono`, separador `·` sutil (`--line` o `--ink-300`), `valor` en `--accent`, `ciudad/departamento` en `--ink-600`. Separador vertical fino entre items (`border-right: 1px solid var(--line)`).
- Si `item.href` existe, envuelve en `<Link>`; si no, `<span>` plano (no clickeable, `cursor: default`).
- Barra contenedora: `height` delgada (~40px), `border-bottom: 1px solid var(--line)`, `background: var(--surface)`, ancho completo (fuera del `max-width` container, full-bleed).
- Responsive: en mobile se mantiene el scroll horizontal infinito (funciona igual, solo se reduce `font-size`/`gap` vía media query dentro del `<style>` propio del componente).
- Estilo inyectado con el mismo patrón que `LANDING_CSS` en `page.js` (bloque `<style dangerouslySetInnerHTML>` scoped por clase, ej. `.ptr-*`).

## Cambios en `app/page.js`

### Montaje

`<ProcesosTicker />` se renderiza como primer hijo del `LandingPage`, antes de `<header className="ls-hero">` (el `<Navbar/>` ya vive en `layout.js`, fuera de este archivo).

### Hero

- Badge superior (`.ls-tag` con `ls-tag-dot` pulsante): texto cambia a `"SECOP · Agua y saneamiento"`. Se mantiene la animación de pulso existente.
- Bloque de badges normativos (`S.meta` / `tl.meta`: Res. 0330/2017, CTE DB-HS 5, ASTM D6391, SECOP II): se comenta completo en JSX con nota `{/* reservado: reubicar en sección de calculadoras — ver spec 2026-07-13 */}`. No se borra ni se toca `i18n.js`.
- Título (`<h1 className="ls-title">`): deja de ser una oración con `<em>` inline y pasa a 3 líneas apiladas (`<span>`/`<div>` por línea):
  1. "Evalúa si puedes competir." — peso completo, `color: var(--ink-900)`.
  2. "Qué te hace falta para competir." — mismo tamaño, `color: var(--ink-600)` (para leerse como progresión, no como 3 titulares de igual fuerza).
  3. "Cómo empezar a competir." — igual tratamiento que la línea 2.
- Se elimina el párrafo `S.lead` (subtítulo largo actual `tl.heroLead`). Las 3 líneas ya cargan el mensaje; un subtítulo adicional sería redundante con el reposicionamiento minimalista.
- CTA único: botón "Prueba un proceso" → `<Link href="/licitaciones">`. Estilo nuevo (no `.btn-cta`): fondo `var(--accent)`, texto blanco, `border-radius` consistente con `.ls-card` (12px o similar reducido para botón), hover con `translateY(-2px)` + `var(--shadow-card-hover)`, transición igual a la ya usada en `.ls-card:hover`.

### Sección Problema (nueva, después del hero)

- 3 puntos, numeración monoespaciada `01 / 02 / 03` (mismo lenguaje visual que `cardNum` en las cards de módulos: `"01 · CALCULADORAS"`).
- Sin iconos. Tono neutral, sin mención de precio/planes.
- Layout: grid de 3 columnas (`repeat(auto-fit, minmax(...))`, mismo patrón que `S.grid` de pillars) que colapsa a 1 columna en mobile.
- Copy:
  1. "No sabes si calificas hasta que ya invertiste tiempo en la propuesta."
  2. "El pliego tiene decenas de páginas y los requisitos habilitantes se pierden entre ellas."
  3. "Un error en el presupuesto descalifica la oferta, sin importar cuánto sabes del proyecto."

### Sección Cómo funciona (después de Problema)

- 4 pasos numerados `01–04`, layout vertical con línea guía sutil a la izquierda (`border-left: 1px dashed var(--line)` o similar, ecoando el `border-top: 1px dashed` ya usado en `S.meta`).
- Sin títulos por paso, solo número + frase.
- Copy:
  1. "Explora los procesos activos en agua y saneamiento directamente en HydroStack, sin loguearte en SECOP."
  2. "Evalúa tu RUP contra los requisitos habilitantes del proceso que elijas."
  3. "Si te falta algo, ves exactamente qué es: experiencia, capacidad financiera, clasificación."
  4. "HydroStack decodifica el pliego y te ayuda a estructurar el presupuesto."

### Sección herramientas de soporte (reemplaza "Four tools, one domain")

- Encabezado: "Una vez identificas el proceso, HydroStack te acompaña con:"
- Solo 3 items: Calculadoras, Build, Agente (Licitaciones sale de esta franja — ya es el mensaje central de la landing).
- Reutiliza los glifos SVG existentes (`GlyphCalc`, `GlyphBuild`, `GlyphAgent`) a tamaño reducido (ej. 28px vs 36px actual). `GlyphTender` queda definido pero sin uso (no se borra).
- Layout: fila horizontal de 3 (columna única en mobile), cada item = ícono + título (link a `/calculators`, `/build`, `/chat` respectivamente) + una línea de descripción corta. Sin card, sin borde, sin sombra, sin chips, sin CTA con flecha — mucho más liviano que el grid `.ls-card` actual.
- Copy (traducido, corto):
  - Calculadoras: "Dimensiona fosa séptica, campo de drenaje y mantenimiento."
  - Build: "Diseño 3D guiado con geolocalización real."
  - Agente: "Resuelve dudas técnicas y normativas en lenguaje natural."

### Cierre + Footer

- CTA "Prueba un proceso" repetido antes del footer (mismo estilo de botón del hero).
- Footer: misma estructura actual (`S.footer`), copy traducido a español directo (reemplaza `tl.footerTagline`/`tl.footerPhase` por strings ES fijos, ej. "Plataforma de contratación pública · Agua y saneamiento" / fase vigente).

## Cambios en `src/components/Navbar.js`

- Labels a español directo (reemplaza `t.nav.calculators`/`t.nav.assistant`/`t.nav.about` por strings fijos): "Calculadoras", "Asistente", "Licitaciones" (ya estaba fija), "Nosotros".
- Botón de idioma (`clr-lang-btn` desktop y `clr-mobile-lang`) y su `onClick={toggle}`: se comentan en JSX, no se borran. El import de `toggle` desde `useLang()` se mantiene (se sigue usando `t` para el resto del sitio si aplica; si `toggle` queda sin uso tras comentar los botones, se comenta también su desestructuración con nota de por qué).
- `#about` sigue apuntando a un ancla sin sección correspondiente en la landing (comportamiento preexistente, fuera de alcance de este cambio).

## Fuera de alcance

- `/calculators`, `/build`, `/chat`, `/licitaciones` — sin cambios.
- `src/lib/i18n.js` — sin cambios (el copy viejo de `landing` queda intacto pero deja de usarse desde `page.js`).
- Reubicación real de los badges normativos a la sección de calculadoras — solo se comentan y quedan reservados, no se implementa la reubicación (esa página no se toca en este trabajo).
- Limpieza de los tokens `--cyan`/`--deep1`/`.ticker-inner` remanentes en `globals.css` — no se tocan, quedan fuera de alcance.
