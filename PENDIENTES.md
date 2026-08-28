# Pendientes — AquaLicita

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

### 4. Destino de `app/experiencia/` — ✅ resuelto 2026-08-08
Página con `ScrollFilm.jsx` y videos en `/public/experiencia/` de un rediseño anterior — nadie la enlazaba.

**Nota:** eliminada como parte de la consolidación de AquaLicita como producto SECOP único (ver [ADR-0002](docs/adr/ADR-0002-deprecacion-dominio-septico.md)). Recuperable desde el tag `archive/septic-product-2026-08-08` si se retoma.

### 5. Grounding del extractor no verificado
La `cita_textual` la autoreporta el modelo; no hay capa de texto extraído del PDF contra la cual verificar que la cita exista literalmente. Considerar verificador determinístico (page/offset).

---

## Medio

### 6. Suma total vs presupuesto oficial es solo nota, no gate
`validate.ts:78-91` valida aritmética por ítem, pero el chequeo de suma total contra presupuesto oficial solo genera `nota`, nunca `ok=false`. Decidir si debe bloquear.

### 7. `globals.css`: dos bloques `:root` inconexos — ✅ resuelto 2026-08-02
Tema oscuro "cyberpunk" (calculadoras) y tema claro (landing) conviven con convenciones distintas (`--mono` vs `--font-mono`). Unificar o documentar la separación.

**Nota:** se fusionaron los dos `:root` en uno solo con comentarios explicando el origen de cada convención de nombres (no se renombró ni eliminó ninguna variable, incl. `--sans`/`--orb` sin consumidores — cero cambio visual, verificado en landing y calculadoras).

### 8. Tipografía: 4 familias vía `<link>` en vez de `next/font` — ✅ resuelto 2026-08-08
`layout.js:21` carga Orbitron, IBM Plex Mono, Inter y JetBrains Mono por Google Fonts `<link>` (warning de lint). Migrar a `next/font` y documentar la combinación real.

**Nota:** el alcance real era mayor al de un solo archivo — verificado en navegador que `next/font` genera nombres de familia internos ofuscados (no el literal `"Orbitron"`), así que los ~30 archivos que hardcodeaban `fontFamily: "'Orbitron', sans-serif"` etc. se migraron también a `var(--font-orbitron)`/`var(--font-ibm-plex-mono)`/`var(--font-jetbrains-mono)`/`var(--font-inter)` (definidas por `next/font` en `layout.js` y re-expuestas como `--mono`/`--sans`/`--orb`/`--font-mono`/`--font-sans` en `globals.css`). Cero cambio visual — verificado con medición de ancho de texto renderizado y screenshots en landing, calculadoras y Hydro_Agent.

---

## Bajo / Documentación

### 9. Sincronizar docs con la realidad — ✅ resuelto parcialmente 2026-08-08
- `CLAUDE.md`: dice "Next.js 15" (real: 14.2.3); colores documentados `#F7F5EF`/`#1D6FA5` no existen en el repo (reales: `--bg:#FAFAF7`, `--accent:#0369A1`). Además `page.js:248` usa `#FCFCF9` inline sin token.
- `README.md`: describe `app/layout.tsx`/`page.tsx` y `src/components/Calculators/` — reales son `.js` y `src/components/calculator/`.
- `docs/fase-0/0.1-modelo-datos.md:204`: aún lista el índice GIN eliminado en `drizzle/0003`.
- `docs/agent/STEP-1-tool-use.md`: describe loop con Anthropic SDK, pero el agente conversacional real usa Groq — marcar como legado.
- Ningún doc registra que el schema total ya tiene 18 tablas (11 canónicas + 7 de cuentas Fase 1).

**Nota:** resueltos los 4 puntos explícitos del pendiente (versión de Next, tokens de color en `CLAUDE.md`; extensiones/rutas reales en `README.md`; nota del índice GIN retirado en `docs/fase-0/0.1-modelo-datos.md`; aviso de legado en `docs/agent/STEP-1-tool-use.md`). El punto de las "18 tablas" no estaba en el alcance que se me dio para este ítem — queda para una futura pasada de documentación. `page.js:248` con `#FCFCF9` inline tampoco se tocó (es apariencia visual existente, no un dato de doc desactualizado).

### 10. 12 errores de lint conocidos desde 2026-07-18 — ✅ resuelto 2026-08-08
`react/no-unescaped-entities` en varios `.jsx`/`.tsx` y regla ESLint inexistente en `src/lib/db/client.ts:34,36`. Ver `AUDITORIA_TECH_DEBT.md`.

**Nota:** `npx next lint` corrió limpio de errores tras el fix (quedan solo 4 warnings preexistentes — react-hooks/exhaustive-deps ×2, no-img-element, aria-pressed — no forman parte de este pendiente). Comillas escapadas con `&quot;`/`&apos;` en `ProfileDetector.jsx`, `IsometricDiagram.jsx` (×2), `CalculatorSchematics.jsx`, `ComoParticipar.tsx` (×2 líneas); en `src/lib/db/client.ts:34,36` se quitaron los comentarios `eslint-disable-next-line @typescript-eslint/no-require-imports` (la regla no existe en esta config, que solo extiende `next/core-web-vitals` sin el plugin de typescript-eslint).

---

## Módulo de diagnóstico (abiertos el 2026-08-28)

Del cierre de las cuatro fases del módulo. Detalle en `docs/diagnostico/`.

### 12. Variante del cuestionario para régimen especial (Ley 142)
Estaba anotado como "fuera de alcance" en la spec, pero clasificar el catálogo
lo ascendió a prioridad: **el 55 % de los procesos de `proceso` son
"Contratación régimen especial"** — el régimen de derecho privado de la Ley 142
con manual de contratación propio. Hoy el diagnóstico le calcula un escalón al
usuario y luego calla ante más de la mitad del catálogo, porque esas
modalidades no son peldaños de la escalera y `normalizarModalidad` devuelve
`null` a propósito (encajarlas sería inventarse un veredicto).

En total, el 79 % de los procesos no corresponde a ningún peldaño: régimen
especial (55 %), contratación directa (15 %), solicitud de información,
concurso de méritos.

Acción: cuestionario `co-apsb-esp-v1` con las reglas de la Ley 142, o al menos
un texto que explique al usuario por qué esos procesos no llevan aviso.

### 13. Verificar a mano el reclamo del diagnóstico con una cuenta real
El único tramo del flujo sin probar de punta a punta: responder sin sesión,
registrarse y confirmar que el diagnóstico aparece en la cuenta. Cubierto por
tests (`src/__tests__/diagnostico/reclamar.test.ts`,
`src/__tests__/api/auth-callback-route.test.ts`) pero no ejecutado con
credenciales.

Los **tres** caminos hay que probarlos por separado, porque el enganche está en
tres sitios: Google y verificación de correo (`app/auth/callback/route.ts`),
alta con contraseña y login (`signUpAction` / `signInWithPasswordAction` en
`src/lib/supabase/actions.ts`).

### 14. HABILITACIÓN sigue sin fuente numérica — límite conocido, no bug
El diagnóstico **no** puede alimentar `habilitacionGate`: es cualitativo y no
produce `ExperienciaContrato[]` en SMMLV ni los seis indicadores de
`CapacidadFinancieraRUP`. Sin pliego extraído, la compuerta sigue en gris
"requiere pliego", que es lo correcto — la invariante D18 de `verdict.ts`
prohíbe que una compuerta documental pinte verde o rojo sin el pliego.

La única fuente numérica sigue siendo `RupWizard`. El diagnóstico manda ahí a
quien ya está en escalón de menor cuantía o superior.

### 15. Revocar los GRANT de `anon` y `authenticated` (defensa en profundidad)
Ya estaba anotado en `CLAUDE.md` §4 como "refuerzo pendiente, menor" y no
figuraba aquí. Los dos roles conservan `SELECT, INSERT, UPDATE, DELETE,
TRUNCATE` sobre las 23 tablas; RLS los contiene, pero `TRUNCATE` **no** está
sujeto a RLS en Postgres. No es explotable hoy (PostgREST no expone `TRUNCATE`
y nadie tiene credenciales de Postgres para esos roles). Ojo con Storage, que
tiene políticas propias en `storage.objects`.

---

## Decisión pendiente del usuario (no es bug)

### 11. Alcance de la regla "no perfilar usuarios"
¿Aplica a la infraestructura de cuentas/alertas de Fase 1 (`cuentas.ts`: perfil de oferente, email, hora de envío — con opt-in explícito, login y unsubscribe), o solo a tracking encubierto de visitantes anónimos? No tocar `cuentas.ts` ni `app/api/alertas/*` hasta aclarar.
