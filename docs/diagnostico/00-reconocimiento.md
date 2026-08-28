# Diagnóstico de preparación para licitar — Fase 0: Reconocimiento

**Fecha:** 2026-08-27
**Alcance:** informe de reconocimiento previo a cualquier línea de código.
**Estado:** Gate 0 — pendiente de aprobación.

---

## 0. Resumen ejecutivo

El módulo encaja. No hay nada en el repo que impida construir `/diagnostico`
como ruta pública con persistencia propia en Postgres, y la cadena
"anónimo responde → ve resultado → se registra → sus respuestas alimentan el
semáforo" es viable con las piezas que ya existen.

Pero **seis premisas del prompt no coinciden con el repositorio real**. Cuatro
son cosméticas (nombres, stack), dos cambian el diseño del módulo:

1. **No existe el HTML de referencia.** `docs/referencia/diagnostico-referencia.html`
   no está, y no hay ningún archivo `*diagnostico*` en el repo. El prompt dice
   que es "la fuente de verdad del contenido" con las 10 preguntas, opciones,
   puntajes, textos de remedio y umbrales ya validados normativamente, y prohíbe
   inventarlos. **Sin ese archivo la Fase 1 no puede ejecutarse como está escrita.**
2. **Vitest ya está configurado y con 64 archivos de test.** El prompt asume que
   "el repo no tiene infraestructura de tests" y que este módulo "la estrena".
   No hay nada que configurar; hay una convención que seguir.
3. **No existen los patrones CQRS / Repository / DTO / Value Object.** El prompt
   dice que están "establecidos". No lo están: el repo es funcional y plano
   (`src/lib/<dominio>/*.ts`). Introducirlos aquí crearía una isla arquitectónica.
4. La base viva es **Supabase**, no Neon (aunque el driver siga siendo el de Neon).
5. La **paleta y las fuentes reales** no son las que el prompt describe.
6. El remote de git es `Lucesdata/hydrostack_agent`, no `Lucesdata/aqualicita`.

El detalle está en §7. Lo demás de este informe responde las seis preguntas de
la Fase 0.

---

## 1. Estructura de `app/` — rutas públicas vs. gateadas

`app/` mezcla `.js` (páginas de marketing/hub, heredadas) y `.tsx` (páginas de
producto con sesión). El `layout.js` raíz es un Server Component `async` que ya
resuelve el usuario de sesión y lo pasa al `Navbar`.

### Inventario de rutas

| Ruta | Archivo | Público | Gating |
|---|---|---|---|
| `/` | `app/page.js` | Sí | — |
| `/nosotros` | `app/nosotros/page.js` | Sí | — |
| `/soluciones` | `app/soluciones/page.tsx` | Sí | — |
| `/licitaciones` | `app/licitaciones/page.js` | Sí (ISR 300s) | — |
| `/licitaciones/explorar` | `.../explorar/page.js` | Sí | Patrón C (en componente) |
| `/licitaciones/descubrir` | `.../descubrir/page.js` | Sí | — |
| `/licitaciones/como-participar` | `.../como-participar/page.js` | Sí | — |
| `/mis-coincidencias` | `app/mis-coincidencias/page.tsx` | Sí, degradado | Patrón B (en página) |
| `/perfil` | `app/perfil/page.tsx` | Sí, degradado | Patrón B |
| `/pliego` | `app/pliego/page.tsx` | **No** | Patrón A (middleware) |
| `/cuenta` | `app/cuenta/page.tsx` | **No** | Patrón A |
| `/asistente/*` | `app/asistente/**/page.tsx` | **No** | Patrón A |
| `/login`, `/registro`, `/logout`, `/auth/callback` | — | Sí | — |

### Los tres patrones de auth gating

**Patrón A — redirect en middleware.** [`middleware.ts`](middleware.ts) mantiene
`PROTECTED_PREFIXES` (`/pliego`, `/api/pliego`, `/cuenta`, `/asistente`,
`/api/assistant`, `/api/documents`). Sin usuario → `307` a
`/login?next=<ruta>`. El propio docstring del archivo explica por qué
`/api/mercado/waitlist` **no** está ahí (un redirect de middleware convierte un
`fetch()` en un 200 con el HTML de login en vez del 401 esperado). Esa nota es
directamente relevante para nosotros: **el endpoint del diagnóstico anónimo no
puede pasar por el middleware.**

**Patrón B — chequeo en la página, con degradación.** `/mis-coincidencias`
(`page.tsx:161-186`) llama `getSessionUser()`; si no hay sesión no redirige,
renderiza un *teaser* con una estadística real (`getEnJuegoMes()`) y un CTA a
`/login?next=/mis-coincidencias`. Este es exactamente el patrón que pide la
Fase 3 ("conversión, sin muro"), pero invertido: nosotros mostramos el valor
completo y ofrecemos la cuenta para guardarlo.

**Patrón C — gate en el componente cliente.** `SecopExplorer` monta
`ProcessDetail` con `hasPerfil`; el botón dispara
`router.push("/login?next=/licitaciones")` (`SecopExplorer.tsx:441`). El
docstring del middleware lo llama por su nombre: "el resto del gating […] se
protege en el componente que dispara el flujo".

**Para `/diagnostico`:** ruta pública, sin tocar `PROTECTED_PREFIXES`. Su API
de escritura debe devolver JSON siempre (nunca redirect), como
`/api/mercado/waitlist`.

---

## 2. `OferenteWizard`: dónde vive, qué captura, cómo persiste

### Ubicación y forma
- Componente: [`src/components/secop/OferenteWizard.tsx`](src/components/secop/OferenteWizard.tsx) — `"use client"`, 4 pasos (`identidad`, `sectores`, `cobertura`, `cuantia`), CSS inline vía `<style dangerouslySetInnerHTML>`.
- Constructor puro: [`src/lib/oferente/wizard.ts`](src/lib/oferente/wizard.ts) — `buildOferenteProfile(answers)` + `SECTOR_OPTIONS` (4 familias UNSPSC: `83101` acueducto y alcantarillado, `72141` obra civil, `81101` ingeniería y consultoría, `77101` servicios ambientales) + `OFERENTE_LOCAL_ID = "oferente-local"`.

### Qué captura exactamente
`tipoPersona`, `sectoresUnspsc[]`, `departamentos[]` (DIVIPOLA 2 díg.),
`minCop`, `maxCop`. **Nada más.** `capacidadFinanciera` y
`kCapacidadResidualCop` quedan en placeholder — el propio docstring lo dice:
"Habilitación es Nivel 2 y SIEMPRE UNKNOWN en Nivel 0".

Hay un segundo wizard, [`RupWizard.tsx`](src/components/secop/RupWizard.tsx),
que sí captura experiencia e indicadores RUP; se abre desde `SecopExplorer`
cuando hay perfil base pero falta experiencia.

### Cómo persiste hoy — alcance exacto de localStorage

Hay **una sola clave**, y está blindada por test:

```
aqualicita_oferente_perfil   →  OferenteProfile (JSON)
```

Definida en [`src/lib/state/clientStore.ts`](src/lib/state/clientStore.ts) (`KEYS.oferentePerfil`),
con `getOferentePerfil` / `saveOferentePerfil` / `clearOferentePerfil`. El
test [`clientStore-keys.test.ts`](src/__tests__/state/clientStore-keys.test.ts)
fija el nombre de la clave; el docstring advierte que renombrarla ya exige
código de migración.

**localStorage no es la única fuente de verdad hoy.** `SecopExplorer` hace un
merge de tres vías al montar (`SecopExplorer.tsx:85-115`): lee local, hace
`GET /api/perfil`, y si hay perfil remoto lo baja a local; si solo hay local y
hay sesión, lo sube con `PUT /api/perfil`. Con sesión, la fuente de verdad es
la fila `oferente_perfil`. Sin sesión, localStorage es todo lo que hay.

### Quién lo consume
- `SecopExplorer.tsx` (único consumidor del `clientStore`) → `ProcessDetail` (semáforo) y `RupWizard`.
- `GET/PUT /api/perfil` → `oferente_perfil`.
- Server-side, sin pasar por localStorage: `/mis-coincidencias` y `/perfil` vía `getPerfilDb()`, y el cron de alertas.

---

## 3. Esquema Drizzle: dónde encaja `diagnosticos`

### Tablas de cuenta y perfil ([`src/lib/db/schema/cuentas.ts`](src/lib/db/schema/cuentas.ts))

```
usuario              id TEXT PK  ·  name, email UNIQUE, emailVerified, image
                     ↑ espejo local de auth.users.id de Supabase

oferente_perfil      id UUID PK · usuario_id TEXT FK→usuario (cascade)
                     perfil JSONB · actualizado_en
                     UNIQUE(usuario_id)          ← un perfil por cuenta

coincidencia         usuario_id FK · proceso_id TEXT · veredicto_overall · vista_en
alerta_preferencias  usuario_id PK FK · activo · hora_envio
envio_log            usuario_id FK · fecha · tipo · UNIQUE(usuario_id,fecha,tipo)
senal_usuario        usuario_id FK · senal TEXT · creado_en
```

Fuera de cuentas: `requisitos_proceso` (caché de requisitos por proceso, sin
`usuario_id` — describe el PROCESO, se comparte entre cuentas).

**Correcciones al DDL propuesto en el prompt:**
- La tabla se llama **`usuario`** (singular), no `usuarios`.
- **`usuario.id` es `text`, no `uuid`.** La FK debe ser `text("usuario_id").references(() => usuario.id, { onDelete: "cascade" })`.
- Convención de nombres del repo: columnas en `snake_case` en SQL, propiedad en `camelCase` en TS (`usuarioId`, `creadoEn`). El prompt mezcla `created_at`/`claimed_at`; el repo usa `creado_en` en tablas nuevas de cuenta (`coincidencia`, `senal_usuario`) y `created_at` solo en `alerta_preferencias`. Propongo `creado_en` / `reclamado_en`.
- **Toda tabla nueva debe llevar `.enableRLS()`** — las 22 tablas de `public` lo tienen desde `drizzle/0014` (2026-08-26) y CLAUDE.md §4 exige que ninguna migración futura lo deshaga. Una tabla nueva sin RLS quedaría expuesta a la Data API con el anon key público.
- La migración sería `drizzle/0015_*.sql`, generada con `npm run db:generate`.

### Relación con el perfil mínimo de `/mis-coincidencias`

**No hay duplicación si `diagnosticos` no toca `oferente_perfil`.** El perfil
mínimo (Sector + Zona) vive en la **misma fila y misma columna jsonb** que el
perfil completo: `PerfilMinimo` y `OferenteProfile` se discriminan en runtime
por presencia de `cuantiaObjetivo` (`isPerfilCompleto()` en
[`perfil-minimo.ts`](src/lib/oferente/perfil-minimo.ts)). El docstring es
explícito: "no hay tabla ni columna nueva, solo una forma más chica del mismo
campo".

La separación limpia es:

- `diagnosticos` = **el hecho declarado**, inmutable, versionado, histórico (N filas por usuario).
- `oferente_perfil` = **el perfil vigente** que consumen matching y semáforo (1 fila por usuario).

El paso 2 de la Fase 4 (prellenar el perfil mínimo) es entonces una
**proyección** de la fila de diagnóstico más reciente sobre
`savePerfilMinimoDb()`, no una escritura doble. Ojo con una decisión que hay
que tomar en Fase 2: si el usuario ya tiene un `OferenteProfile` completo,
prellenar con un `PerfilMinimo` lo **degradaría** (se perderían
`cuantiaObjetivo` y `capacidadFinanciera`). Regla propuesta: el diagnóstico
solo escribe el perfil si no existe fila, o si la existente es mínima.

---

## 4. El semáforo de `/licitaciones` y de dónde sale cada indicador

### Dónde vive
- Lógica: [`src/lib/secop/verdict.ts`](src/lib/secop/verdict.ts) (24 KB, sin I/O, puro).
- UI: [`src/components/secop/ProcessDetail.tsx`](src/components/secop/ProcessDetail.tsx) (`clr-elig-*`), montado por `SecopExplorer` en **`/licitaciones/explorar`** — no en `/licitaciones`, que es solo `ProcesosRecientes` con ISR.
- Endpoint: `POST /api/secop/verdict`, on-demand.
- Versión compacta ("N/5 compuertas"): `verdictScore()` en `src/components/secop/format.ts`, usada en `/mis-coincidencias`.

### Contrato

`GateStatus = "PASS" | "WARN" | "FAIL" | "UNKNOWN"` (verde / ámbar / rojo / gris).
`GateResult = { status, reason, resolvedBy: "metadata"|"document", requiredLevel: 0|2 }`.
Agregación D6 (`aggregateGateStatuses`): worst-of sobre las compuertas
resueltas; las `UNKNOWN` no fuerzan rojo; si todas son `UNKNOWN` → `UNKNOWN`.

### Las cinco compuertas

| Compuerta | Nivel | Insumo del oferente | Insumo del proceso |
|---|---|---|---|
| `sectorial` | 0 | `perfil.sectoresUnspsc` | UNSPSC del proceso; fallback `clasificacion_sectorial.sector_agua` (D2) |
| `cuantia` | 0 | `perfil.cuantiaObjetivo` | `precioBase` / `valorAdjudicacion`, banda ±20 % |
| `plazo` | 0 parcial | — | `estadoApertura`; `fechaCierre` es `null` en N0 (vive en el pliego) |
| `ubicacion` | 0 | `perfil.cobertura` | `departamento` / `ciudad` normalizados vía DIVIPOLA |
| **`habilitacion`** | **2** | `perfil.experiencia[]` + `perfil.capacidadFinanciera` | `requisitos_proceso.requisitos` (extraídos del pliego) |

### El hueco que el diagnóstico llena — y el que no

El prompt afirma que HABILITACIÓN "no tiene fuente de datos". Es **medio
cierto y conviene precisarlo**, porque cambia el diseño de la Fase 4:

`habilitacionGate` necesita **dos** insumos y hoy fallan los dos por separado:

1. **Lado oferente** (`p.experiencia`, `p.capacidadFinanciera`): existe en el
   tipo y lo captura `RupWizard`, pero `buildOferenteProfile` lo deja en
   placeholder, así que en la práctica casi nunca hay datos. **Esto sí lo
   llena el diagnóstico.**
2. **Lado proceso** (`proc.requisitosHabilitantes`): si es `null`, la compuerta
   devuelve `UNKNOWN` **antes de mirar el perfil** (`verdict.ts:452-461`).
   Esto no lo llena el diagnóstico: depende de que alguien cargue el pliego.

**Consecuencia dura para la Fase 4:** con el contrato actual, un usuario con
diagnóstico seguirá viendo HABILITACIÓN en gris en todo proceso sin pliego
extraído. La regla que pide el prompt — "si el proceso exige RUP y el usuario
no lo tiene vigente, rojo con motivo explícito" — **no cabe dentro de
`habilitacionGate` sin romper la invariante D18** que el archivo declara en su
cabecera: *"una compuerta con `requiredLevel: 2` DEBE devolver `UNKNOWN` en
Nivel 0. Ninguna compuerta documental puede pintar verde/rojo sin el pliego."*

Tres salidas, a decidir en Gate 1 o antes de la Fase 4:

- **(a)** Un *bloqueante de perfil* fuera del semáforo: si el RUP no está
  vigente, se muestra un aviso a nivel de cuenta ("tu RUP vencido te bloquea en
  todo proceso que lo exija"), sin tocar `verdict.ts`. Respeta la invariante y
  no requiere pliego. **Es mi recomendación.**
- **(b)** Extender `RequisitosHabilitantesEstructurados` con `exige_rup` y dejar
  que la compuerta falle en rojo solo cuando hay pliego. Correcto pero solo
  aplica a procesos con pliego cargado.
- **(c)** Cambiar la invariante D18. No lo recomiendo: es la defensa contra
  alucinación sobre documentos y está protegida por tests.

Lo que el diagnóstico **sí** entrega hoy, sin fricción: alimentar
`sectorial`, `cuantia` y `ubicacion` con datos reales (hoy vacíos para todo
usuario sin wizard), y poblar `experiencia` + `capacidadFinanciera` para que
`habilitacion` deje de caer en `WARN` "no declaraste este dato en tu perfil"
cuando sí hay pliego.

---

## 5. Tokens de diseño

Todo en [`app/globals.css`](app/globals.css) (1411 líneas). Un solo `:root` con
**dos sistemas conviviendo**, documentado en un comentario largo al inicio:

- Tema oscuro "cyberpunk" (`--cyan`, `--deep1`, `--mono`, `--orb`) — legado del dominio séptico deprecado. **No usar.**
- Tema claro "clear" (`--bg`, `--ink-*`, `--accent`, `--font-*`, clases `clr-*`) — el sistema vigente. **Este es el nuestro.**

Ojo: `body` sigue con el tema oscuro (`background: var(--deep1)`), así que cada
página clara pinta su propio fondo (`min-height: 100vh; background: var(--bg)`).

### Valores reales (≠ los del prompt)

| Token | Valor real | El prompt dice |
|---|---|---|
| `--bg` | `#FAFAF7` | crema `#F7F5EF` |
| `--surface` | `#FFFFFF` | — |
| `--accent` | `#0369A1` | `#1D6FA5` |
| `--accent-ocean` | `#0C4A6E` | `#134D74` |
| `--accent-river` | `#7DD3FC` | — |
| `--ink-900 / 600 / 300` | `#0A1F1C` / `#525B5A` / `#6B746F` | — |
| `--line` | `#E5E5E0` | — |
| `--success / warning / danger` | `#16A34A` / `#D97706` / `#DC2626` | — |
| `--font-sans` (cuerpo) | **Inter** | Inter ✓ |
| `--font-mono` (datos) | **JetBrains Mono** | IBM Plex Mono ✗ |
| Titulares | **IBM Plex Sans Condensed**, solo hero | "en titulares" |

También hay escala tipográfica (`--fs-xs`…`--fs-hero`), espaciado 4pt
(`--space-1`…`--space-section`), radios, `--focus-ring`, y anchos
(`--container: 1100px`, `--container-narrow: 760px`).

Ya existen globalmente, sin que haya que escribirlos: `*:focus-visible` con
anillo de 2px, y un bloque `@media (prefers-reduced-motion: reduce)`.

### Componentes reutilizables

**No hay librería de componentes.** El patrón real: cada componente lleva su
CSS en una constante `STYLE`/`CSS` inyectada con
`<style dangerouslySetInnerHTML={{ __html: STYLE }} />`, con clases
prefijadas por componente (`clr-mc-*`, `clr-szs-*`, `clr-wiz-*`, `clr-elig-*`,
`clr-auth-*`). Solo el navbar y las tarjetas de hub (`.clr-card`) viven en
`globals.css`.

**Sobre el "componente de tarjeta glassmorphism con esquinas de bracket":**

- Las **esquinas de bracket sí existen**, en
  [`AuthCard.tsx`](src/components/auth/AuthCard.tsx): cuatro `<span>` absolutos
  con dos bordes de 2px en `var(--accent)`, sobre una tarjeta de `var(--surface)`
  con borde de 1px. Viene con una etiqueta `Fig. NN —` en mono, mayúsculas y
  `letter-spacing: .12em`. El docstring lo llama "plano de ingeniería".
- El **glassmorphism no existe** en el tema claro. Los dos únicos
  `backdrop-filter` del archivo son del menú móvil oscuro (línea 644) y uno
  puesto en `none` (línea 738). `.clr-card` y `.clr-auth-card` son opacos.
- Hay una convención tipográfica de brackets literales en los botones:
  `[ Crear cuenta ]`.

Recomendación: reusar `AuthCard` (o extraer su shell) para la portada y el
resultado del diagnóstico. Es el componente más cercano a lo que pide el
prompt, y ya está en el sistema. **No introducir glassmorphism**: sería
inventar un estilo que la plataforma no tiene, y rompería el criterio de
aceptación "la página no se distingue del resto de AquaLicita".

---

## 6. Infraestructura de tests

**Existe, y es sustancial.**

- [`vitest.config.ts`](vitest.config.ts): `globals: true`, `environment: "node"`, alias `@` → raíz, excluye worktrees y artefactos de build.
- Scripts: `npm test` (`vitest run`) y `npm run test:watch`. `@vitest/coverage-v8` instalado; hay un directorio `coverage/`.
- **64 archivos de test** en `src/__tests__/`, organizados por dominio (`secop/`, `oferente/`, `matching/`, `ingest/`, `api/`, `alertas/`, `pliego/`…).
- Convención: espejo del árbol de `src/lib/`, un archivo por módulo, `describe`/`it` en español.
- Referencias directas para nosotros: [`verdict.test.ts`](src/__tests__/secop/verdict.test.ts) (cómo se testea una función pura de compuertas, con constructores de fixtures), [`wizard.test.ts`](src/__tests__/oferente/wizard.test.ts), [`perfil-store.test.ts`](src/__tests__/oferente/perfil-store.test.ts) (cómo se mockea la DB), [`perfil-route.test.ts`](src/__tests__/api/perfil-route.test.ts) (cómo se testea un route handler).

No hay tests de componentes React (no hay `@testing-library`), ni E2E, ni
`jsdom`. El entorno es `node`; `clientStore-keys.test.ts` monta un
`localStorage` mínimo a mano cuando lo necesita.

**Corrección al plan:** la Fase 1 no "estrena" la infraestructura de tests. La
hereda. Lo que sí hay que hacer es seguir la convención existente, no crear una
nueva. Y si se quiere test de UI habría que añadir `jsdom` +
`@testing-library/react`, que sería infraestructura nueva de verdad — decidir
si entra en alcance.

---

## 7. Contradicciones entre el prompt y el repositorio

Ordenadas por impacto.

### 7.1 — BLOQUEANTE: el HTML de referencia no existe

El prompt instruye copiar `diagnostico-licitar-apsb.html` a
`docs/referencia/diagnostico-referencia.html` **antes** de ejecutar. Ni el
archivo ni el directorio `docs/referencia/` existen, y una búsqueda por
`*diagnostico*` en todo el repo (excluyendo `node_modules` y `.git`) no
devuelve nada.

Ese archivo es, según el propio prompt, la fuente de verdad de: las 10
preguntas, sus opciones, los puntajes, los flags, los textos de remedio, los
umbrales de veredicto (78 / 58 / 35) y los criterios de escalón. El prompt
prohíbe explícitamente inventarlos o "mejorarlos".

**La Fase 1 no puede ejecutarse hasta que ese archivo esté en el repo.** Todo
lo demás (esquema, motor puro, comandos, UI) puede diseñarse alrededor de un
contrato de tipos, pero el contenido de `co-apsb-v1.ts` es un copiado literal
que no tengo de dónde copiar.

### 7.2 — Los patrones "establecidos" no existen

El prompt dice: "Patrones establecidos: repositories, DTOs, Value Objects,
CQRS". Búsqueda de `Repository|Command|CQRS|DTO` en `src/`: **dos resultados,
ambos falsos positivos** (`recientes.ts` y su test).

Lo que hay es un repo funcional y plano: `src/lib/<dominio>/` con funciones
exportadas, interfaces TS planas sin clases, sin zod (la convención declarada
en `oferente/types.ts` es "guard puro `parseX`, no un validador externo"),
acceso a datos con Drizzle directo en módulos `*-store.ts`, y Server Actions
para mutaciones desde formularios.

Construir `DiagnosticoRepository` + `CalcularDiagnosticoCommand` +
`NivelPreparacion` como Value Object crearía una isla arquitectónica de un solo
módulo en un repo que no la tiene en ningún otro sitio. Recomiendo la
traducción natural, que preserva todas las propiedades que el prompt busca
(pureza, frontera explícita, testabilidad) sin el andamiaje:

| Pedido en el prompt | Equivalente idiomático del repo |
|---|---|
| VOs `NivelPreparacion`, `EscalonContratacion`, `EstadoRup`, `Bloqueante` | Union types + funciones puras en `src/lib/diagnostico/types.ts` (igual que `GateStatus`, `PerfilMinimo`) |
| `DiagnosticoRepository` (interfaz + impl Drizzle) | `src/lib/diagnostico/diagnostico-store.ts` (igual que `perfil-store.ts`) |
| `CalcularDiagnosticoCommand` | `calcularDiagnostico()` puro + `guardarDiagnostico()` en el store |
| `ReclamarDiagnosticoCommand` | `reclamarDiagnostico(sessionToken, usuarioId)` en el store |
| `Obtener*Query` | `getDiagnosticoVigente()`, `getPerfilHabilitacion()` |
| "DTOs explícitos en la frontera" | Ya es la norma: las páginas son Server Components y los tipos de frontera son interfaces planas |

**Esta es una decisión tuya, no mía.** Si prefieres el andamiaje CQRS explícito
lo construyo tal cual está escrito; solo dejo constancia de que sería el único
módulo del repo con esa forma.

### 7.3 — Vitest ya existe

Ver §6. El prompt dice "el repo no tiene infraestructura de tests, este módulo
la estrena: configura Vitest". Ya está configurado, con 64 archivos de test.
El Gate 1 sigue siendo válido tal cual (motor puro + tests verdes de las cuatro
bandas, los tres escalones y el orden hard-antes-que-soft); solo cambia que no
hay setup que hacer.

### 7.4 — Neon vs. Supabase

El prompt dice "Neon Postgres con Drizzle ORM, Supabase Auth". La realidad
(CLAUDE.md §3, migración del 2026-08-15 verificada el 2026-08-26): **la base
viva es Supabase**; `DATABASE_URL` apunta a `aws-1-eu-west-1.pooler.supabase.com`.
El driver sigue siendo `@neondatabase/serverless` sobre WebSocket (funciona
contra cualquier Postgres), y varios docstrings todavía dicen "Neon" — son
residuo. `DATABASE_URL_UNPOOLED` apunta a Neon y hoy responde "exceeded the
data transfer quota"; no usarlo.

Consecuencia práctica: **toda tabla nueva necesita `.enableRLS()`** (§3).

### 7.5 — Paleta y tipografía

Ver la tabla de §5. Ninguno de los tres colores que el prompt nombra es el que
está en `globals.css`, y la fuente mono real es JetBrains Mono, no IBM Plex
Mono. Usaré los tokens reales. También: el glassmorphism no existe en el tema
claro; las esquinas de bracket sí (`AuthCard`).

### 7.6 — Menores

- **Remote:** `git@github.com:Lucesdata/hydrostack_agent.git`, no `Lucesdata/aqualicita`. El repo se renombró como producto (`package.json` ya dice `aqualicita`) pero el remote no.
- **`tasks/` no existe.** El entregable final (`tasks/lessons.md`) crearía un directorio nuevo en la raíz. Sugiero `docs/diagnostico/99-lecciones.md`, coherente con este informe. Dímelo si prefieres la ruta original.
- **España / OpenPLACSP no existe en el repo.** El prompt lo menciona en el contexto; no hay ni rastro de esa integración. Ya está fuera de alcance, solo lo anoto para que no se asuma que existe.
- **`/licitaciones` no muestra el semáforo.** Lo muestra `/licitaciones/explorar`. Los criterios de aceptación dicen "el semáforo de `/licitaciones`"; asumo que se refiere a `/licitaciones/explorar` (+ el score compacto de `/mis-coincidencias`), que es donde vive.

---

## 8. Lo que propongo construir (para aprobar o corregir en Gate 0)

```
src/lib/diagnostico/
  types.ts                     union types + interfaces de frontera
  cuestionario/co-apsb-v1.ts   contenido versionado  ← BLOQUEADO por §7.1
  calcular.ts                  calcularDiagnostico(respuestas) → Resultado  [PURO]
  diagnostico-store.ts         Drizzle: guardar / reclamar / vigente
  perfil-habilitacion.ts       proyección diagnóstico → insumo del semáforo
  session-token.ts             cookie httpOnly del diagnóstico anónimo
src/lib/db/schema/diagnostico.ts   tabla + .enableRLS()
src/components/diagnostico/        Portada · Cuestionario · Resultado · Medidor
app/diagnostico/page.tsx           ruta pública
app/api/diagnostico/route.ts       POST, siempre JSON, fuera del middleware
src/__tests__/diagnostico/         calcular.test.ts, store, proyección
drizzle/0015_*.sql                 generada con npm run db:generate
```

**Preguntas abiertas que necesito resueltas antes de avanzar:**

1. **§7.1 — ¿dónde está el HTML de referencia?** Sin él la Fase 1 está bloqueada en el contenido (el esquema y el motor sí pueden diseñarse contra tipos).
2. **§7.2 — ¿CQRS explícito o el estilo funcional del repo?** Recomiendo el segundo.
3. **§4 — ¿regla (a), (b) o (c) para el indicador HABILITACIÓN?** Recomiendo (a): bloqueante de perfil fuera del semáforo, sin tocar la invariante D18.
4. **§3 — ¿confirmas que el prellenado no debe degradar un `OferenteProfile` completo a `PerfilMinimo`?**
5. **§7.6 — ¿`tasks/lessons.md` o `docs/diagnostico/99-lecciones.md`?**

---

**Gate 0. Me detengo aquí.** No he tocado código, esquema ni configuración —
este archivo es el único cambio en el repositorio.
