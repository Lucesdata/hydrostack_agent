# Módulo Diagnóstico de preparación para licitar — Spec de implementación

**Versión:** 2 — reescrita sobre el reconocimiento de Fase 0.
**Fecha:** 2026-08-27
**Sustituye a:** el prompt original. Donde el prompt original y este documento
difieran, manda este documento: el original describía un repositorio que no es
el que tenemos (ver [00-reconocimiento.md](00-reconocimiento.md) §7).

**Principio rector de esta reescritura:** lo que importa es **la operación del
diagnóstico** — que el cuestionario se responda, se calcule bien, se persista,
se reclame tras el registro y alimente el semáforo. **El diseño se adapta a lo
que AquaLicita ya tiene.** No se introduce ni un token, ni un patrón
arquitectónico, ni una dependencia que el repo no use hoy.

---

## 1. Contexto real del repositorio

| | Real | Lo que decía el prompt original |
|---|---|---|
| Framework | Next.js 14.2.3 App Router + React 18 | ✓ |
| Base de datos | **Postgres de Supabase** vía Drizzle (driver `@neondatabase/serverless` sobre WS) | "Neon Postgres" |
| Auth | Supabase Auth (`@supabase/ssr`), email/password + Google | ✓ |
| Tests | **Vitest ya configurado, 64 archivos** en `src/__tests__/` | "no hay infraestructura de tests" |
| Arquitectura | **Funcional y plana**: `src/lib/<dominio>/*.ts`, interfaces TS sin clases, sin zod, stores Drizzle directos, Server Actions | "repositories, DTOs, Value Objects, CQRS" |
| Remote | `Lucesdata/hydrostack_agent` | `Lucesdata/aqualicita` |
| España / OpenPLACSP | **no existe en el repo** | mencionado como si existiera |

---

## 2. Por qué este módulo importa (precisado)

Las respuestas del diagnóstico son el **perfil de habilitación del oferente**.
Eso sigue siendo cierto y es el objetivo real. Pero el hueco que llena es más
preciso de lo que decía el prompt original, y esa precisión cambia la Fase 4.

`habilitacionGate` ([`src/lib/secop/verdict.ts:451`](../../src/lib/secop/verdict.ts))
necesita **dos** insumos:

1. **Lado oferente** — `perfil.experiencia[]` y `perfil.capacidadFinanciera`.
   Existen en el tipo, los captura `RupWizard`, pero `buildOferenteProfile` los
   deja en placeholder: en la práctica casi ningún usuario los tiene.
   **Esto sí lo llena el diagnóstico.**
2. **Lado proceso** — `proc.requisitosHabilitantes`, extraído del pliego. Si es
   `null`, la compuerta devuelve `UNKNOWN` **antes de mirar el perfil**.
   **Esto no lo llena el diagnóstico**; depende de que alguien cargue el pliego.

Además, `verdict.ts` declara en su cabecera la **invariante D18**: *"una
compuerta con `requiredLevel: 2` DEBE devolver `UNKNOWN` en Nivel 0. Ninguna
compuerta documental puede pintar verde/rojo sin el pliego."* Está protegida
por tests. La regla "RUP no vigente → rojo" **no cabe dentro de
`habilitacionGate`** sin romperla.

**Decisión tomada (recomendación de Fase 0, opción (a)):** el estado del RUP se
expone como **bloqueante de perfil, fuera del semáforo**. Ver §6.3.

Lo que el diagnóstico entrega desde el día uno, sin tocar `verdict.ts`:

- Alimenta `sectorial`, `cuantia` y `ubicacion` con datos reales — hoy vacíos para todo usuario que no pasó por el wizard.
- Puebla `experiencia` + `capacidadFinanciera` para que `habilitacion` deje de caer en `WARN` "no declaraste este dato en tu perfil" cuando sí hay pliego.
- Es la puerta de entrada: anónimo responde → ve su resultado → se registra para guardarlo y recibir coincidencias → sus respuestas se vuelven su perfil.

---

## 3. Contenido del cuestionario — RESUELTO

El HTML de referencia llegó el 2026-08-27 y está en el repo:
[`docs/referencia/diagnostico-referencia.html`](../referencia/diagnostico-referencia.html)
(sha256 `18aefae5…6fb33e`). Es la fuente de verdad de los textos literales.

Las reglas de cálculo extraídas, la matriz de puntajes y flags, y tres
hallazgos que requieren decisión están en
[`02-cuestionario-co-apsb-v1.md`](02-cuestionario-co-apsb-v1.md).

**Sin bloqueos.** Las tres decisiones abiertas se cerraron el 2026-08-27
(§5 de ese documento): el puntaje y las bandas quedan intactos y un bloqueante
absoluto (`antec_mal`, `pila_mora`) sobreescribe el titular del veredicto sin
tocar el número.

**§4 de ese documento corrigió la Fase 4 de esta spec**, y la corrección está
aplicada abajo: el cuestionario es cualitativo y no captura códigos UNSPSC,
zona, cuantía, indicadores financieros ni contratos de experiencia, así que no
puede poblar `capacidadFinanciera` ni `experiencia`.

---

## 4. Restricciones duras (reescritas)

1. **No refactorizar lo existente.** Se añaden tablas, módulos y rutas. No se
   modifican `verdict.ts`, `oferente_perfil`, el cron de ingesta, el extractor
   de pliegos, ni las rutas existentes más allá del enlace de entrada.
2. **Nada en localStorage como fuente de verdad.** El diagnóstico anónimo usa
   una **cookie httpOnly de sesión** para poder reclamarlo tras el registro; las
   respuestas se persisten en Postgres desde el primer envío. No se toca
   `clientStore.ts` (su única clave, `aqualicita_oferente_perfil`, está fijada
   por test y renombrarla exige migración).
3. **Sin IA en el cálculo.** `calcularDiagnostico` es una función pura de las
   respuestas. Ninguna llamada a Anthropic ni a Gemini en esta ruta.
4. **Estilo del repo, no andamiaje nuevo.** Sin clases, sin zod, sin
   Repository/Command/VO. Ver §5.
5. **Toda tabla nueva lleva `.enableRLS()`** en el esquema Drizzle. Las 22
   tablas de `public` lo tienen desde `drizzle/0014` (2026-08-26); una tabla sin
   RLS quedaría expuesta a la Data API de Supabase con el anon key público, que
   viaja en el bundle del navegador. Ver CLAUDE.md §4.
6. **El endpoint del diagnóstico anónimo no pasa por el middleware.** Un
   redirect de middleware convierte un `fetch()` en un 200 con el HTML de login
   en vez del 401 esperado — está documentado en el docstring de
   [`middleware.ts`](../../middleware.ts) a raíz de `/api/mercado/waitlist`.
   `/api/diagnostico` devuelve JSON siempre.
7. **Sistema de diseño real de AquaLicita.** Tokens de
   [`app/globals.css`](../../app/globals.css), tema claro `clr-*`. Ver §7.1.
   Se descarta la paleta del prototipo **y también los valores que citaba el
   prompt original, que tampoco eran los del repo.**
8. **Coherencia de CTAs.** El usuario es el sujeto que actúa, nunca la
   herramienta: "Descubre qué te falta", no "Te decimos qué te falta".
9. **Un solo veredicto agregado está permitido aquí**, a diferencia de la regla
   de `/licitaciones`: esa regla evita alucinar sobre documentos extraídos, y
   aquí los datos los declara el propio usuario sobre su empresa. Aun así el
   resultado muestra el desglose por categoría, no solo el número.

---

## 5. Traducción arquitectónica

El prompt original pedía CQRS. El repo no lo tiene en ningún módulo. Se traduce
al estilo real, preservando las propiedades que se buscaban (pureza, frontera
explícita, testabilidad):

| Pedido original | Equivalente en este repo | Precedente a imitar |
|---|---|---|
| VO `NivelPreparacion`, `EscalonContratacion`, `EstadoRup`, `Bloqueante` | Union types + funciones puras en `types.ts` | `GateStatus`, `PerfilMinimo` |
| `DiagnosticoRepository` (interfaz + impl) | `diagnostico-store.ts` | [`perfil-store.ts`](../../src/lib/oferente/perfil-store.ts) |
| `CalcularDiagnosticoCommand` | `calcularDiagnostico()` puro + `guardarDiagnostico()` | `buildVerdict()` + store |
| `ReclamarDiagnosticoCommand` | `reclamarDiagnostico(sessionToken, usuarioId)` | `syncUsuario()` |
| `ObtenerDiagnosticoVigenteQuery` | `getDiagnosticoVigente(usuarioId)` | `getPerfilDb()` |
| `ObtenerPerfilHabilitacionQuery` | `getPerfilHabilitacion(usuarioId)` en `perfil-habilitacion.ts` | `getMatchesForPerfil()` |
| "DTOs explícitos en la frontera" | Ya es la norma: interfaces planas, páginas como Server Components | `oferente/types.ts` |

**Invariante que sí se conserva del original:** el cálculo es puro y no hace
I/O, igual que `verdict.ts`. El store es el único módulo que conoce la forma de
la fila.

---

## 6. Fases

### Fase 1 — Dominio y persistencia

**Árbol a crear:**

```
src/lib/diagnostico/
  types.ts                      union types + interfaces de frontera
  cuestionario/co-apsb-v1.ts    contenido versionado     ← requiere §3
  calcular.ts                   calcularDiagnostico()    [PURO, sin I/O]
  diagnostico-store.ts          Drizzle: guardar · reclamar · vigente
  session-token.ts              cookie httpOnly del diagnóstico anónimo
src/lib/db/schema/diagnostico.ts
drizzle/0015_*.sql              generada con `npm run db:generate`
```

**Tipos** (en `types.ts`, sin clases):

```ts
/** 0–100. La banda se deriva, no se almacena. */
export type PuntajeTotal = number;
export type BandaPreparacion = "listo" | "casi" | "en_camino" | "inicio";
export type EscalonContratacion = "minima_cuantia" | "menor_cuantia" | "licitacion_publica";
export type EstadoRup = "vigente" | "sin_renovar" | "no_inscrito" | "desconocido";
export type SeveridadBloqueante = "hard" | "soft";
export interface Bloqueante { id: string; severidad: SeveridadBloqueante; /* … */ }
```

`bandaDePuntaje(p)`: `listo` ≥78, `casi` ≥58, `en_camino` ≥35, `inicio` <35.
La validación de rango es un guard puro (`esPuntajeValido`), no una clase con
invariante en el constructor — misma convención que
[`validate.ts`](../../src/lib/oferente/validate.ts).

**Esquema Drizzle** — corregido contra el real:

```ts
export const diagnostico = pgTable("diagnostico", {
  id:            uuid("id").defaultRandom().primaryKey(),
  usuarioId:     text("usuario_id").references(() => usuario.id, { onDelete: "cascade" }),
  sessionToken:  text("session_token"),
  version:       text("version").notNull(),          // "co-apsb-v1"
  respuestas:    jsonb("respuestas").notNull(),
  puntajeTotal:  integer("puntaje_total").notNull(),
  puntajeAreas:  jsonb("puntaje_areas").notNull(),
  escalon:       text("escalon").notNull(),
  bloqueantes:   text("bloqueantes").array().notNull(),
  creadoEn:      timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
  reclamadoEn:   timestamp("reclamado_en", { withTimezone: true }),
}, (t) => [
  index("diagnostico_usuario_idx").on(t.usuarioId, t.creadoEn),
  index("diagnostico_session_idx").on(t.sessionToken),
]).enableRLS();
```

Diferencias con el DDL del prompt original, todas obligadas por el repo:

- La tabla de usuarios se llama **`usuario`** (singular) y su **`id` es `text`**, no `uuid` — es el UUID que emite Supabase Auth, guardado como texto. La FK debe ser `text`.
- Nombres en español: `creado_en` / `reclamado_en`, como `coincidencia` y `senal_usuario`.
- `.enableRLS()` obligatorio.
- `escalon` y `bloqueantes` van como `text`, no enum: agregar valores no debe pedir migración (misma razón que `contrato_evento.tipo_evento` y `envio_log.tipo`).

Un usuario puede tener varios diagnósticos; **el vigente es el más reciente por
`creado_en`**. Nunca se hace `UPDATE` sobre las respuestas: la tabla es un
registro histórico, y por eso `version` viaja en cada fila (un cambio normativo
futuro no invalida los diagnósticos viejos).

**Gate 1:** `calcularDiagnostico(respuestas) → ResultadoDiagnostico` puro, con
tests en `src/__tests__/diagnostico/calcular.test.ts` siguiendo la convención
existente (`describe`/`it` en español, fixtures por constructor, entorno
`node`). Casos obligatorios: las cuatro bandas, los tres escalones, el orden de
bloqueantes (hard antes que soft) y **determinismo** (mismas respuestas →
mismo resultado, incluido el orden de los arrays). `npm test` en verde.

No hay Vitest que configurar. Referencias de estilo:
[`verdict.test.ts`](../../src/__tests__/secop/verdict.test.ts),
[`perfil-store.test.ts`](../../src/__tests__/oferente/perfil-store.test.ts).

---

### Fase 2 — Persistencia y frontera

`diagnostico-store.ts`, calcado de `perfil-store.ts`:

```ts
guardarDiagnostico(input: { usuarioId?: string; sessionToken?: string; resultado }): Promise<...>
reclamarDiagnostico(sessionToken: string, usuarioId: string): Promise<number>
getDiagnosticoVigente(usuarioId: string): Promise<DiagnosticoRow | null>
```

- `reclamarDiagnostico` hace un `UPDATE … SET usuario_id, reclamado_en WHERE session_token = ? AND usuario_id IS NULL`. Idempotente: reclamar dos veces no duplica ni pisa.
- Manejo de fallo de DB: mismo patrón "modo concierge" del repo — devolver `{ ok: false, error: "DB_UNAVAILABLE" }` en vez de lanzar, para que la UI pueda mostrar el resultado calculado aunque no se haya podido guardar. El resultado ya está en memoria; perderlo sería peor que no guardarlo.
- **Aislamiento multi-tenant:** toda lectura filtra por `usuarioId` en código de aplicación. Es la única defensa (CLAUDE.md §4) — auditar cada query nueva antes de tocarla.

`perfil-habilitacion.ts` proyecta el diagnóstico vigente al formato que
consumen el semáforo y el aviso de bloqueantes. **Sin I/O en la proyección**:
recibe la fila, devuelve el objeto.

`app/api/diagnostico/route.ts` — `POST`, `runtime = "nodejs"`, siempre JSON,
fuera de `PROTECTED_PREFIXES`. Con sesión guarda con `usuarioId`; sin sesión
emite/reutiliza la cookie httpOnly y guarda con `sessionToken`.

---

### Fase 3 — Interfaz

Ruta pública `/diagnostico` (`app/diagnostico/page.tsx`), sin auth, indexable,
con `metadata` como el resto de páginas.

**Tres estados en una sola página:**

1. **Portada** — titular, promesa de tiempo (10 preguntas, 3 minutos) y las tres afirmaciones que desmontan la barrera de entrada: mínima cuantía no exige RUP; la garantía suele ser opcional en mínima cuantía; en consorcio se suma la experiencia del aliado.
2. **Cuestionario** — una pregunta a la vez, texto de ayuda, navegación hacia atrás, atajos numéricos de teclado, medidor de progreso persistente.
3. **Resultado** — veredicto, desglose por área, escalón sobre la escalera de tres peldaños, plan de acción ordenado (hard antes que soft), sección de mitos.

**Conversión, sin muro.** El resultado se muestra **completo** a anónimos. El
registro se ofrece para guardarlo y activar coincidencias. Precedente exacto:
el teaser de `/mis-coincidencias` sin sesión, invertido — allí se oculta el
valor, aquí se muestra y se ofrece conservarlo.

#### 7.1 El diseño se adapta — qué reusar exactamente

**Tokens reales** de `app/globals.css` (tema claro `clr-*`; el tema oscuro
`--cyan`/`--deep1` es legado del dominio séptico deprecado, **no usar**):

```
--bg #FAFAF7   --surface #FFFFFF   --surface-alt #F4F4EE
--ink-900 #0A1F1C   --ink-600 #525B5A   --ink-300 #6B746F
--line #E5E5E0
--accent #0369A1   --accent-soft/-faint   --accent-river #7DD3FC   --accent-ocean #0C4A6E
--success #16A34A   --warning #D97706   --danger #DC2626
--font-sans  Inter          (cuerpo)
--font-mono  JetBrains Mono (datos, códigos, etiquetas)
IBM Plex Sans Condensed     (solo titular de hero)
--fs-*, --space-* (4pt), --radius-*, --focus-ring, --container-narrow 760px
```

`body` sigue con el tema oscuro, así que la página pinta su propio fondo:
`min-height: 100vh; background: var(--bg)`.

**Componente base: [`AuthCard`](../../src/components/auth/AuthCard.tsx).** Es
el "plano de ingeniería" del producto: etiqueta `Fig. NN —` en mono, mayúsculas,
`letter-spacing:.12em`, y tarjeta con **cuatro esquinas de bracket** (spans
absolutos, dos bordes de 2px en `var(--accent)`). Portada y resultado se montan
sobre ese shell — extraerlo a un componente compartido si hace falta, sin
cambiar su apariencia.

**Correcciones al prompt original:** el glassmorphism **no existe** en el tema
claro (los dos únicos `backdrop-filter` del archivo son del menú móvil oscuro y
uno en `none`); `.clr-card` y `.clr-auth-card` son opacos. Las esquinas de
bracket sí existen. Los tres colores que citaba el prompt (`#F7F5EF`,
`#1D6FA5`, `#134D74`) no están en el repo, y la mono real es JetBrains, no IBM
Plex. **Se usan los reales. No se introduce glass**: sería inventar un estilo
que la plataforma no tiene.

**Convención de CSS:** cada componente lleva su CSS en una constante
`STYLE`/`CSS` inyectada con `<style dangerouslySetInnerHTML={{ __html: STYLE }} />`
y clases prefijadas — `clr-diag-*` para este módulo. No hay librería de
componentes ni Tailwind; solo navbar y `.clr-card` viven en `globals.css`, que
**no se toca**.

**Botones:** convención de brackets literales, `[ Ver mi resultado ]`.

**Medidor de progreso:** el prototipo usaba un tanque que se llena. La idea es
buena y es vernácula del sector, pero **se resuelve como componente propio en
el lenguaje de AquaLicita** — azul sobre crema, geometría de bracket, `mono`
para el contador — no se porta el visual del prototipo. Si al construirlo
rompe el sistema, se propone alternativa antes de improvisar.

**Accesibilidad:** `*:focus-visible` (anillo de 2px) y
`@media (prefers-reduced-motion: reduce)` **ya son globales** en
`globals.css` — no hay que reimplementarlos, sí hay que no romperlos.
Falta poner: `aria-live` en el medidor, navegación completa por teclado,
responsive hasta 360px.

---

### Fase 4 — Enlace con el producto

1. **Reclamo tras el registro.** Llamar `reclamarDiagnostico()` en los tres
   caminos que crean sesión, junto a `syncUsuario()`:
   [`app/auth/callback/route.ts`](../../app/auth/callback/route.ts) (Google y
   verificación de correo, mismo intercambio PKCE) y `signUpAction` /
   `signInWithPasswordAction` en
   [`src/lib/supabase/actions.ts`](../../src/lib/supabase/actions.ts). Solo el
   callback no basta: el registro con contraseña y sesión inmediata no pasa por
   ahí.
2. **Panel de bloqueantes a nivel de cuenta.** El plan de acción (6 remedios
   `hard`, 10 `soft`) persistido y visible en `/mis-coincidencias`. Es el 80 %
   del valor del enlace y no depende de ningún pliego. **Incluye el aviso de
   RUP** vencido o no inscrito, que es la forma correcta de exponerlo sin tocar
   `verdict.ts` ni la invariante D18.
3. **Sector + Zona tras el resultado.** El cuestionario no los pregunta y son
   los dos campos que encienden las coincidencias, así que van en el paso de
   conversión, junto al CTA de registro, reusando
   [`SectorZonaSetup`](../../src/components/oferente/SectorZonaSetup.tsx) tal
   cual. No se añaden preguntas al cuestionario: rompería el "10 preguntas ·
   3 minutos" de la portada. **Regla anti-degradación:** solo escribe si no
   existe fila en `oferente_perfil`, o si la existente es `PerfilMinimo`
   (`!isPerfilCompleto()`). Nunca sobrescribe un `OferenteProfile` completo.
4. **Escalón → `modalidad` del proceso** (incremento aparte). `SecopProceso.modalidad`
   ya existe en el ELT; con el escalón se anota cada proceso ("este es de menor
   cuantía; tu escalón hoy es mínima cuantía"). Requiere un normalizador
   construido sobre un `SELECT DISTINCT modalidad` real — no se inventa la
   tabla de equivalencias, y por eso va después del núcleo.
5. **`RupWizard` como salida** cuando el escalón ya es `menor_cuantia` o
   superior: ahí sí tiene sentido pedirle los números que `habilitacionGate`
   consume. El diagnóstico no los puede dar (§4 de `02-…`).
6. **`verdict.ts` no se toca.** Sin pliego extraído, HABILITACIÓN sigue en gris
   "requiere pliego" — correcto y honesto. Nunca verde por defecto.
7. **Enlaces de entrada:** desde la landing y desde el estado vacío de
   `/mis-coincidencias` (`clr-mc-empty` y el bloque `SectorZonaSetup`).

---

## 7. Fuera de alcance

Anotar si surge, no construir:

- Variante del cuestionario para empresas de servicios públicos bajo régimen de derecho privado (Ley 142).
- Versión española sobre OpenPLACSP — **no existe nada de eso en el repo hoy**.
- Envío del plan de acción por correo (aunque `resend` y `src/lib/email/` ya existen).
- Comparativa con otros usuarios o benchmarking.
- Cambios al asistente, al cron de ingesta SECOP o al extractor de pliegos.
- Rediseño de rutas existentes más allá del enlace de entrada.
- Tests de componentes React: no hay `jsdom` ni `@testing-library`; añadirlos sería infraestructura nueva. Si se quiere, se decide aparte.

---

## 8. Criterios de aceptación

- [ ] `/diagnostico` completable de principio a fin por un anónimo, y el resultado queda persistido en Postgres (Supabase).
- [ ] El mismo conjunto de respuestas produce siempre el mismo resultado, verificado por test.
- [ ] Un usuario que se registra después de completarlo encuentra su diagnóstico en su cuenta — por los **tres** caminos de sesión (Google, verificación de correo, alta con contraseña).
- [ ] El prellenado del perfil **no degrada** un `OferenteProfile` completo existente.
- [ ] La tabla `diagnostico` tiene RLS activo y la migración es `drizzle/0015_*`.
- [ ] `npm test` en verde, incluidos los 64 archivos que ya existían (sin regresiones).
- [ ] Sin llamadas a Anthropic ni a Gemini en la ruta del diagnóstico.
- [ ] Sin escrituras en localStorage; `clientStore.ts` sin modificar.
- [ ] `/api/diagnostico` responde JSON sin sesión (no un redirect a login).
- [ ] `app/globals.css` sin modificar; ningún color, fuente o radio hardcodeado fuera de los tokens.
- [ ] Auditoría visual: la página no se distingue en tipografía, color ni componentes del resto de AquaLicita.
- [ ] `verdict.ts` sin modificar; invariante D18 intacta.

---

## 9. Protocolo de trabajo

Fase por fase, con parada en cada gate. Sin encadenar fases sin aprobación.

**Estado actual:** Fase 0 cerrada ([00-reconocimiento.md](00-reconocimiento.md)).
**Bloqueo activo:** §3 — falta el contenido del cuestionario. Todo lo demás de
la Fase 1 (esquema, tipos, store, migración) puede construirse sin él; solo
`co-apsb-v1.ts` queda a la espera.

Al terminar, escribir en `docs/diagnostico/99-lecciones.md` qué asunción
resultó falsa durante la implementación y qué habría cambiado el enfoque si se
hubiera sabido en la Fase 0. (El prompt original pedía `tasks/lessons.md`; ese
directorio no existe en el repo y crearlo en la raíz rompería la convención de
documentación en `docs/`.)
