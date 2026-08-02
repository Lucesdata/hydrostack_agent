# Auditoría HydroStack — 2026-08-02

**Alcance**: Landing page, Hydro_Agent (extractor de pliegos), integración SECOP/Socrata y esquema de datos.
**Modalidad**: Auditoría de solo lectura — por instrucción explícita del usuario ("dame un informe, no hagas código"), **no se aplicó ningún fix**. Este documento reporta hallazgos, no cambios.
**Método**: 3 subagentes en paralelo (landing / Hydro_Agent / esquema-datos+SECOP), cada uno con lectura completa de código relevante, comparación contra `docs/` y ejecución de `vitest`/`tsc --noEmit` en modo lectura.

## Resumen ejecutivo

| Área | Issues encontrados | Severidad más alta | Estado |
|---|---|---|---|
| Landing (5 secciones) | 8 | Crítico | Navegación del navbar rota en 4/5 secciones |
| Hydro_Agent / extractor de pliegos | 7 (+2 aclaraciones) | Crítico | Prueba Binaria de Fase 0 **no reproducible** con el código actual |
| Esquema de datos / SECOP / Socrata | 1 (+1 decisión pendiente) | Bajo | Sano — tests 249/249, tsc limpio, sin drift |

**Total: 16 issues encontrados. 0 corregidos** (auditoría de solo lectura, según instrucción explícita).

**Veredicto de la Prueba Binaria de Fase 0: NO PASA / no reproducible.** El schema y prompt actuales del extractor de pliegos (`src/lib/pliego/`) ya no tienen forma de representar las inconsistencias (`lagunas_pendientes`, código de ítem) que hicieron que el gate del 2026-06-12 (`docs/secop/uaesp-4182-2026/gate-verdict.md`) saliera "LIMPIO". Ver detalle en la sección 2.

---

## 1. Landing page

Fuente: auditoría de `app/page.js`, `Navbar.js`, `src/components/landing/*`, `app/globals.css`, `app/layout.js`, comparado contra `CLAUDE.md`, `README.md`, `docs/FEATURES.md`.

### Hallazgos

1. **[CRÍTICO] Anclas de navbar rotas — 4 de 5 secciones no navegan a nada.**
   `Navbar.js:9-12` apunta a `/#proyectos`, `/#calculadoras`, `/#asistente`, `/#nosotros`, pero el `page.js` actual ("blueprint", commit `dfda51c`) no tiene ningún elemento con esos `id`. El rediseño reemplazó las secciones ancladas de una versión anterior sin actualizar el navbar. Un usuario que clica "Proyectos"/"Calculadoras"/"Asistente"/"Nosotros" solo vuelve a `/` sin scroll.

2. **[ALTO] "Proyectos" y "Asistente" no viven donde el navbar dice.**
   `Navbar.js` define `route: "/build"` para "Proyectos" y `route: "/chat"` para "Asistente", pero por el ancla rota (hallazgo 1) nunca se llega ahí desde la home. Además, `app/experiencia/page.js` (con `ScrollFilm.jsx` y videos en `/public/experiencia/`) es la sección "Proyectos" de un rediseño anterior (commit `56f436a`) que **nadie enlaza hoy** — código y assets de video muertos.

3. **[ALTO] Sistema de diseño real diverge por completo de `CLAUDE.md`.**
   `CLAUDE.md` declara cream `#F7F5EF` y blue `#1D6FA5` — **ninguno de los dos hex existe en el repo** (grep confirmado, 0 resultados). Los tokens reales (`app/globals.css:22-40`) son `--bg:#FAFAF7`, `--surface:#FFFFFF`, `--accent:#0369A1`. Además `page.js:248` usa un cuarto valor inline, `#FCFCF9`, sin pasar por token. Tres blancos/cremas distintos conviviendo en la misma landing.

4. **[MEDIO] Dos bloques `:root` sin relación en `globals.css`.**
   Un primer `:root` (`globals.css:4-16`) define un tema oscuro tipo "cyberpunk" (`--cyan`, `--deep1`, `--deep2`, `--orb`) usado por las calculadoras; un segundo `:root` (`globals.css:20-52`) define el tema claro usado por landing/navbar. Ninguno coincide con lo documentado, y las convenciones de nombres difieren entre bloques (`--mono` vs `--font-mono`), lo que hace fácil que un cambio en uno "no tenga efecto" aparente en el otro.

5. **[MEDIO] Tipografía real: 4 familias, ninguna combinación documentada.**
   `layout.js:21` carga Orbitron, IBM Plex Mono, Inter y JetBrains Mono vía `<link>` de Google Fonts (no `next/font`, genera warning de lint). `CLAUDE.md` solo documenta "IBM Plex Mono + Inter"; Orbitron y JetBrains Mono no están mencionados pese a ser el font-mono de facto de toda la landing.

6. **[ALTO] Ticker de procesos: fallback silencioso a datos ficticios con apariencia de reales.**
   `ProcesosTicker.jsx:216` inicializa con `MOCK_ITEMS` (entidades reales — EAAB, EPM, Findeter — con montos ficticios) y solo los reemplaza si `/api/procesos/recientes` responde con éxito; si falla, el `.catch` (línea 228) no hace nada — el ticker sigue mostrando datos ficticios indefinidamente, sin aviso claro. Contraste: `app/api/landing-stats/route.ts` sí degrada honestamente a `null`/"—" — el patrón correcto ya existe en el propio repo, solo no se replicó aquí.

7. **[BAJO] README/CLAUDE.md desactualizados vs estructura real.**
   `package.json` fija Next 14.2.3, `CLAUDE.md` dice "Next.js 15". `README.md` describe `app/layout.tsx`/`page.tsx` y `src/components/Calculators/` — los archivos reales son `.js` y el directorio real es `src/components/calculator/` (minúscula). Ningún doc de referencia documenta la estructura de 5 secciones; solo existe en el brief verbal del usuario.

8. **[BAJO] Errores de lint ya conocidos, no relacionados con landing directamente** — mismos 12 errores de `AUDITORIA_TECH_DEBT.md` (2026-07-18), siguen sin resolver: `react/no-unescaped-entities` en varios `.jsx`/`.tsx`, regla ESLint inexistente en `src/lib/db/client.ts:34,36`.

### Lo que está bien
- `LandingCards.jsx` y `app/api/landing-stats/route.ts`: datos reales con degradación honesta por campo, sin ocultar fallos.
- `LandingCards.jsx` usa consistentemente tokens CSS (`var(--accent)`, etc.), no hex hardcodeado.
- Las 5 secciones sí existen como rutas navegables directas (`/licitaciones`, `/build`, `/calculators`, `/chat`, `/nosotros`) — el problema es solo el enlace por ancla desde el navbar, no la existencia del contenido.
- `tsc --noEmit` sin errores en todo el repo.

---

## 2. Hydro_Agent — extractor de pliegos (dominio crítico para Fase 0)

Fuente: lectura completa de `src/lib/pliego/*`, `src/lib/agent/*`, comparado contra el fixture real `docs/secop/uaesp-4182-2026/` (extraction.json, lagunas.md, gate-verdict.md) que certificó "SALE LIMPIO" el 2026-06-12.

### Hallazgos

1. **[CRÍTICO] El schema actual es incompatible con el contrato que ganó "SALE LIMPIO".**
   El fixture validado usa `partidas > subpartidas > items` (con `codigo`), `formato_exigido`, `evaluacion_economica`, `criterios_calificacion`, `garantias`, `acuerdos_comerciales_aplicables` y sobre todo **`lagunas_pendientes`** (las 6 inconsistencias del pliego detectadas). El schema actual (`src/lib/pliego/schema.ts:65-81`) solo tiene `capitulos > items` genéricos y `verificacion.campos_no_encontrados` (campos faltantes, no inconsistencias del pliego). **No existe ningún campo de salida para reportar inconsistencias** — la capacidad que el gate-verdict señaló como "el producto vendible que emerge de la sonda" no está en el schema actual. Causa raíz: `schema.ts` fue reescrito (commits `f7ffcd1`/anterior) como extractor genérico sin referenciar el contrato ya validado.

2. **[CRÍTICO] `PliegoItem` no tiene campo `codigo`.**
   `schema.ts:27-36`. Sin código de ítem, la laguna #1 del fixture (mismo conjunto de 8 PTAPs×3 actividades con tres numeraciones distintas) **no puede ni siquiera representarse** en la salida actual. Es regresión de capacidad, no solo de forma.

3. **[ALTO] No hay arnés de regresión contra el fixture real.**
   `src/__tests__/pliego/validate.test.ts` solo prueba con datos sintéticos que ya asumen el schema nuevo — nunca se re-corre `extractPliego()` contra el PDF real de UAESP para comparar contra `extraction.json`. Además `sources.md` apunta a rutas en `~/Downloads` del usuario, no versionadas en el repo: hoy es literalmente imposible re-ejecutar la sonda sin que el usuario vuelva a aportar los archivos originales. (`npx vitest run src/__tests__/pliego src/__tests__/agent` → 17/17 pasan, pero no prueban nada del caso UAESP real.)

4. **[MEDIO] Grounding autoreportado por el modelo, no verificado contra texto fuente.**
   `prompt.ts` exige `cita_textual` por ítem y `validate.ts:52-58` marca `cita_faltante` si está vacía (mejora real). Pero no hay extracción de texto independiente del PDF contra la cual verificar que la cita exista literalmente — el "grounding" depende de que el modelo no se auto-cite falsamente. No hay verificador determinístico page/offset.

5. **[MEDIO] La suma total vs presupuesto oficial es solo nota informativa, no gate duro.**
   `validate.ts:78-91` sí valida aritmética por ítem (determinística, ±1 peso — bien). Pero el chequeo "estrella" del fixture (suma de 8×3 techos = $412.698.192) hoy solo genera una `nota`, nunca `ok=false`. Defendible por el IVA global, pero significa que el check de consistencia matemática que certificó el gate ya no bloquea nada en código.

6. **[BAJO] Generalización a obra civil (matriz APU) sigue sin resolver** — limitación ya conocida en `gate-verdict.md` sección 3, no es regresión nueva. El schema/prompt actuales solo cubren el caso simple de consultoría (tabla plana GLB).

7. **[BAJO] `docs/agent/STEP-1-tool-use.md` describe un loop del agente-propietario con Anthropic SDK/`ANTHROPIC_API_KEY`, pero el agente conversacional real usa exclusivamente Groq** (`app/api/agent/route.ts`, `llama-3.3-70b-versatile`) — doc legado que puede confundir a quien lo use como referencia vigente.

### Aclaraciones (no son bugs, corrigen una suposición del brief)

- **No existe pipeline PyMuPDF/pdfplumber, ni en Python ni en Node.** `extractPliego.ts:44-49` envía el PDF completo en base64 directo al Messages API de Anthropic (`type:'document'`) — Claude lo lee nativamente. `pdfkit` solo genera el informe de **salida**, no lee pliegos. Esto es arquitectónicamente válido (feature soportada por la API), pero es una discrepancia total respecto a la suposición del brief. Importante porque agrava el hallazgo 4: no hay capa de texto extraído contra la cual cruzar `cita_textual`.
- **El modelo usado es `claude-opus-4-8`, no "Haiku/Sonnet"** como asumía el brief — verificado como ID real y vigente, con parámetros (`thinking:{type:'adaptive'}`, `output_config.effort:'high'`) correctamente usados. Ningún doc del repo dice "Haiku/Sonnet"; es una idea externa al proyecto.
- **Separación agente-propietario (Groq) vs extractor de pliegos (Anthropic) es limpia en código** — cero acoplamiento accidental. `src/lib/pliego/*` solo lo consume `scripts/analyze-pliego.ts` (CLI), aún no conectado a ninguna ruta/UI.

### Estado de la Prueba Binaria de Fase 0

**NO PASA / no reproducible tal como está.** Si se re-ejecutara hoy el mismo pliego UAESP, el pipeline actual produciría una salida estructuralmente distinta e incapaz de reconstruir las 6 detecciones que motivaron el veredicto "SALE LIMPIO" del 2026-06-12: (a) el schema/prompt no tienen campo para `lagunas_pendientes` ni `codigo` de ítem; (b) no hay fixture de PDF versionado ni test de integración end-to-end; (c) los archivos fuente originales solo existían en `~/Downloads` del usuario. La matemática por ítem sigue siendo sólida y el grounding por cita es una mejora real, pero el producto ya no cubre el caso de uso que el gate certificó.

---

## 3. Esquema de datos / SECOP / Socrata

Fuente: `src/lib/db/schema/*`, `src/lib/secop/*`, `src/lib/ingest/*`, `src/lib/transform/*`, `src/lib/classify/*`, `src/lib/oferente/*`, migraciones en `drizzle/`, comparado contra `docs/fase-0/*` y `docs/fase-a/nivel-0-perfil-y-veredicto.md`.

### Hallazgos

1. **[BAJO] "11 tablas canónicas" sigue siendo preciso solo en su alcance original.** El modelo ELT documentado en fase-0 (10 tablas de `raw/catalogos/hechos/control` + `clasificacion_sectorial`) = 11, correcto. Pero el schema total real ya tiene **18 tablas** — Fase 1 (`cuentas.ts`) añadió 7 más (`usuario`, `cuenta`, `sesion`, `oferente_perfil`, `envio_log`, `alerta_preferencias`, etc.), declaradas explícitamente como "infra vendorizada, no modelo de dominio propio" en el propio archivo. No es drift, pero ningún doc dice "18 tablas totales" — vale la pena aclararlo en la próxima actualización de memoria/documentación.

2. **Doc desactualizado (cosmético):** `docs/fase-0/0.1-modelo-datos.md:204` todavía lista el índice GIN sobre `payload` como parte del diseño; el índice fue eliminado en `ac1e08e`/`drizzle/0003`. Riesgo de tamaño de Neon ya resuelto — confirmado en schema y migración.

### Verificaciones positivas (sin hallazgos)
- **`document-access.ts`**: gate `fail-closed` por diseño. `canExtract()` exige literalmente `state === 'PUBLIC'`; cualquier caso no cubierto cae en `UNKNOWN`, que no pasa el gate. Consistente 1:1 con `docs/fase-a/nivel-0-perfil-y-veredicto.md` y con `verdict.ts` (`requiredLevel:2` nunca pinta verde/rojo). Sin casos borde sin cubrir.
- **Ingesta incremental keyset+sweep**: implementada de verdad (`src/lib/ingest/runIngest.ts`, `pipeline.ts`, `pagination.ts`), no solo documentada. Protegida por `CRON_SECRET` en `app/api/cron/ingest/route.ts` (verificar que esté seteado en Vercel — fuera de alcance de esta auditoría de código).
- **Drift schema↔migraciones**: ninguno detectado en las 6 migraciones revisadas.
- **Tests**: `npx vitest run src/__tests__/{secop,ingest,transform,classify,oferente}` → **249/249 pasan** (25 archivos). `npx tsc --noEmit` → sin errores.

### Cambios que requieren decisión del usuario antes de aplicar
No se encontró ninguna inconsistencia que amerite tocar el esquema de la base de datos ni la lógica de clasificación de acceso (`document-access.ts`, `verdict.ts`) — no se propone ningún cambio ahí.

Sí se señala para decisión explícita (no es un bug, es una tensión de alcance): la regla dura del proyecto de "no perfilar/trackear usuarios individuales en Licitaciones" — ¿aplica también a la infraestructura de cuentas/alertas de Fase 1 (`cuentas.ts`: perfil de oferente con datos financieros, email, hora de envío de alertas), que ya está construida y desplegada con opt-in explícito (login, unsubscribe de un clic)? ¿O la regla se refiere solo a tracking encubierto de visitantes anónimos, y las cuentas con consentimiento explícito quedan fuera de esa regla? No se tocó nada de `cuentas.ts` ni de `app/api/alertas/*` a la espera de esa aclaración.

---

## 4. Pendientes priorizados (recomendación, sin aplicar)

1. **Reconciliar `src/lib/pliego/schema.ts`/`prompt.ts` con el contrato validado en `docs/secop/uaesp-4182-2026/extraction.json`** — agregar `codigo` de ítem y un campo `lagunas_pendientes` (o equivalente) antes de reclamar que Fase 0 sigue "cerrada". Este es el bloqueador real para la Prueba Binaria.
2. **Versionar el fixture de PDF** (pliego + Excel de UAESP) dentro del repo (o en almacenamiento accesible al CI) y agregar un test de integración que corra `extractPliego()` end-to-end contra él, comparando contra `extraction.json` — hoy no hay forma reproducible de re-probar el gate.
3. **Arreglar las anclas del navbar** (`Navbar.js:9-12`) para que apunten a las rutas reales (`/build`, `/calculators`, `/chat`, `/nosotros`) en vez de anchors inexistentes en `/`.
4. **Decidir el destino de `app/experiencia/`** (código y videos huérfanos) — integrarlo como la sección "Proyectos" real, o retirarlo si quedó obsoleto.
5. **Sincronizar `CLAUDE.md` con los tokens de diseño reales** (`#FAFAF7`/`#FFFFFF`/`#0369A1` vs los documentados `#F7F5EF`/`#1D6FA5`) — decidir cuál es la fuente de verdad y unificar.
6. **Arreglar el fallback del `ProcesosTicker`** para que degrade honestamente (como ya hace `landing-stats`) en vez de mostrar mock indefinidamente sin aviso claro.
7. **Aclarar el alcance de la regla de no-profiling** frente a la infraestructura de cuentas de Fase 1 (ver sección 3).

---

*Próxima corrida de esta auditoría: actualizar este mismo archivo (`AUDIT_REPORT.md`) en vez de crear uno nuevo.*
