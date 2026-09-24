# AquaLicita — Instrucciones del Proyecto

AquaLicita es una plataforma de inteligencia para contratación pública en
agua y saneamiento sobre SECOP II: exploración de procesos, extracción de
pliegos, perfil de oferente/elegibilidad y alertas. Es el **único producto
activo**. El dominio séptico (calculadoras de fosa séptica, agente
conversacional Hydro_Agent, diagramas 3D) quedó deprecado el 2026-08-08 —
ver [ADR-0002](docs/adr/ADR-0002-deprecacion-dominio-septico.md) y el tag
de git `archive/septic-product-2026-08-08` para su estado previo completo.

---

## 1. Regla Global de Idioma

El idioma lo fija el primer mensaje del usuario y se mantiene toda la
sesión. Si el usuario cambia de idioma a mitad de conversación, cámbialo
sin comentarlo. Una respuesta = un idioma; nunca mezclar español e inglés
salvo términos técnicos oficiales que no tienen equivalente (citar en
idioma original con traducción entre paréntesis la primera vez). Si el
usuario pide cambio explícito de idioma ("respóndeme en inglés"), cambia
de inmediato y mantén hasta nueva indicación.

---

## 2. Dominio del producto

Entidades y flujos principales:

- **Ingesta (ELT)**: SECOP/Socrata → `raw_record` (append-only) →
  transform → entidades canónicas (`proceso`, `contrato`,
  `contrato_evento`, `entidad`, `proveedor`, `geografia`).
- **Clasificación sectorial**: derivada, versionada por
  `clasificadorVersion` (`src/lib/classify/classifier.ts`). Responde "¿esto es de
  agua?" — binaria. `clasificacion_sectorial` sigue con 0 filas: nadie la escribe.
- **Tipo de proyecto** (`src/lib/classify/tipo-proyecto.ts`): cinco valores y solo
  cinco — `acueducto | alcantarillado | ptap | ptar | otros`. Responde una pregunta
  distinta de la anterior ("¿de qué subsistema?") y por eso es un módulo aparte.
  `TIPOS_PROYECTO` y `TIPO_PROYECTO` son la **única fuente** de esos valores para
  el mapa, la leyenda, la faceta, la fila de la vitrina, la ficha y las rutas
  `/licitaciones/tipo/[slug]`; no se vuelve a escribir "ptar" a mano en ningún
  sitio. Persistido en `proceso.tipo_proyecto` (+ `_confianza`, `_segundo`,
  `_version`, `drizzle/0024`), backfill hecho el 2026-09-15 sobre las 90.622
  filas. Se recomputa con `npm run db:tipo-proyecto --todas` al subir
  `CLASIFICADOR_TIPO_VERSION`.
  Es **textual, no por UNSPSC**: se midió que la clase 831015 concentra 16.444
  procesos y contiene los cuatro tipos a la vez, así que el código dice que es de
  agua —lo que ya usa la ingesta— pero no de qué subsistema. El UNSPSC solo
  desempata. Y antes de puntuar se **poda** del texto la razón social de la
  entidad: sin eso, un contrato de imprimir facturas de una "Empresa de Acueducto,
  Alcantarillado y Aseo" puntúa como acueducto.
- **Pliegos**: extracción híbrida (reglas + fallback Gemini) —
  `src/lib/pliego/extractPliegoHybrid.ts`, único extractor cableado a
  `/api/pliego/extract`.
- **Oferente / matching**: perfil de oferente (`src/lib/oferente/`) cruzado
  contra oportunidades (`src/lib/matching/`).
- **Diagnóstico de preparación** (`src/lib/diagnostico/`): cuestionario público
  de 10 preguntas en `/diagnostico` que devuelve nivel de preparación, escalón
  de contratación y plan de acción. Cálculo puro y determinístico, **sin IA**
  (`calcular.ts`); contenido congelado por versión en
  `cuestionario/co-apsb-v1.ts` — un cambio normativo crea `v2`, no se edita el
  `v1`, porque hay filas que apuntan a él. Se responde sin cuenta y se persiste
  desde el primer envío; el registro reclama la fila por `session_token`.
  Alimenta el panel de habilitación de `/mis-coincidencias` y el cruce
  escalón ↔ `proceso.modalidad`. **No alimenta `habilitacionGate`**: es
  cualitativo y no produce indicadores RUP ni contratos en SMMLV. Diseño y
  decisiones en `docs/diagnostico/`.
- **Alertas**: envío diario idempotente (`src/lib/alertas/`,
  `envio_log` UNIQUE).

## 3. Configuración Técnica

- **Framework**: Next.js 14.2.3 + React 18
- **Base de datos**: Postgres vía Drizzle ORM. **La base viva es la de
  Supabase** (`DATABASE_URL` → `aws-1-eu-west-1.pooler.supabase.com`), no
  Neon: la migración se hizo el 2026-08-15 y se verificó el 2026-08-26 (la
  ingesta del día escribió ahí). `DATABASE_URL_UNPOOLED` todavía apunta a
  Neon, que es un residuo y hoy responde `exceeded the data transfer quota` —
  no usarlo. El mismo proyecto de Supabase sirve Auth y datos.
- **Auth**: Supabase Auth (`@supabase/ssr` + `@supabase/supabase-js`) — email/password y Google OAuth
- **LLM**: Gemini (extractor de pliegos, `GEMINI_API_KEY`)
- **Diseño**: tokens en `app/globals.css` — `--bg:#FAFAF7`,
  `--accent:#0369A1`. Esos dos valores **se conservan por decisión medida del
  2026-09-15**, no por inercia: el spec de rediseño pedía una paleta crema
  (`#F7F5EF` / `#1D6FA5`), y al medirla resultó ser un 2,3% de diferencia en el
  fondo y un 6,1% en el acento —el mismo azul, un crema apenas más cálido— a
  cambio de bajar `--ink-300` por debajo de AA, colapsar `--surface-alt` contra
  el fondo (quedaban en 1,01:1, o sea el mismo color) y encadenar tres tokens más
  de compensación. Sobre un CSS repartido en **27 hojas** (`globals.css` más 26
  bloques `<style>` inyectados en componentes) y con un 69% de cobertura de
  tokens, no compensaba. Del spec sí se adoptó el **vocabulario**: `--text-primary`,
  `--text-muted`, `--surface-elevated`, `--accent-deep`, `--border` y `--card`
  existen como **alias** sobre los tokens de siempre — el código nuevo usa esos
  nombres, el viejo sigue siendo válido y ningún píxel cambió al introducirlos.
  `--surface` NO se redefinió como el crema del spec: significa blanco en 18
  sitios y redefinirlo no daría error, solo pintaría mal. El crema es `--bg`.
- **Color semántico**: `--success`, `--warning` y `--danger` son el escalón -700
  de su escala (`#15803D`, `#B45309`, `#B91C1C`). Estaban en el -600 y ninguno
  llegaba a AA como texto de 11,5px, que es el tamaño al que se pintan las
  compuertas del semáforo: el usuario leía bien "no puedes" y mal "sí puedes".
  Cualquier color nuevo de estado **se mide antes**:
  `src/__tests__/design/contraste.test.ts` lee los tokens reales de `globals.css`
  y falla si el contraste baja, incluso sobre los tintes `rgba()`. Era la única
  categoría del suite sin pruebas. Lo que sigue roto y por qué, en `PENDIENTES.md`
  §22-§26 — sobre todo el segmento UNKNOWN de la barra, que hoy es invisible.

## 4. Seguridad

- Los endpoints `/api/cron/*` exigen `CRON_SECRET` como `Bearer` y fallan
  cerrado (401) si la env var no está definida — ver
  `app/api/cron/{ingest,alertas}/route.ts`.
- **CERRADO el 2026-08-26 (migración `drizzle/0014`) — la Data API de Supabase
  exponía las 22 tablas de `public` a cualquiera.** Ninguna tenía RLS y los
  roles `anon` y
  `authenticated` conservan `SELECT, INSERT, UPDATE, DELETE, TRUNCATE` sobre
  todas. Como `NEXT_PUBLIC_SUPABASE_ANON_KEY` viaja en el bundle del
  navegador, un `curl` a `/rest/v1/usuario` con esa clave devuelve datos —
  verificado. Antes de la migración de Neon (2026-08-15) esto no importaba
  porque no había API pública; ahora el `WHERE usuarioId=...` de la
  aplicación es una puerta que se puede rodear entera.
  Se cerró activando RLS sin políticas en las 22 tablas (`.enableRLS()` en el
  esquema Drizzle, para que ninguna migración futura lo deshaga). No tocó el
  runtime: el código solo usa `supabase.auth.*` y un `supabase.storage.from`,
  nunca `.from()` sobre tablas — los datos van por Drizzle con conexión
  Postgres directa, cuyo rol ignora RLS. Verificado después: la API devuelve
  `[]` y la conexión directa sigue leyendo las 127.566 filas.
- **Toda tabla nueva debe nacer con `.enableRLS()` en el esquema Drizzle.** Es
  la regla que deja permanente lo anterior. `diagnostico` (`drizzle/0015`,
  2026-08-28) la cumple: verificado en la base, hoy son 23 tablas en `public` y
  **0 sin RLS**.
- `diagnostico` admite filas anónimas (`usuario_id` NULL) direccionables por
  `session_token`, que viaja en una cookie **httpOnly** y por tanto lo controla
  el cliente. Por eso se valida que tenga forma de UUID antes de usarlo en un
  `WHERE` (`src/lib/diagnostico/session-token.ts`), y se borra al reclamarlo y
  al cerrar sesión — si no, en un navegador compartido la siguiente cuenta
  heredaría el diagnóstico de otra persona.
- **Refuerzo pendiente, menor:** `anon` y `authenticated` conservan los GRANT
  (incluido `TRUNCATE`, que en Postgres *no* está sujeto a RLS). Hoy no es
  explotable porque PostgREST no expone `TRUNCATE` y nadie tiene credenciales
  de Postgres para esos roles, pero revocar los grants sería defensa en
  profundidad. Ojo con Storage, que tiene políticas propias en
  `storage.objects`.
- Aparte de eso, la única defensa multi-tenant sigue siendo el `WHERE
  usuarioId=...` de cada query. Auditar manualmente cada query sobre tablas
  de cuentas/oferente antes de tocarlas.
- **Una cuenta borrada en Auth no le hereda nada a un alta nueva con el mismo
  correo** (`src/lib/supabase/sync-usuario.ts`, 2026-09-19). Borrarla en el
  dashboard de Supabase deja su fila en `usuario`; cuando el correo vuelve a
  registrarse con otro id, `syncUsuario` borra esa fila —y por cascada sus
  datos— solo si el id viejo ya no está en `auth.users`, y falla con
  `ColisionEmailUsuarioError` si sigue vivo. **No reapuntar la fila al id
  nuevo**: el alta sincroniza antes de confirmar el correo, así que le
  entregaría perfil y documentos a quien escribiera esa dirección.
- **Modelo de acceso por niveles** (`src/lib/acceso/politica.ts`): tres niveles
  ordinales `anonimo < gratis < pro` y una tabla `NIVEL_MINIMO` que mapea
  capacidad → nivel mínimo. Es la única fuente de verdad de "quién puede qué";
  antes la respuesta estaba repartida entre `PROTECTED_PREFIXES`, ~20 llamadas
  sueltas a `getSessionUser()` y gates en componentes, y las tres se
  contradecían. Cualquier capacidad nueva se declara ahí, no con un `if (user)`
  suelto.
- La frontera visible hoy está en el veredicto de elegibilidad: el anónimo ve el
  semáforo y el estado de cada compuerta, la explicación (`reason`) pide cuenta
  — `src/lib/secop/verdict-publico.ts`. Dos excepciones se muestran sin cuenta:
  `overall === "FAIL"` (quien no puede participar merece saber por qué) y las
  compuertas `UNKNOWN` (no hay nada que ocultar). La redacción es del servidor;
  hacerla en el render dejaría los `reason` en la pestaña de red.
- `usuario.plan` (`text`, default `'gratis'`) existe pero **ningún handler la
  lee todavía**: `pliego_extraer` y `asistentes` están declaradas como `pro` en
  la política y siguen protegidas solo por `PROTECTED_PREFIXES`. Activar esa
  frontera es hacer que sus handlers consulten `puede()`. La columna ya existe en
  la Supabase viva: verificado el 2026-09-15, las 24 migraciones del repo
  (`0000`–`0023`) están aplicadas.

## 5. Estado del roadmap

Ver `PENDIENTES.md` para pendientes activos y `docs/fase-*/` para el
historial de decisiones de diseño por fase. **El rediseño de portada y vitrina
(2026-09) tiene su propio traspaso en
`docs/rediseno-2026-09/TRASPASO.md`**: estado por tarea, el bloqueo del mapa,
las decisiones que no hay que deshacer y las trampas del entorno. Empezar por
ahí antes de tocar la portada, las rutas facetadas o la ficha. `docs/diagnostico/` documenta el
módulo de diagnóstico de principio a fin: reconocimiento, spec, contrato del
cuestionario y lecciones. `AUDIT_REPORT.md` (2026-08-02)
y `AUDITORIA_TECH_DEBT.md` (2026-07-18) son las auditorías más recientes
que existen en el repo.
**Reglas de conducta del agente para el trabajo nuevo: `docs/CONDUCTA.md`**
(aditivas, no derogan nada de este archivo). Las once decisiones cerradas el
2026-09-21 sobre los specs de landing y mapa —plazo, cuantía, ruta, filtro
territorial, paleta, perfil anónimo— están en
`docs/rediseno-2026-09/AUDITORIA-SPECS-LANDING-MAPA.md` §9.

---

## Notas Finales

Estas instrucciones son **obligatorias** y definen el comportamiento del
agente sobre este repositorio. Cualquier cambio debe documentarse aquí.
Última actualización: 2026-09-19 (colisión de correo en el espejo `usuario`).

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).


## Landing — primera etapa 2026-09-24

Hero/KPIs actualizado únicamente en `src/components/landing/PortadaCliente.jsx`.
Se conservan fuentes de datos, rutas, paleta y mapa de servidor. Los tres KPIs
no comparten universo: vigilados incluye histórico; nuevos son abiertos en
presentación de oferta en siete días; en juego suma precio base de abiertos
publicados este mes. No sustituirlos por cifras ni tendencias de un mockup.
Inventario, verificación y reversión: [plan de la etapa](docs/superpowers/plans/2026-09-24-landing-hero-kpis.md).
