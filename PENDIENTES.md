# Pendientes — AquaLicita

Derivados del diagnóstico del 2026-08-02 (detalle completo con líneas exactas en `AUDIT_REPORT.md`).

**Ya resuelto en esa fecha:** anclas del navbar — `Navbar.js` ahora apunta a rutas reales (`/build`, `/calculators`, `/chat`, `/nosotros`) y se eliminó la lógica muerta de IntersectionObserver.

---

## Crítico

### 0. Correo sin configurar: registro roto y alertas caídas en prod (2026-09-07)
El registro por correo lleva fallando desde el 2026-08-18 porque el servicio de
correo integrado de Supabase solo entrega a miembros del equipo del proyecto. La
misma pieza faltante tumba las alertas diarias en producción (`AUTH_RESEND_KEY`
no existe en Vercel). El código ya está resuelto; lo que falta es configuración
en Supabase, Resend y Vercel — pasos exactos en
[PENDIENTES-CORREO.md](PENDIENTES-CORREO.md).

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

### 16. `/mis-coincidencias` NO tiene un problema de rendimiento — medido y descartado 2026-08-29

Se abrió porque una petición tardó 8,6 s, y luego otra 11,8 s. **Medido a
fondo, la alarma era mía y era falsa.**

**Primera tanda, cinco peticiones seguidas por ruta:**

| Ruta | 1.ª | 2.ª a 5.ª |
|---|---|---|
| `/mis-coincidencias` | 11,8 s | 0,26 – 0,43 s |
| `/licitaciones` | 2,4 s | 0,64 – 0,72 s |
| `/diagnostico` | 1,0 s | 0,23 – 0,27 s |

De ahí concluí que su arranque en frío era 5× el de `/licitaciones`. **Esa
comparación no valía**: `/mis-coincidencias` fue la primera ruta que pedí, así
que pagó el arranque del despliegue entero y las otras dos ya lo encontraron
caliente. Un test cuyo resultado depende del orden.

**Segunda tanda, rutas nunca tocadas en la primera, con el despliegue ya
caliente:** `/nosotros` 1,7 s · `/soluciones` 0,24 s · `/licitaciones/descubrir`
0,27 s. Si el arranque fuera por ruta, `/nosotros` habría tardado sus ~10 s
también. No los tardó.

**Conclusión: los 11,8 s eran el arranque del despliegue tras inactividad, no
algo de esta ruta.** En caliente responde en 0,26-0,43 s, que es *más rápido*
que `/licitaciones`. No hay nada que arreglar.

#### Lo que sí quedó medido, y sigue siendo cierto

- Sin sesión, el teaser sale de `getEnJuegoMes()`, que **no consulta nuestra
  base**: llama a Socrata, la API pública de SECOP. **3.104 ms** la primera
  llamada, 1.891 y 1.590 después; de eso, 624 ms son resolver el dataset. La
  caché de `fetch` de Next lo absorbe, así que solo lo paga el primer visitante
  tras cada revalidación.
- Aligerar el grafo de imports de la rama anónima —lo que se iba a hacer—
  ahorraría **~360 ms**: 222 de `perfil-store` (casi todo el cliente de base,
  que la rama anónima no necesita), 87 de `alertas`, y migajas del resto.
  **Se descartó**: 360 ms no justifican reestructurar una página que funciona y
  cuyas dos ramas con sesión no se pueden verificar sin credenciales.

#### Si algún día se quiere tocar

Servir el teaser desde nuestro Postgres quitaría la dependencia de Socrata.
Aviso: **los números no son intercambiables tal cual** — Socrata devolvió 1.551
procesos y la consulta local 1.188, porque los filtros difieren. Habría que
replicar el filtro sectorial y el de apertura primero, y `landingStats` también
alimenta la landing.

### 17. Vista de historial de diagnósticos — ✅ resuelto 2026-08-29

La tabla `diagnostico` es append-only y guardaba varios por usuario, pero no
había dónde verlos. `/diagnostico/historial`, con sesión, los lista del más
reciente al más antiguo con su variación de puntaje y cuántos bloqueantes se
resolvieron desde el anterior.

**La variación solo se calcula contra el anterior de la MISMA versión.** Restar
el puntaje de dos cuestionarios distintos daría un número con aspecto de
progreso y sin significado: son escalas distintas sobre preguntas distintas.
Cubierto por test, y visible en pantalla — un historial mixto salta por encima
de la otra variante para encontrar su propio anterior.

De ahí salió `Cuestionario.etiqueta`: donde conviven variantes hay que poder
distinguirlas, y "8 preguntas · 3 minutos" no dice cuál es cuál.

---

## Decisión pendiente del usuario (no es bug)

### 11. Alcance de la regla "no perfilar usuarios"
¿Aplica a la infraestructura de cuentas/alertas de Fase 1 (`cuentas.ts`: perfil de oferente, email, hora de envío — con opt-in explícito, login y unsubscribe), o solo a tracking encubierto de visitantes anónimos? No tocar `cuentas.ts` ni `app/api/alertas/*` hasta aclarar.

---

## Deudas que dejó la alineación del home (2026-09-08)

Del plan `docs/superpowers/plans/2026-09-08-home-alineado-producto.md`.

### 18. Páginas legales `/terms` y `/privacy`
El pie del home las enlazaba sin que existieran como rutas — dos enlaces rotos
en producción, desde siempre. Se quitaron los enlaces al alinear el home. Falta
escribir las páginas y volver a enlazarlas desde `S6Footer.jsx`, añadiéndolas
antes a `src/components/landing/seccionesHome.js`: el pie resuelve cada `href`
por id contra ese catálogo y **lanza en build** si falta, que es justo lo que
impide que el enlace roto vuelva.

### 19. Pliegos y asistentes: cero uso y acceso sin resolver
`pliego_proceso`, `conversacion`, `mensaje` y `documento` están a 0 filas: el
extractor de pliegos y los dos asistentes nunca se han usado en producción. El
home ya no los vende como pilares — bajaron a la rejilla de intención marcados
«plan pro» — pero esa frontera todavía no la aplica ningún handler (ver
CLAUDE.md §4: `pliego_extraer` y `asistentes` están declaradas `pro` en
`politica.ts` y siguen protegidas solo por `PROTECTED_PREFIXES`).

Decidir el acceso a `GEMINI_API_KEY` por usuario antes de mandar tráfico ahí.

Y una lección de la revisión, que vale más que las dos anteriores: **el copy del
home hacía afirmaciones que el código no sostiene**, y las cazó la revisión, no
el plan. Dos ejemplos reales, ambos corregidos: se prometía que el asistente de
ejecución avisa «antes del vencimiento» de cada plazo (no existe cron ni
notificador; es un chat reactivo), y el hero mostraba `127` procesos nuevos y
`$4.2B` en juego, inventados, cuando `/api/landing-stats` ya devolvía los reales
— que resultaron ser 242 y $309.727 M. Antes de escribir una afirmación nueva en
el home, ábrase el módulo que la sostiene.

### 20. `LandingCards` se importa en el home y no se renderiza en ningún lado
`app/page.js` importa `LandingCards` desde
`src/components/landing/LandingCards.jsx` pero nunca la monta — el import
sobrevivió a la reescritura del home mientras el JSX que la usaba desapareció.
Verificado: `grep -rn "LandingCards" app src` solo encuentra el import, nada
que la renderice.

Eso significa que su `useLandingStats()` nunca corre, y las tres tarjetas que
sirve — procesos nuevos, valor en juego, proceso destacado, las mismas cifras
de `/api/landing-stats` que sí se muestran en la fila del hero — no aparecen en
ningún sitio del producto. No es solo un import muerto: es contenido real,
construido y con endpoint funcionando, que un usuario nunca ve.

Decidir entre dos caminos, no dejarlo a medias otra vez: (a) volver a montar
`LandingCards` en el home, en el lugar que le corresponda dentro del nuevo
orden de secciones, o (b) si las tarjetas ya no encajan en el diseño actual,
borrar el componente y recortar `/api/landing-stats` a lo que el hero sí
consume (`nuevos7d`, `enJuego.totalCop`, `sector`), en vez de mantener un
endpoint que sirve más de lo que nadie lee.

### 21. El aviso por correo, bajado a mención en el home — decidido 2026-09-10
El home alineado (2026-09-08) promovía la alerta diaria a uno de los cuatro
pasos del motor (`S3Motor.jsx`, paso 04) y la repetía en el cierre. El código de
alertas está terminado y probado — pero **en producción no entrega**, por la
misma pieza que bloquea el §0 de este documento: `AUTH_RESEND_KEY` no existe en
Vercel. Verificado el 2026-09-10 con `vercel env ls production`: sólo está
`RESEND_WEBHOOK_SECRET`.

No es un bug del home ni del motor: era una dependencia de orden. Se resolvió
por la segunda salida de las dos que planteaba esta nota — bajar el paso de
pilar a mención — para poder desplegar el home sin prometer una entrega que hoy
no ocurre:

- El motor pasa de cuatro pasos a tres. El cuarto sale de `PASOS`.
- En su lugar queda una frase que dice que el aviso está construido y se
  activará cuando el envío esté configurado, y que hasta entonces las
  coincidencias se consultan en el panel.
- El cierre (`S5DarkClosing.jsx`) deja de decir "y aviso diario".

**Al resolver el §0, revertir esto**: devolver el paso 04 a `PASOS` con su
`ruta("alertas")` y su CTA, quitar la frase de mención y su comentario, y
restaurar "aviso diario" en el cierre. La entrada del catálogo (`alertas` en
`seccionesHome.js`) y el enlace del pie se dejaron intactos justamente para que
la vuelta sea de un solo commit.

---

## Legibilidad del color (auditado el 2026-09-15)

Contexto: al decidir si se adoptaba la paleta crema del spec de rediseño se midió
el color de todo el producto. La decisión fue **conservar los valores actuales**
(`--bg:#FAFAF7`, `--accent:#0369A1`) y gastar el esfuerzo en lo que sí impedía
que la información llegara — ver `CLAUDE.md` §3. Lo que ya se hizo:

- Los tres semánticos bajaron al escalón -700 (`#15803D`, `#B45309`, `#B91C1C`).
  Los tres anteriores eran del escalón -600 y ninguno llegaba a AA como texto de
  11,5px, que es el tamaño al que se pintan las compuertas.
- Los 30 literales de esos colores repartidos por siete archivos se sustituyeron
  por sus tokens, así que ahora hay una sola fuente.
- Se añadieron los alias semánticos del spec (`--text-primary`, `--text-muted`,
  `--surface-elevated`, `--accent-deep`, `--border`) y se definió `--card`, que
  24 sitios usaban como `var(--card, #fff)` sin que existiera.
- `src/__tests__/design/contraste.test.ts` lee los tokens reales de
  `globals.css` y falla si el contraste baja. Antes no había ninguna prueba de
  color en las 23 carpetas del suite.

Lo que quedó abierto, en orden de impacto:

### 22. El segmento UNKNOWN de la barra de elegibilidad es invisible
`.clr-elig-seg--unknown` se pinta con `var(--line)` (`#E5E5E0`), que contra la
tarjeta blanca da **1,26:1** cuando un elemento no textual exige 3,0. En la barra
de cinco segmentos, UNKNOWN no se lee como un estado: se lee como pista vacía. Y
según los comentarios de `verdict.ts`, `habilitacion` es UNKNOWN casi siempre en
Nivel 0 — o sea que el estado más frecuente de la compuerta más importante se
dibuja como nada. Verificado a ojo en el navegador, no solo calculado.

No se arregla oscureciendo el token: se midió toda la familia de grises claros y
ninguno llega a 3,0 (`#A9AFA8` se queda en 2,24). Necesita contorno, trama o un
gris medio — es un rediseño del componente. **Va con la vitrina (Tarea 3 del
spec de rediseño), que es donde el semáforo se rehace de todos modos.**

### 23. La barra de cinco segmentos es solo color, sin texto
La lista de compuertas sí lleva glifo (`✓ ! ✕ ?`) junto al nombre, así que ahí el
color nunca viaja solo. La barra no. Y las luminancias del verde y el ámbar
difieren un 4%, así que para alguien con deuteranopia o protanopia PASS y WARN
son el mismo segmento. Incumple la regla 4 del spec de rediseño ("nunca un color
sin texto que lo explique"). Mismo destino que el §22.

### 24. `body` se pinta casi negro con el tema muerto
`app/globals.css` §body declara `background: var(--deep1)` (`#020C10`), `color:
var(--white)` y `font-family: var(--mono)` — los tres del tema oscuro
"cyberpunk" que se retiró con el dominio séptico. Cada página clara lo tapa con
su propio contenedor, así que hoy no se ve; verificado en `/`, `/cuenta` y
`/licitaciones/explorar`. Pero es una pantalla negra esperando a la primera
página que no cubra el viewport entero.

Arreglo probable: `background: var(--bg); color: var(--ink-900); font-family:
var(--font-sans)`. No se hizo aquí porque cambia el punto de partida visual de
todo el producto y merece su propia pasada de verificación, no ir de polizón en
un cambio de tokens.

### 25. `--ink-300` sobre `--surface-alt` está en 4,37:1
Por debajo de AA, y lo estaba antes de esta auditoría. Fijado como excepción
conocida en `contraste.test.ts` con su valor de hoy: no se puede empeorar sin
que el test lo diga. Se arregla oscureciendo `--ink-300` un paso (`#69726D` da
4,56 incluso sobre el crema del spec) cuando alguien toque esa superficie.

### 26. Restos del sistema de color, sin impacto visible
- **`LandingCards.jsx` es código muerto**: 11 KB que nadie importa, y es el único
  portador del marcado `clr-verdict-*`. Borrarlo con la Tarea 2.
- **`#DADAD2` aparece 20 veces sin ser token**, conviviendo con `--line`
  (`#E5E5E0`): hay dos grises de borde y ninguno lo sabe. Consolidar en
  `--border`, que ya existe y apunta a `--line`.
- **`PlantaHero.jsx` tiene 4 verdes `#16A34A` fuera del sistema** y cero tokens
  en todo el archivo. Es ilustración, no estado, así que se dejó; el spec lo
  mueve a `/nosotros` de todas formas.
- **Los tintes `rgba()` siguen derivados del escalón -600.** Al 10% la diferencia
  con el -700 es de 4 puntos RGB sobre 255 — imperceptible — y re-derivarlos
  tocaría 25 sitios en seis archivos sin que se note. El test comprueba que el
  texto se lee sobre ellos, que es lo que importa.

---

## Taxonomía de tipo de proyecto (Tarea 1, cerrada el 2026-09-15)

Hecho: `src/lib/classify/tipo-proyecto.ts` con los cinco valores como constante
compartida, 18 tests, columnas `proceso.tipo_proyecto{,_confianza,_segundo,_version}`
(`drizzle/0024`) y backfill de las 90.622 filas. Reparto: acueducto 31.498,
alcantarillado 12.225, ptar 7.712, ptap 5.577, otros 33.610.

### 27. Clasificador cableado en la ingesta — ✅ resuelto 2026-09-15
`batchUpsertProcesos` calcula el tipo en cada corrida vía `columnasTipoProyecto()`
(`writers.ts`), tanto al INSERT como en el `ON CONFLICT DO UPDATE`. Se reclasifica
siempre y no solo al insertar, porque el objeto y la descripción cambian con la
fase del proceso y subir `CLASIFICADOR_TIPO_VERSION` tiene que poder reclasificar
sin un backfill aparte. Verificado de punta a punta contra la base con una fila
sintética: el INSERT clasifica, el upsert reclasifica al cambiar el objeto, y la
fila se borró después.

Lo cubre `src/__tests__/transform/writers-upsert-completo.test.ts`, que además fija
el invariante que la cabecera de `writers.ts` declaraba sin comprobar: **toda
columna no-PK se reescribe en el UPDATE**, salvo seis excepciones documentadas.
Sin eso, una columna nueva podía quedarse fuera del upsert y congelarse con el
valor de la primera corrida para siempre.

Detalle que vale para futuros guardias de este tipo: la primera versión de esa
prueba buscaba `excluded.<columna>` con `includes()` y no detectaba nada, porque
`excluded.tipo_proyecto` es subcadena de `excluded.tipo_proyecto_confianza`. Es
el mismo fallo que tenía el clasificador con «colector» dentro de «recolector».
Se comprueba por palabra completa, y se verificó que la prueba falla al quitar
una columna del UPDATE.

### 28. 7.496 filas llevan una etiqueta elegida, no leída
Son los "acueducto y alcantarillado" genuinos —planes maestros, reposición
conjunta de redes— donde ambos tipos tienen la misma evidencia genérica. Forzar
cinco valores obliga a elegir, y hoy gana `acueducto` por orden de lista: es
determinista y está documentado, pero es una convención, no una lectura. El tipo
descartado se guarda en `tipo_proyecto_segundo` (15.697 filas en total lo tienen),
así que la ficha puede decir "también alcantarillado" sin perder el dato.

Cambiar la regla es barato: invertir el orden en `PRECEDENCIA`, subir
`CLASIFICADOR_TIPO_VERSION` y correr `npm run db:tipo-proyecto --todas`.

### 29. `otros` es el 35% de los procesos abiertos
12.332 de 35.222. La faceta "Por tipo de proyecto" de la Tarea 2 mostraría "Otros"
como la barra más larga. Es honesto —son procesos del sector sin subsistema
identificable en el objeto— pero hay que decidir cómo se presenta antes de
construir esa tarjeta: ordenar por conteo pondría el cajón primero.

### 30. El clasificador etiqueta el SUBSISTEMA, no la naturaleza del contrato
Un "suministro de tablero de baja tensión" para una PTAR sale como `ptar`, y es
defendible: el contrato es de esa planta. Pero el usuario que filtra por PTAR
espera obra de PTAR, no el tablero eléctrico. Hoy no existe un eje que separe
obra / suministro / servicio / interventoría, y añadirlo es una decisión de
producto, no un arreglo. Si la vitrina lo necesita, es un segundo campo derivado
con el mismo patrón que este.

### 31. `raw_record` ocupa 247 MB con los payloads ya vacíos — ~200 MB recuperables
Medido el 2026-09-15: 129.007 filas y **0 con payload**, porque `vaciarPayloads`
ya los borró. El espacio nunca se devolvió al disco: un `DELETE`/`UPDATE` en
Postgres marca la tupla muerta pero no encoge el archivo. La base está en 505 MB
contra el techo de 500 MB del plan Free de Supabase, así que esto no es cosmético.

Recuperarlo pide `VACUUM FULL raw_record`, que toma un lock exclusivo y bloquea la
ingesta mientras dura — por eso no se hizo sin decidirlo. Es la palanca más grande
que queda para la cuota, muy por encima de retirar índices.

**Aviso para cualquier backfill futuro:** un `UPDATE` masivo de `proceso` (138 MB
de datos) puede añadir otros 138 MB de tuplas muertas y tumbar la base. El
backfill de esta tarea creció **1 MB** en vez de 138 porque va en lotes de 2.000
con `VACUUM` cada 5 — el vacuum no devuelve espacio al disco, pero deja que el
lote siguiente reescriba encima. Copiar ese patrón, no inventar otro.

---

## Rediseño de la portada (Tarea 2, en curso desde el 2026-09-15)

Hecho hasta ahora: la capa de agregados (`src/lib/secop/agregados.ts`), la clase
de entidad (`clase-entidad.ts`), las rutas facetadas (`facetas.ts` + tres
familias de rutas), la fila densa compartida (`src/components/secop/lista/`),
`/precios`, la ilustración movida a `/nosotros` y la limpieza de navegación.

### 32. La portada sigue sin reconstruirse — bloqueada por el TopoJSON
`app/page.js` conserva sus diez secciones. El hero del rediseño es 5/12 de
mensaje y 7/12 de mapa departamental, y **no hay geometría en el repo**:
`data/dane/divipola.ts` es un crosswalk de nombres y códigos, `public/` solo
tiene un PNG. Decidido con el usuario el 2026-09-15: él aporta el TopoJSON, y
el mapa será **coropleta sin marcadores** — `geografia` no tiene coordenadas y
solo cubre 62 de los ~1.122 municipios, así que los puntos por municipio que
pedía el spec no se pueden pintar con datos reales.

Montar un hero provisional sin mapa significaría diseñarlo dos veces; por eso
está parado y no a medias.

### 33. El semáforo en la fila de la lista — ✅ resuelto 2026-09-15
`src/lib/secop/semaforo.ts` (modelo de vista puro) y
`src/components/secop/semaforo/` (pintura). Las rutas facetadas lo muestran en
las 25 filas de cada página.

**El quinto estado.** `verdict.ts` tiene cuatro —PASS, WARN, FAIL, UNKNOWN— y los
cuatro presuponen un perfil contra el que comparar. Sin perfil, que es como llega
cualquiera desde un buscador, pintar verde sería mentir: el verde dice "calificas",
no "el proceso es de acueducto". Se añadió `DATO`, la lectura ABSOLUTA que enuncia
lo que el proceso exige en cada eje sin juzgar a nadie. Ninguna compuerta sale en
PASS ni FAIL sin perfil, y hay un test que lo fija.

**Arregla de raíz el §22 en el componente nuevo:** el punto de "sin datos" usa
`--text-muted` (6,99:1 contra la tarjeta) y no `--border` (1,26:1). El componente
viejo —`clr-elig-seg--unknown` en `SecopExplorer`— sigue con el gris invisible; se
retira cuando la vitrina sustituya esa superficie.

**Dos diseños que probé y descarté por verlos en pantalla:**

1. La primera versión mostraba la palabra del estado en la fila densa, y salían
   cinco "EXIGE" seguidos: una columna entera para no decir nada. Ahora muestra el
   VALOR ("PTAR", "$50 M", "CESAR"), que es lo que distingue un proceso de otro.
2. Con el valor dentro, la fila decía **"$350 M" dos veces** —en la compuerta de
   cuantía y en su columna— y repetía zona y tipo. Se quitaron las columnas
   duplicadas y no el semáforo: el semáforo es lo que distingue al producto de un
   agregador, la columna era una cifra suelta. Eso desvía la fila del spec, que
   dibujaba cinco columnas; el motivo está escrito en la cabecera de
   `FilaProceso.tsx`, y cuando haya perfil la compuerta dirá el veredicto y la
   cifra podrá volver sin repetirse.

La fila mide 100px y no los 84 del spec: las cinco compuertas envuelven en tres
líneas dentro de sus 300px. Se deja así por legibilidad.

### 34. Ficha pública `/licitaciones/[slug]` — ✅ resuelta 2026-09-15
Existe, es pública e indexable, y las filas de las listas ya enlazan a ella. Con
`generateMetadata` (objeto + municipio + tipo), Schema.org `GovernmentService`,
canónica, `app/sitemap.ts` y `app/robots.ts` — el producto no tenía ninguno de
los dos.

Tres de sus nueve bloques salen con estado vacío honesto porque **no hay datos**:
requisitos del pliego, cronograma y documentos. Las cifras muestran 2 de 5. El
bloque de competidores sí tiene datos reales (27.035 registros históricos).

Queda de la Tarea 4: la versión **relativa** del semáforo (con perfil), el
**título global del sitio** y el **coste estimado de invocaciones** del ISR — las
tres las pedía el spec y no se hicieron.

### 35. La consulta por clase de entidad — ✅ resuelta 2026-09-15
Tardaba 2.612 ms: el `CASE` de expresiones regulares se evaluaba en el JOIN, una
vez por proceso (21.262 veces para ESP), cuando la clase depende solo de la
entidad. Pasado a subconsulta sobre `entidad` (4.223 filas): **363 ms**, con
totales idénticos.

Queda un resto medido y aceptado: el AGREGADO de la portada
(`procesosPorClaseEntidad`) sigue en ~800 ms. Ahí el mismo truco no sirve —se
probó, 884 ms contra 783, peor— porque hacen falta todas las clases de todos
modos y no hay nada que podar. Con ISR de 6 horas se paga una vez por ventana.

### 36. Formato del repo — ✅ resuelto 2026-09-15
Siete archivos ajenos a este trabajo no pasaban Prettier y el CI lo exige, así
que cualquier PR habría fallado antes de que nadie mirara el contenido. Se
formatearon: `db-search.ts`, `ProcesosTicker.jsx`, `S5DarkClosing.jsx`,
`app-url.test.ts`, `writers-campos.test.ts`, `corte-raw-record.ts` y
`rellenar-columnas.ts`. Son cambios solo de formato.

**El CI corre `npx prettier --check .` — el repo ENTERO, no solo `src/` y
`app/`.** Comprobarlo con un glob más estrecho da un falso verde: así se colaron
los dos de `scripts/`, que solo aparecieron cuando el PR ya estaba abierto.
Verificar con el mismo comando que el CI, no con uno parecido.

---

## Traspaso

El estado completo del rediseño —qué falta, qué lo bloquea, qué decisiones no hay
que deshacer y qué trampas tiene el entorno— está en
[docs/rediseno-2026-09/TRASPASO.md](docs/rediseno-2026-09/TRASPASO.md). Ese
documento es el punto de entrada para retomar el trabajo desde cero.

### 37. El PNG de la planta pesa 994 kB — el 57% de la portada actual
Medido en producción el 2026-09-15: `public/planta-tratamiento.png` son 994 kB de
los 1.753 kB que pesa la portada en móvil. El rediseño ya lo sacó de ahí —la
ilustración se movió a `/nosotros`— así que la portada nueva parte con casi un
mega menos, pero **el archivo sigue pesando lo mismo, solo que en otra página**.

Optimizarlo (WebP/AVIF, o `next/image` con `sizes`) es trabajo pendiente, y ahora
cuesta menos decidirlo porque afecta a una página secundaria y no a la puerta de
entrada.

De la misma medición: once archivos de fuente, 181 kB, de las cinco familias que
carga `layout.js`. Con la portada nueva conviene comprobar si se usan las cinco;
cada familia que sobre son 30-45 kB en la ruta crítica.

Lo demás de la portada en producción está bien: TTFB 36 ms, FCP y LCP 384 ms,
CLS 0. El margen está en el peso, no en el tiempo.
