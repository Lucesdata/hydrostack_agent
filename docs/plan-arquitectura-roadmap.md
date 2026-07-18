# Plan de Arquitectura — Roadmap etapa gratuita

**Fecha**: 2026-07-18 · **Decisiones fijadas**: email con Resend · auth con Auth.js (NextAuth) · Fase 1 a fondo, fases 2–5 en panorama.

## 1. Principios de integración

El objetivo es que todo lo nuevo sea **aditivo**: módulos nuevos que consumen los existentes por sus contratos públicos, sin modificar su interior. Los únicos archivos existentes que se tocan son puntos de registro:

| Punto de extensión | Cambio permitido |
|---|---|
| `src/lib/db/schema/index.ts` | re-exportar el nuevo módulo de schema |
| `vercel.json` | añadir entrada al array `crons` |
| `next.config.js` | nada previsto |
| Navbar/layout | enlaces a las páginas nuevas |
| `src/lib/state/clientStore.ts` | solo lectura (migración del perfil); no se cambia su API |

**Intocables** (se consumen, no se modifican): el pipeline ELT (`src/lib/ingest/`, `src/lib/transform/`), el motor de veredicto (`src/lib/secop/verdict.ts` — sus compuertas `sectorialGate`, `cuantiaGate`, `plazoGate`, `ubicacionGate`, `habilitacionGate` y `aggregateVerdict`), la búsqueda (`searchProcesosDb`/`countProcesosDb` con `SecopQuery`), el tipo `OferenteProfile` (`src/lib/oferente/types.ts`, ya multi-tenant con `id`), el agente Groq y las calculadoras. El invariante del veredicto se preserva: en Nivel 0 la compuerta habilitación devuelve `UNKNOWN`; el matching nunca pinta verde con datos que no tiene.

## 2. Diagrama de componentes (Fase 1)

```
                    EXISTENTE                          NUEVO
┌──────────────────────────────────────┐  ┌─────────────────────────────────┐
│ Vercel Cron 11:00 UTC                │  │ Vercel Cron 12:00 UTC           │
│  /api/cron/ingest ─► runIngestPipe.  │  │  /api/cron/alertas              │
│        │                             │  │        │                        │
│        ▼                             │  │        ▼                        │
│  Postgres (Neon)                     │  │  src/lib/matching/match.ts      │
│  proceso · contrato · clasificacion  │◄─┤   (perfil × proceso, reusa      │
│  geografia · sync_log                │  │    gates del veredicto L0)      │
│                                      │  │        │                        │
│  searchProcesosDb / verdict.ts ──────┼─►│        ▼                        │
│                                      │  │  src/lib/email/digest.ts        │
│  clientStore (localStorage)          │  │   (plantilla + Resend SDK)      │
│   hydrostack_oferente_perfil ─migra─►│  │                                 │
└──────────────────────────────────────┘  │  Auth.js: /api/auth/[...]       │
                                          │  Tablas: usuario · perfil ·     │
                                          │  alerta_pref · envio_log        │
                                          └─────────────────────────────────┘
```

Flujo diario: cron de ingesta corre a las 11:00 UTC (existente) → cron de alertas corre después (12:00 UTC) → por cada usuario con perfil: prefiltro SQL con `searchProcesosDb` → compuertas L0 en memoria → si hay coincidencias, correo vía Resend → registro en `envio_log`.

## 3. Fase 1 — diseño detallado

### 3.1 Cuentas con solo correo (sub-etapa 1.1)

**Stack**: Auth.js v5 + `@auth/drizzle-adapter` + provider **Resend** (magic link nativo, sin contraseñas). Un solo proveedor de correo para auth y alertas: una sola configuración SPF/DKIM del dominio.

Nuevo módulo `src/lib/db/schema/cuentas.ts`:

- `usuario`, `cuenta`, `sesion`, `token_verificacion` — las 4 tablas estándar del adapter Drizzle (nombres según convención del adapter).
- `oferente_perfil` — columnas: `id uuid PK`, `usuario_id FK → usuario (unique)`, `perfil jsonb` (el `OferenteProfile` completo), `actualizado_en timestamp`. **Decisión: jsonb, no normalizado.** El perfil ya es un contrato TypeScript estable y el único consumidor es el matching en memoria; normalizarlo hoy es esfuerzo sin consulta que lo justifique. Se revisa si algún día hace falta consultar "usuarios con UNSPSC X" en SQL (para eso bastará un índice GIN).

Archivos nuevos: `src/lib/auth/config.ts` (config Auth.js), `app/api/auth/[...nextauth]/route.ts`, `app/cuenta/page.tsx` (login + estado de sesión), `app/api/perfil/route.ts` (GET/PUT del perfil de la cuenta).

**Migración del perfil**: al iniciar sesión por primera vez, un componente cliente lee `hydrostack_oferente_perfil` del `clientStore` y si la cuenta no tiene perfil, hace `PUT /api/perfil`. El wizard existente sigue escribiendo en localStorage para anónimos (cero cambio); con sesión, escribe además vía `PUT /api/perfil`. localStorage queda como caché para anónimos, la DB es la fuente de verdad con cuenta.

**Prueba (la del roadmap)**: registrarse → cerrar sesión → entrar desde otro navegador → mismo perfil. Añadir test de integración del PUT/GET de perfil con el patrón de mocks de DB ya usado en `src/__tests__/db/`.

### 3.2 Matching visible (sub-etapa 1.2)

Nuevo módulo puro `src/lib/matching/match.ts`:

```ts
matchProcesos(perfil: OferenteProfile, procesos: VerdictProcessInput[], now: Date): Match[]
// Match = { proceso, gates: GateResult[], veredicto: GateStatus }
```

**Estrategia en dos etapas** (la misma que ya usa `/api/secop/verdict`): (1) prefiltro SQL barato con `searchProcesosDb` — `apertura: 'Abierto'`, `departamento` desde `cobertura.departamentos`, `valorMin` desde `cuantiaObjetivo`, `soloAgua: true` — y (2) compuertas L0 en memoria sobre la página de resultados. Cero SQL nuevo; el módulo no conoce Drizzle. Trade-off: el prefiltro SQL puede traer falsos positivos que las compuertas descartan (aceptable; página de ~50 procesos), pero nunca descarta procesos que las compuertas aprobarían (el prefiltro es un superconjunto relajado de las compuertas).

Página `app/mis-coincidencias/page.tsx` (server component con sesión): lista con semáforo por proceso, enlace al detalle. Aquí se itera la calidad del matching antes de tocar correos — exactamente la prueba de la sub-etapa.

Test unitario de `matchProcesos` con fixtures de perfil y procesos (patrón de `src/__tests__/secop/`).

### 3.3 Correo bajo demanda (sub-etapa 1.3)

Nuevo módulo `src/lib/email/`:

- `digest.ts` — `renderDigest(matches: Match[], usuario): { html, text, subject }`. Plantilla HTML simple en template literal (sin react-email: una plantilla no justifica la dependencia; se revisa si crecen a >3 plantillas). Enlaces al detalle del proceso con UTM.
- `send.ts` — wrapper del SDK `resend`: `sendDigestEmail(to, digest)`. Único punto que conoce Resend → cambiar de proveedor toca un archivo.

`POST /api/alertas/enviar-ahora` (con sesión): ejecuta matching del día → si hay coincidencias, envía → registra en `envio_log`. Botón en `/mis-coincidencias`.

**Entregabilidad**: dominio verificado en Resend (SPF + DKIM + DMARC), remitente estable tipo `alertas@<dominio>`, y desde el primer correo los headers `List-Unsubscribe` + `List-Unsubscribe-Post` (RFC 8058) — Gmail/Outlook los exigen para volumen y evitan la carpeta de spam. El `unsubscribe` apunta al endpoint de 3.5 aunque la UI de preferencias llegue después.

### 3.4 Envío diario automático (sub-etapa 1.4)

`app/api/cron/alertas/route.ts`, calcado del patrón de `cron/ingest`: `runtime nodejs`, `dynamic force-dynamic`, `maxDuration 300`, verificación `CRON_SECRET` idéntica. Entrada nueva en `vercel.json`: `{ "path": "/api/cron/alertas", "schedule": "0 12 * * *" }` — una hora después de la ingesta, sin acoplarse a ella (si la ingesta falló, el matching corre sobre los datos del día anterior: degradación aceptable).

**Idempotencia** — tabla `envio_log`: `id`, `usuario_id`, `fecha date`, `tipo ('diario'|'on_demand')`, `matches int`, `estado ('enviado'|'sin_coincidencias'|'error')`, `enviado_en`, con **unique (usuario_id, fecha, tipo)**. El job hace insert-first (`onConflictDoNothing` y salta si ya existía): reejecutar el cron no duplica correos — la prueba clave de la sub-etapa. `sync_log` no se toca (es del pipeline); `envio_log` es su análogo para alertas y sirve para medir aperturas/fallos.

**Escala**: bucle secuencial por usuario dentro de una invocación. Con `maxDuration 300` y ~1–2 s por usuario (1 query + N gates + 1 API call) alcanza para ~150–200 usuarios con perfil. **Revisar al crecer**: pasado ese umbral, trocear por cursor (`?desde_usuario=`) con el mismo patrón de válvula que `CRON_MAX_PAGES`, o mover a un job externo. No construir eso hoy.

### 3.5 Control del correo por el usuario (sub-etapa 1.5)

Tabla `alerta_preferencias`: `usuario_id PK/FK`, `activo boolean default true`, `hora_envio smallint default 7` (hora Colombia), `creado_en`, `actualizado_en`.

- **Horario configurable**: el cron sigue siendo uno solo (12:00 UTC = 07:00 Colombia). Para horarios distintos, el cron pasa a correr cada hora (`0 * * * *`) y filtra `WHERE hora_envio = <hora actual Colombia> AND activo`. `envio_log` (unique por fecha) garantiza que el cambio de horario en medio del día no duplique.
- **Unsubscribe de un clic**: `GET /api/alertas/unsubscribe?token=` con token HMAC firmado (`AUTH_SECRET`) que codifica `usuario_id` — sin sesión, un clic, marca `activo = false` y muestra confirmación. El mismo token va en el header `List-Unsubscribe` desde 3.3.
- UI en `/cuenta`: pausar, hora, reactivar.

### 3.6 Modelo de datos nuevo (resumen)

```
usuario (Auth.js)          oferente_perfil            alerta_preferencias
  id, email, ...        ←──  usuario_id (unique)   ←──  usuario_id (PK)
                             perfil jsonb                activo, hora_envio
        ▲                    actualizado_en
        │
   envio_log:  usuario_id, fecha, tipo, matches, estado   [unique (usuario_id, fecha, tipo)]
```

Todo en `src/lib/db/schema/cuentas.ts` + migración Drizzle (`db:generate` / `db:migrate`). Sin FKs hacia `proceso`: las coincidencias no se persisten en Fase 1 (se recalculan; son baratas). Persistirlas es Fase 4 (favoritos).

### 3.7 Variables de entorno nuevas

`AUTH_SECRET` · `AUTH_RESEND_KEY` (o reuso de una `RESEND_API_KEY` única) · `EMAIL_FROM` · `NEXT_PUBLIC_APP_URL` (enlaces absolutos en correos). `CRON_SECRET` ya existe y protege ambos crons. Actualizar `.env.example`.

### 3.8 Trade-offs principales

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Auth.js + adapter Drizzle | Magic link propio | El flujo propio son ~4 piezas fáciles de hacer mal (tokens, expiración, sesiones, CSRF); Auth.js las da resueltas y el adapter encaja con Drizzle ya presente. Costo: 4 tablas con esquema impuesto. |
| Resend para auth + alertas | SES (más barato a escala) | Un solo dominio/DKIM que configurar, SDK trivial, 3k correos/mes gratis alcanza para toda la etapa. Migrar después solo toca `send.ts`. |
| Perfil en jsonb | Tabla normalizada | Contrato TS estable, consumidor único en memoria. Normalizar es coste hoy sin query que lo pida. |
| Matching recalculado al vuelo | Tabla de coincidencias | Cómputo barato (compuertas L0 sobre ~50 filas). Persistir añade invalidación sin beneficio hasta Fase 4. |
| Cron único secuencial | Colas / fan-out | Escala actual lo permite de sobra; complejidad de colas injustificada. Umbral de revisión documentado (~200 usuarios). |
| Plantilla en template literal | react-email | Una sola plantilla; dependencia injustificada de momento. |

## 4. Panorama fases 2–5 (anclaje en lo existente)

**Fase 2 — RUP y citas.** El parser del RUP vive en `src/lib/rup/` y produce `Partial<OferenteProfile>` (mismo contrato; el wizard hace merge — el campo `fuente: 'manual' | 'rues'` ya existe en `CapacidadFinancieraRUP` para distinguir procedencia). Las citas extienden `GateResult` con un campo opcional `cita?: { fuente, referencia }` — cambio retrocompatible al contrato del veredicto (los consumidores actuales lo ignoran); es la única modificación prevista a `verdict.ts` en todo el roadmap y llega con sus tests. El flujo guiado de primer uso reusa wizard + matching ya construidos en Fase 1.

**Fase 3 — LLM del usuario.** `src/lib/prompts/analisisPliego.ts`: funciones puras `SecopProceso + OferenteProfile → string` (las 4 plantillas). Sin backend nuevo: botón que copia al portapapeles / abre chat.openai.com o claude.ai. BYOK opcional después: la clave del usuario viaja por request y no se persiste (o cifrada en `usuario` si se decide guardar — decisión para su momento, con ADR).

**Fase 4 — Gestión del proceso.** Tablas nuevas en `cuentas.ts`: `proceso_guardado` (usuario_id, proceso_id, carpeta, notas) — aquí sí aparece la FK a `proceso`. El watcher de adendas es otra entrada en el array `crons` que compara metadata de documentos entre corridas y reusa `src/lib/email/`. Export a Excel: endpoint que reusa `searchProcesosDb` + SheetJS.

**Fase 5 — Crecimiento.** Páginas SEO: `app/(public)/licitaciones/[departamento]/page.tsx` con `generateStaticParams` desde la tabla `geografia` e ISR (mismo patrón de revalidación que `/licitaciones`). Análisis de competidores: consulta sobre `contrato` + `proveedor` ya ingeridos — es una página de lectura, no un sistema nuevo.

## 5. Riesgos y puntos de revisión

1. **Entregabilidad** es el riesgo real de la Fase 1 — configurar SPF/DKIM/DMARC y List-Unsubscribe *antes* del primer envío masivo, no después de caer en spam. Piloto pequeño (1.3) precisamente para medirlo.
2. **Calidad del matching**: si 1.2 muestra demasiados falsos positivos, ajustar ahí (es barato); no avanzar a 1.3 hasta que las coincidencias sean defendibles — el primer correo malo quema la confianza.
3. **Crons Vercel plan Hobby**: verificar límites del plan (número de crons y frecuencia horaria para 3.5) al momento de implementar; si la frecuencia horaria no está disponible, mantener hora fija única y aplazar el horario configurable.
4. **Auth.js v5**: fijar versión exacta en `package.json` al implementar (verificar compatibilidad con Next 14.2.x en su changelog); si hay fricción, v4 con app route handler es el fallback conocido.
5. **Al crecer**: umbral de ~200 usuarios para trocear el cron; índice GIN sobre `perfil` si aparece la primera consulta SQL al jsonb; revisar el tope de 3k correos/mes de Resend al pasar ~100 usuarios activos diarios.

## 6. Orden de implementación

Estricto el de las sub-etapas 1.1 → 1.5, cada una con su prueba del roadmap como criterio de salida, más: migración Drizzle y `.env.example` en 1.1; test de `matchProcesos` en 1.2; verificación de spam-score (mail-tester) en 1.3; test de idempotencia de `envio_log` en 1.4; test del token de unsubscribe en 1.5. Después de cada sub-etapa: `npm run lint && npx tsc --noEmit && npm test` y `graphify update .`.
