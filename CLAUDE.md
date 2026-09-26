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
Última actualización: 2026-09-26 (La Ficha Viva en la portada).

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).


## Landing — Hero Territorial V2 (PR #54, 2026-09-25)

El hero vive en `src/components/landing/hero-territorial/` (`HeroTerritorial`,
`ListaTerritorios`, `FichaDepartamento`, `BandaMercado`) y se monta desde
`PortadaCliente.jsx`. Se conservan fuentes de datos, rutas, paleta y mapa de
servidor. Hay **dos grupos de KPIs**, cada uno con su propia fuente. No se
mezclan y no se sustituyen por cifras ni tendencias de un mockup.

- **KPIs del hero** (franja sobre el mapa, columna central). Vienen de `agregadosPortada()`
  (`src/lib/secop/agregados.ts`), calculados en el servidor en `app/page.js`
  con `revalidate` de 6 h. Todos cuentan "abierto" con `condicionAbierto()`:
  - *Procesos abiertos · Colombia*: `totalAbiertos`, que es el total real e
    incluye los procesos sin geografía resuelta.
  - *Departamentos con procesos*: `departamentos.length`, es decir, los
    departamentos con al menos un proceso abierto y geografía resuelta.
  - *Tipos de proyecto · Colombia*: `tipos.length`. `procesosPorTipo()`
    devuelve siempre los cinco de `TIPOS_PROYECTO`, así que con datos siempre
    muestra 5. Es la taxonomía, no un conteo que varíe.
  - La suma de la lista por departamento **no cuadra** con `totalAbiertos`,
    porque los abiertos sin geografía quedan fuera del reparto. Es correcto. El
    % de la ficha se calcula sobre `totalAbiertos`. No "arreglarlo" sumando la
    lista.
  - Si la base no responde, `totalAbiertos` queda `undefined` y todo muestra
    "—" con el mapa en gris.
- **Banda "El mercado ahora"** (`BandaMercado`). Son los tres KPIs que antes
  estaban en el hero. Vienen de un único fetch en cliente a `/api/landing-stats`
  y no comparten universo: *vigilados* incluye histórico; *nuevos · 7 días* son
  abiertos en presentación de oferta en siete días; *en juego · este mes* suma
  el precio base de los abiertos publicados este mes. Si el fetch falla, quedan
  en "—". Cada cifra lleva debajo una nota visible con lo que cuenta, y el pie
  dice cuándo consultó la ingesta SECOP II (`ultimaConsulta`, de `sync_log`:
  "consultó", no "actualizó", porque `sync_log` se cierra antes del transform).

**La Ficha Viva (2026-09-26).** La ficha es el centro del producto; la portada
existe para llegar a una. Justo después del hero va la sección
`src/components/landing/ficha-viva/`: las cuatro preguntas con su estado real,
un esquema ilustrativo sin cifras y el árbol de decisiones. El ticker es
"Fichas recientes" y enlaza a cada ficha. **Color = tipo de obra**
(`src/lib/classify/tipo-color.ts`: azul potable, marrón residual, gris redes,
punteado `otros`), siempre con su nombre y nunca como estado. No prometer
alertas por correo ni seguimiento de cambios mientras no existan: la sección
los marca como tales. Spec: `docs/superpowers/specs/2026-09-26-landing-ficha-viva.md`.

**Cabecera, ticker y sincronía (2026-09-26).** En `/` la barra de navegación
va en oscuro (`.clr-nav--oscuro`, en `Navbar.js`) y el ticker también; en el
resto del sitio la barra sigue clara. El ticker son tarjetas con botón de pausa
(WCAG 2.2.2). Mapa, lista y ficha del hero están sincronizados al pasar el
puntero o el foco (`hero-territorial/sincronia.js`): el mapa sigue siendo SVG de
servidor, cada camino lleva `data-dpto` y el hero escucha por delegación. El
clic del mapa **sigue navegando** a la faceta (decisión D).

**Ficha del departamento y tooltip (2026-09-26).** La portada ya no usa
`procesosPorDepartamento()` sino `detallePorDepartamento()` (misma consulta,
con conteos `FILTER`: sigue siendo **una** consulta, no una quinta en paralelo —
PENDIENTES §40). Cada fila trae además `nuevos7d` (abiertos con
`fecha_publicacion` en los últimos 7 días; **no** es el mismo universo que
*nuevos · 7 días* de la banda), `montoAbierto` + `nConMonto` (suma del
presupuesto de los abiertos que lo publican; el 0 no cuenta), `nEntidades`
(entidades contratantes distintas entre los abiertos, `count(distinct)`) y
`tipos` por departamento. La ficha del hero muestra los tipos **del departamento** (sin
enlace por fila: no hay faceta departamento × tipo) y cae a los nacionales si la
fila no trae detalle. El tooltip del mapa nombra el subsistema más frecuente
**sin contar `otros`**. Las facetas siguen con `procesosPorDepartamento()`.

**Destacados y tendencia del departamento (2026-09-26).** Debajo de los tipos, la
ficha muestra los tres abiertos de mayor presupuesto y una sparkline de
**publicados por semana** en las últimas 12. No van en `detallePorDepartamento()`:
salen de `/api/departamento/[dpto]/resumen` (`src/lib/secop/resumen-departamento.ts`),
cacheado 6 h en el CDN, y se piden al **elegir** un departamento, no al pasar el
puntero. La serie cuenta **todos** los publicados, no solo los abiertos: los
abiertos se concentran en las semanas recientes y la curva subiría siempre. Sus
consultas se prueban contra PGlite con las migraciones reales.

El hero usa colores propios en `hero-territorial.module.css` (tema oscuro) y no
los tokens de `globals.css`, así que `contraste.test.ts` no los cubre: los mide
`contraste-oscuro.test.ts`, que lee los `--aq-*` reales y los colores de la barra,
el ticker y el árbol de la Ficha Viva. Texto blanco sobre azul va sobre
`--aq-cta` (`#0272b0`/`#0b7cbd`): el `#1a9be0` de antes daba 3,08:1.

**Rediseño visual (2026-09-26).** Tres columnas: mensaje + lista · mapa · ficha
en tarjeta blanca (con los tipos nacionales y el CTA del departamento). Debajo de
1280px la ficha baja bajo el mapa; debajo de 900px el orden es mensaje, mapa,
ficha, lista. La rampa del mapa se redefine en el hero (`--aq-e0..4`) porque la
de `estilos.ts` sale de `--accent` sobre crema y en oscuro el escalón 0 salía
crema. Los rótulos del mapa ya no son cinco fijos: `src/lib/mapa/rotulos.ts`
elige los 10 departamentos con más procesos y los coloca sin solaparse en un
viewBox ensanchado (`MARGEN_ROTULOS`). Se ocultan bajo 600px. Se tomó la
estructura de un mockup, **no sus cifras**: nada de tendencias, valor estimado,
entidades ni municipios, que la portada no calcula.
**Buscador y métrica del mapa (2026-09-26).** El hero lleva un buscador
(`hero-territorial/BuscadorFichas.jsx`) sobre `/api/secop`: busca en **objeto y
entidad, no en municipio**, y muestra 5 abiertos enlazados a su ficha; Enter (o
sin JS) va a `/licitaciones/explorar?q=`, que ahora lee `q` de la URL. El mapa
se colorea por procesos o por **monto en juego** (`ESCALONES_MONTO` en
`escala.ts`, cortes fijos por décadas). `slugificar`, `slugDeProceso` e
`idDesdeSlug` viven en `src/lib/secop/slug.ts` (puro, sin base) y
`agregados.ts`/`ficha.ts` las reexportan.
El mapa también se **filtra por tipo** (`indicesDeModo` en `sincronia.js`): el
hero cambia la clase de escalón de cada camino (`usePinturaEnMapa`), nunca un
color en línea, así que el CSS del mapa manda en todos los modos. **"Sin
procesos" va rayado** (patrón `#clr-mapa-sin` en el SVG) además de su tono: el
color no puede ser lo único que lo diga.

**Imagen para compartir (2026-09-26).** `app/opengraph-image.js` genera con
`next/og` la vista previa de 1200×630: el mapa real con la rampa del hero y el
total de abiertos, de `agregadosPortada()`, revalidada cada 6 h. Sin base, sale
sin cifras. Inter va en `woff` aparte (`app/fonts/inter-latin-{400,700}-normal.woff`)
porque Satori no lee `woff2`.
**Preguntas frecuentes (2026-09-26).** Antes del cierre de la portada va un FAQ
(`src/components/landing/preguntas/`), componente de servidor con `<details>`
nativo que llega a `PortadaCliente` por prop, como el mapa: no suma JS. El texto
y el JSON-LD `FAQPage` salen de la misma lista (`src/lib/landing/preguntas-frecuentes.ts`)
y cada respuesta dice lo que el producto hace hoy. Si cambia la ingesta, el
modelo de acceso o las alertas, se cambia ahí.

Antecedente (primera etapa, 2026-09-24): [plan de la etapa](docs/superpowers/plans/2026-09-24-landing-hero-kpis.md).
