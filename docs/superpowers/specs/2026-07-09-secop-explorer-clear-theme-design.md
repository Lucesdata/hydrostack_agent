# Re-skin de Licitaciones (SecopExplorer) al clear theme — Design

## Contexto

HydroStack tiene actualmente tres lenguajes visuales coexistiendo:
1. **Clear theme** (`clr-*` / `ls-*`, `app/globals.css:19-97`) — fondo claro, acento teal `#0F766E`, Inter, usado en la landing (`app/page.js`), el navbar (`src/components/Navbar.js`) y el hub de calculadoras (`app/calculators/page.js`).
2. **Cyberpunk oscuro vía CSS vars** (`--deep1/2`, `--cyan`, `--white`, `--muted`, `app/globals.css:4-17`) — usado en `src/components/secop/SecopExplorer.tsx` (Licitaciones + semáforo de elegibilidad Nivel 0).
3. **Hex hardcodeado fragmentado** — calculadoras técnicas (`SepticTankCalculator.jsx`, `MaintenanceCalculator.jsx`, `GeoPanel.jsx`), cada una con su propia paleta oscura, sin relación con (1) ni (2).

El usuario confirmó que quiere el **clear theme** (1) como estándar visual del sitio, y decidió abordarlo de forma incremental. Este documento cubre **únicamente** el primer pase: Licitaciones.

## Alcance

**Dentro de alcance**: `src/components/secop/SecopExplorer.tsx` — el bloque `CSS` embebido (líneas ~256-579) y las clases usadas en el JSX. Además, nuevas clases compartidas en `app/globals.css` bajo el namespace `clr-*` que este componente consume (ver "Nuevas primitivas").

**Fuera de alcance** (decisión explícita del usuario):
- Calculadoras técnicas (`/calculators/geo`, `/calculators/fosa-septica`, `/calculators/mantenimiento`) — quedan con su tema HMI actual.
- `BuildFlow.jsx` / `GlobalProgress.jsx` / `CalculatorContextBanner.jsx` — incluyendo el microcopy en inglés hardcodeado detectado en la auditoría. Queda documentado como pendiente para un pase futuro, no se toca aquí.
- Cualquier cambio de lógica, estado, fetch, tipos o estructura de datos de SecopExplorer. Es un re-skin puro: mismo comportamiento exacto (semáforo de compuertas, probe de acceso documental, filtros, paginación).

## Mapeo de componentes

| Elemento actual | Clase actual | Reemplazo |
|---|---|---|
| Contenedor de página | `.hs-secop` | `clr-page` + `clr-container` |
| Header (tag + h1 + p) | `.hs-secop-head`, `.hs-secop-tag` | `clr-tag`, `clr-h1`, `clr-sub` (ya existen) |
| Inputs de filtro | `.hs-secop-input` | `.clr-input` / `.clr-select` (nuevas) |
| Grid de resultados | `.hs-secop-results` | `clr-grid` (ya existe) |
| Tarjeta de proceso | `.hs-secop-card` | `clr-card` (ya existe, se aplica a `<article>`) |
| Badge estado (Adjudicado/Abierto) | `.hs-secop-state` | `.clr-badge` variante neutral/acento (nueva) |
| Bloque veredicto Nivel 0 | `.hs-verdict`, `.hs-verdict-gate` | `.clr-verdict`, `.clr-verdict-gate` (nuevas, ver detalle abajo) |
| Chips de acceso documental | `.hs-secop-access` | `.clr-badge` reutilizado (success/warning/neutral) |
| Botón "Verificar acceso" | `.hs-secop-probe` | Botón con `--line`/`--accent` (mismo patrón que botones existentes del sitio) |
| Enlace "Ver en SECOP ↗" | `.hs-secop-link` | Link con `--accent`, mismo hover que `clr-card-cta` |
| Vacío / error / skeleton | `.hs-secop-empty/error/skeleton` | Recoloreado a `--surface-alt`, `--ink-600`, `--warning` |
| Paginador | `.hs-secop-pager` | Botones con `--line`/`--accent`, mismo patrón que el resto |

## Semáforo Nivel 0 — tratamiento elegido (Opción 2: "badge primero")

De 3 opciones presentadas visualmente al usuario (franja lateral / badge primero / línea resumen), se eligió **badge primero**:

- Píldora de estado arriba (`clr-verdict-overall`): fondo `--success`/`--warning`/`--danger` en tono claro (10-13% opacidad) + texto en el tono oscuro del mismo semántico + punto de color, formato similar a `clr-tag` pero coloreado por estado. Texto: "Elegible" / "Con reservas" / "No elegible" / "Por confirmar" (sin cambios, ya existen en `OVERALL_LABEL`).
- Las 5 compuertas (`sectorial`, `cuantia`, `plazo`, `ubicacion`, `habilitacion`) se muestran como **texto plano en línea**, no como chips con caja/borde: glifo (✓/!/✕/?) + etiqueta corta, color por estado individual de la compuerta, sin fondo ni borde. Mantiene el `title` tooltip actual con la razón de cada compuerta.
- Se descartan las opciones "franja lateral" (mantiene demasiada estructura de caja/HUD) y "línea resumen colapsada" (oculta qué compuerta específica falla, lo cual es información crítica para la decisión de elegibilidad — regresión de usabilidad).

## Nuevas primitivas compartidas (`app/globals.css`)

Se agregan bajo el namespace `clr-*` (consistente con el resto del clear theme) para que las calculadoras puedan reutilizarlas en un pase futuro, sin que eso amplíe el alcance de este pase:

- `.clr-input`, `.clr-select` — `background: var(--surface)`, `border: 1px solid var(--line)`, `border-radius: var(--radius-md)`, focus → `border-color: var(--focus-ring)` + `box-shadow` sutil.
- `.clr-badge` + variantes `.clr-badge--success/--warning/--neutral` — píldora pequeña, mismo patrón de color que se usa para `clr-status-dot` (fondo tenue del rol + texto en el tono oscuro del mismo rol).
- `.clr-verdict`, `.clr-verdict-overall`, `.clr-verdict-gate` — implementan el tratamiento "badge primero" descrito arriba.

## Testing / verificación

No hay tests automatizados de UI visual en el repo para este componente. Verificación manual vía `preview_*` tools:
1. Cargar `/licitaciones` con datos reales (mock o API), confirmar que filtros, paginación y probe de acceso siguen funcionando idénticamente.
2. Confirmar visualmente los 4 estados del semáforo (PASS/WARN/FAIL/UNKNOWN) con datos de ejemplo.
3. Confirmar que `src/__tests__/secop/verdict.test.ts` y demás tests unitarios de lógica siguen pasando sin cambios (no deberían verse afectados, ya que no se toca lógica).

## Fuera de alcance / pendiente para después

- Estandarizar a español el microcopy en inglés de `BuildFlow.jsx`, `GlobalProgress.jsx`, `CalculatorContextBanner.jsx`.
- Re-skin de las calculadoras técnicas (geo, fosa séptica, mantenimiento) — quedan con tema HMI oscuro hasta un pase futuro.
- Documentación formal de design tokens / Storybook (Opción C del audit original) — no se decidió aún si se hará.
