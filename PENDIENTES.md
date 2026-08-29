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

### 12. Variante del cuestionario para régimen especial (Ley 142) — ⚠️ parcial 2026-08-28
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

**Hecho:** la segunda mitad de esa acción — el texto que explica el silencio.
Las coincidencias de una E.S.P. bajo régimen especial llevan una insignia
"Ley 142 · régimen privado" y una nota que dice por qué el escalón no aplica
ahí (`src/lib/diagnostico/regimen-especial.ts`).

**Sigue abierto:** el cuestionario `co-esp-v1`. Y al ir a los datos apareció
por qué no es un simple "escribir diez preguntas": la Ley 142 **no tiene
escalera de contratación**. Cada E.S.P. fija sus modalidades y topes en su
propio manual, aprobado por su junta, así que "a qué escalón puedes aspirar" no
tiene respuesta universal. Ver `docs/diagnostico/03-variante-ley-142.md` §2 y
§3, con los tres caminos y su coste.

**Ya implementado (2026-08-29):** `co-esp-v1` en versión recortada, 6 de 8
preguntas, en `/diagnostico?v=co-esp-v1`. Faltan las dos que dependen de
revisión jurídica, y por eso el resultado lleva una advertencia de alcance: sin
ellas el cuestionario no tiene bloqueantes absolutos y no puede decirle a nadie
"esto te deja fuera".

**Bloqueado por criterio jurídico:** el alcance de inhabilidades y de los
aportes a seguridad social cuando el contrato se rige por derecho privado
(04-propuesta §7.1). Sin eso no entran las dos preguntas que faltan.

**Dos huecos que NO están bloqueados** (05-hallazgos §5.2), encontrados leyendo
lo que publican las empresas: los **códigos UNSPSC** —el registro del EAAB está
organizado por ellos, y los descarté por creerlos cosa del RUP— y las **listas
restrictivas** OFAC/ONU/BM/BID, por las que EPM suspende el registro. Ninguno
es interpretación de la ley: son requisitos publicados. Ambos están propuestos
en 05-hallazgos §7, pendientes de visto bueno.

**ACUAVALLE revisada (2026-08-29):** el 403 era del WAF; con navegador real
todo es público. Y **corrigió un error de contenido ya publicado**: `co-esp-v1`
afirmaba que estas empresas no exigen RUP, y ACUAVALLE **sí lo exige** entre sus
requisitos de capacidad. Generalicé desde EAAB y EPM a todas. Corregido.

También movió §7.1: su instructivo exige no estar incurso en inhabilidades
*"de conformidad con… Ley 80 de 1993, Ley 142 de 1994, Ley 689 de 2001, Ley 1150
de 2007, Ley 1474 de 2011…"*. No cierra la pregunta del alcance general, pero
ya hay una E.S.P. que lo aplica y enumera las normas.

**Hueco nuevo, propuesto:** declaración de conflicto de interés por parentesco
con el representante legal de la entidad. Entraría en `co-esp-v2`.

**Además, si entra:** `diagnostico.escalon` es `NOT NULL` y un cuestionario sin
escalón pediría migración `0016`.

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

### 16. `/mis-coincidencias` en frío tarda 12 s — medido 2026-08-29

**No es una consulta lenta: es arranque en frío.** Cinco peticiones seguidas a
producción, sin sesión:

| Ruta | 1.ª | 2.ª a 5.ª |
|---|---|---|
| `/mis-coincidencias` | **11,8 s** | 0,26 – 0,43 s |
| `/licitaciones` | 2,4 s | 0,64 – 0,72 s |
| `/diagnostico` | 1,0 s | 0,23 – 0,27 s |

En caliente está bien. Lo que llama la atención es que su arranque en frío sea
**5× el de `/licitaciones` y 12× el de `/diagnostico`**, siendo las tres
dinámicas.

**Lo que sí está medido.** Sin sesión, la página solo hace el teaser, y el
teaser es `getEnJuegoMes()`, que **no consulta nuestra base**: llama a Socrata,
la API pública de SECOP.

- `getEnJuegoMes()` completa: **3.104 ms** la primera, 1.891 y 1.590 después.
- De eso, `resolveDatasetId` son 624 ms la primera vez y 0 ms cacheado en
  proceso.
- La misma cuenta contra nuestro Postgres: 2.851 ms la primera (casi todo
  handshake del pool) y **293 ms** ya conectado.

**Lo que es inferencia, no medición.** Los ~8 s restantes del arranque en frío
se reparten entre el init del lambda y la carga de módulos. La página importa
en el nivel superior matching (×2), alertas, digest de correo, estado de
pliegos, landingStats, el store del diagnóstico, señales y perfil — todo eso se
carga aunque el visitante sea anónimo y solo vaya a ver el teaser.

**Tres salidas, por coste creciente:**

1. **No hacer nada.** En caliente responde en 0,3 s; el frío lo paga el primer
   visitante tras un rato de inactividad.
2. **Aligerar el grafo de imports** de la rama anónima (import dinámico de lo
   que solo usa la rama con sesión). Es lo más dirigido: ataca los ~8 s, no los
   3 s de Socrata.
3. **Servir el teaser desde nuestro Postgres** en vez de Socrata. Ojo: los
   números no son intercambiables tal cual —Socrata devolvió 1.551 procesos y
   la consulta local 1.188, porque los filtros no son los mismos— así que hay
   que replicar el filtro sectorial y el de apertura antes de cambiarlo. Y
   `landingStats` también alimenta la landing, así que el cambio no es local.

---

## Decisión pendiente del usuario (no es bug)

### 11. Alcance de la regla "no perfilar usuarios"
¿Aplica a la infraestructura de cuentas/alertas de Fase 1 (`cuentas.ts`: perfil de oferente, email, hora de envío — con opt-in explícito, login y unsubscribe), o solo a tracking encubierto de visitantes anónimos? No tocar `cuentas.ts` ni `app/api/alertas/*` hasta aclarar.
