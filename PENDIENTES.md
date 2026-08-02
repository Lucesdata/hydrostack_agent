# Pendientes — HydroStack

Derivados del diagnóstico del 2026-08-02 (detalle completo con líneas exactas en `AUDIT_REPORT.md`).

**Ya resuelto en esa fecha:** anclas del navbar — `Navbar.js` ahora apunta a rutas reales (`/build`, `/calculators`, `/chat`, `/nosotros`) y se eliminó la lógica muerta de IntersectionObserver.

---

## Crítico

### 1. Extractor de pliegos: restaurar contrato validado (bloqueador de Fase 0) — ✅ resuelto 2026-08-02
El schema actual (`src/lib/pliego/schema.ts`) perdió `lagunas_pendientes` y el campo `codigo` de ítem. Sin ellos no se pueden representar las 6 inconsistencias que certificaron el gate "SALE LIMPIO" del caso UAESP (`docs/secop/uaesp-4182-2026/gate-verdict.md`). La Prueba Binaria de Fase 0 no es reproducible hoy.

Acción: reconciliar `schema.ts`/`prompt.ts` con `docs/secop/uaesp-4182-2026/extraction.json` — agregar `codigo` en `PliegoItem` y un campo `lagunas_pendientes` (o equivalente).

**Nota:** solo se restauró la forma mínima del contrato (`codigo` + `lagunas_pendientes`) exigida para representar las 6 inconsistencias del gate. La estructura completa de `extraction.json` (`partidas > subpartidas > items`, `formato_exigido`, `evaluacion_economica`, `criterios_calificacion`, `garantias`, `acuerdos_comerciales_aplicables`) sigue sin migrarse — el ítem 2 (fixture + test end-to-end) es el que verificaría si hace falta ese nivel de detalle.

### 2. Versionar fixture UAESP + test de regresión end-to-end
Los archivos fuente (PDF del pliego + Excel) solo existían en `~/Downloads` — hoy es imposible re-ejecutar la sonda. `src/__tests__/pliego/` solo usa datos sintéticos del schema nuevo.

Acción: versionar el fixture en el repo (o storage accesible al CI) y agregar test de integración que corra `extractPliego()` contra él comparando con `extraction.json`.

---

## Alto

### 3. `ProcesosTicker`: fallback deshonesto — ✅ resuelto 2026-08-02
`ProcesosTicker.jsx:216` inicializa con `MOCK_ITEMS` (entidades reales con montos ficticios) y si `/api/procesos/recientes` falla, el `.catch` no hace nada — el mock queda visible indefinidamente sin aviso.

Acción: replicar el patrón de degradación honesta que ya usa `app/api/landing-stats/route.ts` (null/"—").

**Nota:** se eliminó `MOCK_ITEMS` y el archivo `mockProcesos.js` (sin otros consumidores). El componente ahora tiene tres estados explícitos — `loading` / `live` / `empty` — y degrada a "— sin datos disponibles en este momento —" si la API falla o no trae ítems.

### 4. Destino de `app/experiencia/`
Página con `ScrollFilm.jsx` y videos en `/public/experiencia/` de un rediseño anterior — nadie la enlaza hoy. Decidir: integrarla como sección "Proyectos" real o eliminarla (código + assets).

### 5. Grounding del extractor no verificado
La `cita_textual` la autoreporta el modelo; no hay capa de texto extraído del PDF contra la cual verificar que la cita exista literalmente. Considerar verificador determinístico (page/offset).

---

## Medio

### 6. Suma total vs presupuesto oficial es solo nota, no gate
`validate.ts:78-91` valida aritmética por ítem, pero el chequeo de suma total contra presupuesto oficial solo genera `nota`, nunca `ok=false`. Decidir si debe bloquear.

### 7. `globals.css`: dos bloques `:root` inconexos — ✅ resuelto 2026-08-02
Tema oscuro "cyberpunk" (calculadoras) y tema claro (landing) conviven con convenciones distintas (`--mono` vs `--font-mono`). Unificar o documentar la separación.

**Nota:** se fusionaron los dos `:root` en uno solo con comentarios explicando el origen de cada convención de nombres (no se renombró ni eliminó ninguna variable, incl. `--sans`/`--orb` sin consumidores — cero cambio visual, verificado en landing y calculadoras).

### 8. Tipografía: 4 familias vía `<link>` en vez de `next/font`
`layout.js:21` carga Orbitron, IBM Plex Mono, Inter y JetBrains Mono por Google Fonts `<link>` (warning de lint). Migrar a `next/font` y documentar la combinación real.

---

## Bajo / Documentación

### 9. Sincronizar docs con la realidad
- `CLAUDE.md`: dice "Next.js 15" (real: 14.2.3); colores documentados `#F7F5EF`/`#1D6FA5` no existen en el repo (reales: `--bg:#FAFAF7`, `--accent:#0369A1`). Además `page.js:248` usa `#FCFCF9` inline sin token.
- `README.md`: describe `app/layout.tsx`/`page.tsx` y `src/components/Calculators/` — reales son `.js` y `src/components/calculator/`.
- `docs/fase-0/0.1-modelo-datos.md:204`: aún lista el índice GIN eliminado en `drizzle/0003`.
- `docs/agent/STEP-1-tool-use.md`: describe loop con Anthropic SDK, pero el agente conversacional real usa Groq — marcar como legado.
- Ningún doc registra que el schema total ya tiene 18 tablas (11 canónicas + 7 de cuentas Fase 1).

### 10. 12 errores de lint conocidos desde 2026-07-18
`react/no-unescaped-entities` en varios `.jsx`/`.tsx` y regla ESLint inexistente en `src/lib/db/client.ts:34,36`. Ver `AUDITORIA_TECH_DEBT.md`.

---

## Decisión pendiente del usuario (no es bug)

### 11. Alcance de la regla "no perfilar usuarios"
¿Aplica a la infraestructura de cuentas/alertas de Fase 1 (`cuentas.ts`: perfil de oferente, email, hora de envío — con opt-in explícito, login y unsubscribe), o solo a tracking encubierto de visitantes anónimos? No tocar `cuentas.ts` ni `app/api/alertas/*` hasta aclarar.
