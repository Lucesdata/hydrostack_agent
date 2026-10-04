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
- **Clasificación sectorial**: la pregunta binaria "¿esto es de agua?" la
  responde hoy el filtro de la ingesta (`src/lib/secop/ingest-net.ts`). El
  clasificador versionado que iba a escribir `clasificacion_sectorial`
  (`src/lib/classify/classifier.ts`) nunca se cableó y se borró el 2026-09-27;
  la tabla sigue en el esquema con 0 filas. Su estado previo está en git.
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
  `src/lib/pliego/extractPliegoHybrid.ts`, único extractor. Se llega a él por
  `uploadPliego()` (`src/lib/secop/pliego-upload.ts`) desde la §4 de la ficha o
  desde /mis-coincidencias; persiste en `pliego_proceso` y además cachea los
  requisitos estructurados en `requisitos_proceso`, que alimenta la compuerta de
  habilitación del semáforo. **Cuota: 5 pliegos por cuenta en 24 h móviles**
  (`src/lib/pliego/cuota.ts`, 2026-09-27): se reserva antes de llamar a Gemini,
  así que cuenta todo intento que llegue al modelo, también los que fallan; lo
  que se rechaza antes (no es PDF, pesa demasiado) no cuenta. Se guarda en
  `senal_usuario` con la señal `uso:extractor_pliego`, sin migración; si algún
  día se analizan las señales de intención, excluirla.
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
- **Coincidencias sin presupuesto publicado** (2026-09-26, PENDIENTES §43):
  `getMatchesForPerfil` pasa `incluirSinValor`, así que los procesos con valor 0
  o nulo entran con la cuantía en UNKNOWN pero **ordenados detrás** de los que
  cumplen el mínimo, sin quitarles plaza. El valor de una tarjeta se pinta con
  `formatValorProceso`: el 0 del SECOP nunca sale como "$0".
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
- **El perfil de oferente del navegador también muere al cerrar sesión**
  (2026-09-27). `SecopExplorer` copia el perfil de la cuenta a `localStorage`
  y el semáforo de cada ficha lo lee de ahí; antes sobrevivía al logout. Ahora
  `/logout` responde con `Clear-Site-Data: "storage"` y los tres botones de
  cerrar sesión (`FormCerrarSesion`) llaman a `clearOferentePerfil()` antes de
  enviar, para los navegadores que ignoran la cabecera. Cualquier dato de la
  cuenta que se copie al navegador tiene que borrarse ahí.
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
- **La zona fuera de cobertura es `WARN`, no `FAIL`** (2026-09-28, D2 de
  `docs/superpowers/specs/2026-09-28-ficha-bloque-decision.md`): la fuente
  publica la sede de la entidad, no el lugar de ejecución. Consecuencias: un
  proceso que solo fallaba por zona ya no es `overall === "FAIL"`, así que su
  razón se redacta sin cuenta; y el matching (/mis-coincidencias, alertas, vista
  previa del perfil) sigue excluyéndolo con `fueraDeCobertura()`, no por el
  `overall`. No devolver la zona a `FAIL` para "arreglar" el filtro.
- `usuario.plan` (`text`, default `'gratis'`) existe pero **ningún handler la
  lee todavía**, y hoy no hace falta: **ninguna capacidad es `pro`**. El
  análisis de pliego (`pliego_extraer`) pasó a `gratis` el 2026-09-27 por
  decisión de producto, y sus dos acciones (`pliego-actions.ts`) ya consultan
  `puede()`; `asistentes`, el otro `pro`, salió con los asistentes ese mismo
  día. El nivel `pro` sigue en el modelo, y /precios no pinta su columna
  mientras esté vacía (`seccionesPorNivel`). La columna ya existe en
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
Última actualización: 2026-10-04 (hero con cinco minifichas, recuadro de islas y país más grande; antes, 2026-10-02: hero «Explora el mapa» y franja de la ficha; antes, 2026-10-01: bloque de decisión en la ficha; zona fuera de cobertura en revisar; plazo desde la recepción de ofertas; hero v2: vista país, semáforo en los destacados).

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).


## Landing — Hero Territorial V2 (PR #54, 2026-09-25)

El hero vive en `src/components/landing/hero-territorial/` (`HeroTerritorial`,
`ListaTerritorios`, `FichaDepartamento`) y se monta desde
`PortadaCliente.jsx`. Se conservan fuentes de datos, rutas, paleta y mapa de
servidor. Las cifras no se sustituyen por cifras ni tendencias de un mockup.

- **Franja de KPIs del hero**: retirada el 2026-09-26 (*Procesos abiertos ·
  Colombia*, *Departamentos con procesos*, *Tipos de proyecto · Colombia*).
- **Dos zonas desde el 2026-09-28** (PR 2 de
  `docs/superpowers/plans/2026-09-27-portada-esencial.md`): a la izquierda
  titular, una frase, el buscador, un botón y el **resultado** del departamento
  (nombre, procesos, % nacional, sus tres abiertos de mayor presupuesto y
  «Ver las N fichas de X»); a la derecha el mapa, con «Opciones del mapa»
  (colorear por, tipo: dos `<select>`) y la lista de departamentos plegadas en
  `<details>`. Ya no hay tercera columna, tarjeta blanca, tooltip, `sticky`,
  segundo buscador, tipos por departamento, serie semanal ni enlaces a
  diagnóstico, precios o comparar en el hero: siguen en su página y en el pie.
  La columna del mensaje mide como mucho 380 px: con fracciones la tierra del
  mapa bajaba a 454 px a 1280. *(Sustituido el 2026-10-02 por el hero «Explora
  el mapa», abajo: columnas casi iguales, una tarjeta y sin conteo ni %.)*
- `agregadosPortada()` (`src/lib/secop/agregados.ts`) sigue alimentando el mapa,
  la lista y la ficha, calculado en el servidor en `app/page.js` con
  `revalidate` de 6 h y "abierto" según `condicionAbierto()`. `totalAbiertos`
  ya no se pinta, pero es la base del % de la ficha e incluye los procesos sin
  geografía resuelta: la suma de la lista **no cuadra** con él y es correcto.
  No "arreglarlo" sumando la lista. Si la base no responde, `totalAbiertos`
  queda `undefined`, la ficha muestra "—" y el mapa sale en gris.
- **Banda "El mercado ahora"**: retirada el 2026-09-26 junto con
  `BandaMercado` y `hace-cuanto.ts`. `/api/landing-stats`, que quedó sirviendo
  solo la línea «N procesos del sector» bajo el botón, salió el 2026-09-28 con
  esa línea y con `src/lib/landing/cifras.ts`.

**Hero con cinco minifichas (2026-10-04).** Sustituye la tarjeta única, el
buscador, la lista de departamentos, las «Opciones del mapa» y el mapa
coroplético del hero. Spec y reconocimiento:
`docs/superpowers/specs/2026-10-04-hero-cinco-minifichas.md`. Lo que hay:
- `muestraPortada()` (`src/lib/secop/muestra-portada.ts`): **una** consulta,
  `ORDER BY random() LIMIT 5` sobre todos los abiertos (`condicionAbierto()`)
  con `referencia` y objeto publicados, id `CO1.<X>.<n>` y departamento
  anclable. La llama `app/page.js` (ISR 6 h): la selección viaja en el HTML,
  así que es estable en la visita y sin sorteo en el navegador. Ya no se llama
  `agregadosPortada()` desde la portada (la imagen OG sigue usándola).
- Un contrato, `ProcesoPortada` (`src/lib/landing/proceso-portada.ts`), que
  pintan **a la vez** el mapa (servidor, `ColombiaChoropleth` con la prop
  `seleccion`) y las minifichas (cliente). Número de proceso =
  `proceso.referencia` (texto), identidad = `secop_proceso_id`, presupuesto =
  `valor_estimado` vía `montoConDato`, ubicación = sede de la entidad.
- Mapa en modo selección: departamentos en tono base, sin enlaces a facetas ni
  conteos; un anclaje **departamental** compartido por los procesos de un mismo
  departamento (no hay coordenadas de municipio) y una etiqueta enlazada por
  proceso en dos columnas laterales (`src/lib/mapa/etiquetas-procesos.ts`).
  Esos anclajes corrigen ocho de `ANCLAS` que caían fuera o pegados al borde
  (Risaralda, Cundinamarca…); un test lo exige. Bajo 600 px las etiquetas se
  ocultan y una línea dice el proceso activo.
- Color = familia de `tipo-color.ts` (sin tipo → neutro, nunca «redes»). Un
  estado compartido, el id activo (`sincronia.js`): tarjeta ↔ etiqueta,
  anclaje y departamento. En táctil, la tarjeta a la vista es la activa.
- La franja de la ficha enlaza el **primer** proceso del hero.
- **Recuadro de islas y país más grande (2026-10-04, segundo PR).** San Andrés y
  Providencia se dibujan con costas en detalle (`data/geo/san-andres-providencia.geo.json`,
  geoBoundaries CC BY 4.0, atribuido bajo la leyenda) a la misma escala, sobre
  el Caribe y **discretas**: sin marco ni fondo, pequeñas y con rótulo chico
  (el usuario pidió no remarcarlas, ocupaban mucho en el celular) (`src/lib/mapa/recuadro-islas.ts`,
  solo en el modo `seleccion`; los otros mapas siguen con su recuadro). Las
  etiquetas de la costa caribe van a la columna este para que su guía no cruce
  el recuadro. El mapa toma `100vh − 400 px` (360–620): ≈489 px de alto a
  1440×900, por lo que la fila de tarjetas puede quedar unos píxeles bajo el
  primer pantallazo (decisión del usuario: manda el mapa).

*(Sustituido el 2026-10-04 por el hero de cinco minifichas, arriba.)* **Hero «Explora el mapa. Entiende cada proceso.» (2026-10-02).** Reproduce una
referencia visual aprobada por el usuario
(`docs/superpowers/specs/2026-10-02-hero-mapa-ficha.md`, imagen al lado; plan en
`docs/superpowers/plans/`). Sustituye en parte al hero v2 de abajo, con tres
decisiones del usuario del mismo día: **se llega al primer departamento con
procesos** (`claveInicial()`: el primero con `n > 0` del orden del servidor), no
a la vista país, y sale «← Colombia»; la tarjeta **no lleva semáforo ni el gancho
«Crea tu perfil»** (el semáforo sigue en la ficha); el titular y el botón son los
de la imagen. Lo que hay ahora:
- Dos columnas casi iguales (rejilla de 1320 px, la misma de la franja de abajo);
  el H1 mide ≈55 px a 1440 para que «Entiende cada proceso.» quepa en su línea.
- A la izquierda, bajo el buscador: el nombre del departamento **confirmado** y
  **una** tarjeta (`TarjetaProceso` en `ResumenDepartamento.jsx`) con el primer
  destacado de `/api/departamento/[dpto]/resumen` —chip «PROCESO SECOP II»,
  objeto real, «Objeto · Presupuesto · Plazos · Requisitos» y «Ver ficha»—, más
  «Ver todos los procesos de X →» a la faceta. Ni conteo ni % nacional.
- **El destacado tiene un solo dueño, `PortadaCliente`**: tiene la clave
  confirmada y llama a `useResumenDepartamento`, y pasa el resultado al hero y a
  la franja. Ningún otro componente pide el resumen (lo vigila un test).
- `useResumenDepartamento` distingue `loading | live | empty | invalido | error`
  con la clave en cada resultado, aborta la petición al cambiar de departamento
  y solo guarda en caché las respuestas válidas; «Reintentar» no duplica
  peticiones. `destacadoDeApi()` (`proceso-resumen.js`) solo acepta una ruta
  `/licitaciones/<slug>` cuyo id coincide con el del proceso; si el primero no
  la tiene, no hay «Ver ficha» (no se cae al listado). `mapApiItem` salió con
  las filas del semáforo.
- Pasar el puntero solo resalta y escribe una línea en el panel del mapa
  («Caldas: 500 procesos abiertos»), sin región viva; nombre y tarjeta no
  cambian ni se atenúan. La lista elige; **el clic del mapa sigue navegando a la
  faceta** (decisión D). Con un tipo elegido, una ayuda dice que el tipo pinta el
  mapa y no filtra la tarjeta.
- Sin `overflow: clip` en `.hero`: recortaba el panel del buscador. Lo recorta
  `.map`, solo bajo 600 px, que es donde el SVG se ensancha.
- Debajo de 900 px el orden visual es mensaje, mapa, resultado (como antes),
  pero el orden del DOM sigue siendo mensaje, resultado, mapa: así el teclado en
  escritorio no cruza 33 enlaces del mapa antes de «Ver ficha».

**Hero v2 (2026-09-28).** *(Vista país, semáforo en los destacados y botón «Ver
las N fichas»: sustituidos el 2026-10-02, arriba.)* Se llega a la **vista país** (Colombia), no al
primer departamento; «← Colombia» vuelve a ella. Un solo botón, el del
resultado («Ver las N fichas», o las del departamento). La cabecera del mapa dice
que la base es la **sede de la entidad**, no el lugar de la obra. Cada destacado
lleva el semáforo **absoluto** (`compuertasAbsolutas()`, estado `DATO`) y ya no
el importe, que enuncia la compuerta Cuantía; el hero sobreescribe sus colores
para el oscuro (medidos en `contraste-oscuro.test.ts`). Para caber en 1366×768
pinta **dos** destacados y el semáforo **sin Habilitación** (decisión del
2026-09-29). **Sin cambios de backend** (decisión del 2026-09-30): la vista país
no trae destacados —aparecen al elegir un departamento—, la compuerta Plazo sale
«sin datos» porque la API no trae fecha de recepción ni apertura, y no hay línea
de «actualizado el …». Lo que haría falta para recuperarlo, en PENDIENTES §51.

**Franja de la ficha (2026-10-02).** `FichaViva.jsx` ya no lleva las cuatro
preguntas: «Del territorio a los detalles que necesitas.» y un panel
`.tema-claro` «Ficha del proceso» con cuatro accesos —Qué se contrata, Presupuesto,
Plazos, Qué falta verificar— a `#ficha-resumen`, `#ficha-dinero`,
`#ficha-plazos` y `#pliego` de **la ficha de la tarjeta del hero**
(`enlacesDeFicha()`). Sin destacado válido los cuatro títulos quedan como texto,
sin `href`. Lo que sigue del párrafo de abajo vale para «Cómo razona la ficha».

**La Ficha Viva (2026-09-26).** La ficha es el centro del producto; la portada
existe para llegar a una. Justo después del hero va la sección
`src/components/landing/ficha-viva/`: desde el 2026-09-28 (PR 3 del plan
portada-esencial) solo el titular, las cuatro preguntas con su estado real en
fila y un botón, más el enlace «Cómo razona la ficha». El esquema ilustrativo sin
cifras, el árbol de decisiones, el aviso de «Seguir sus cambios» y la leyenda de
color se mudaron a `/licitaciones/como-participar#como-razona`
(`ficha-viva/ComoRazonaFicha.jsx`, mismo módulo CSS; en esa página clara la
leyenda usa el color `claro` de cada familia). **Color = tipo de obra**
(`src/lib/classify/tipo-color.ts`: azul potable, marrón residual, gris redes,
punteado `otros`), siempre con su nombre y nunca como estado. No prometer
alertas por correo ni seguimiento de cambios mientras no existan: la sección
los marca como tales. Spec: `docs/superpowers/specs/2026-09-26-landing-ficha-viva.md`.

**Prueba de visitante (2026-09-26).** La lectura absoluta de la compuerta
`ubicacion` ya no afirma que la obra «se ejecuta» en la ubicación de la entidad
contratante: la fuente no publica lugar de ejecución. La observación, el árbol
de decisiones y las siguientes correcciones están en
`docs/superpowers/specs/2026-09-26-ficha-viva-prueba-y-correcciones.md`.
La ficha también etiqueta la ubicación de la entidad en los metadatos y la vista,
omite `areaServed` sin lugar de ejecución verificado, y dirige al expediente
original antes de ofrecer el diagnóstico general: este no comprueba el pliego
particular ni decide la elegibilidad individual.
El cierre de la ficha distingue `Abierto`, `Cerrado` y estado de apertura ausente;
el cerrado invita a explorar otros procesos y el estado ausente exige comprobar
en el expediente si todavía se reciben ofertas.

**Cabecera y sincronía (2026-09-26).** En `/` la barra de navegación va en
oscuro (`.clr-nav--oscuro`, en `Navbar.js`), sin el «En línea» desde el
2026-09-27; en el resto del sitio la barra sigue clara y lo conserva. Mapa, lista
y ficha del hero están sincronizados al pasar el puntero o el foco
(`hero-territorial/sincronia.js`): el mapa sigue siendo SVG de servidor, cada
camino lleva `data-dpto` y el hero escucha por delegación. El contorno del
elegido se dibuja en una capa aparte encima de todos (`.clr-mapa__marca`, prop
`capaSeleccion`): el cliente le copia el `d`, **no reordena el SVG**, que es de
React. El clic del mapa **sigue navegando** a la faceta (decisión D).

**Ficha del departamento y tooltip (2026-09-26).** La portada ya no usa
`procesosPorDepartamento()` sino `detallePorDepartamento()` (misma consulta,
con conteos `FILTER`: sigue siendo **una** consulta, no una quinta en paralelo —
PENDIENTES §40). Cada fila trae además `nuevos7d` (abiertos con
`fecha_publicacion` en los últimos 7 días; **no** es el mismo universo que
*nuevos · 7 días* de la banda), `montoAbierto` + `nConMonto` (suma del
presupuesto de los abiertos que lo publican; el 0 no cuenta), `nEntidades`
(entidades contratantes distintas entre los abiertos, `count(distinct)`) y
`tipos` por departamento. Desde el 2026-09-28 el hero solo usa `n` (el resultado)
y `montoAbierto`/`tipos` (pintar el mapa por monto o por tipo); los 7 días, el
monto y las entidades se leen en `/licitaciones/comparar`. El tooltip del mapa
salió: la vista previa la hace el resultado. Las facetas siguen con
`procesosPorDepartamento()`.

**Destacados y tendencia del departamento (2026-09-26).** El resultado muestra los
tres abiertos de mayor presupuesto (objeto, valor, entidad · municipio). La
sparkline de **publicados por semana** salió el 2026-09-28 por decisión del
usuario; la consulta semanal de la API se retiró después (PENDIENTES §50). No van en `detallePorDepartamento()`:
salen de `/api/departamento/[dpto]/resumen` (`src/lib/secop/resumen-departamento.ts`),
cacheado 6 h en el CDN, y se piden al **elegir** un departamento, no al pasar el
puntero. La consulta de los destacados se prueba contra PGlite con las
migraciones reales.

El hero usa colores propios en `hero-territorial.module.css` (tema oscuro) y no
los tokens de `globals.css`, así que `contraste.test.ts` no los cubre: los mide
`contraste-oscuro.test.ts`, que lee los `--aq-*` reales y los colores de la barra
y el árbol de la Ficha Viva. Texto blanco sobre azul va sobre
`--aq-cta` (`#0272b0`/`#0b7cbd`): el `#1a9be0` de antes daba 3,08:1.

**Rediseño visual (2026-09-26).** Sustituido el 2026-09-28 por las dos zonas de
arriba; debajo de 900 px el orden es mensaje, mapa (con la lista plegada) y
resultado. La rampa del mapa se redefine en el hero (`--aq-e0..5`) porque la
de `estilos.ts` sale de `--accent` sobre crema y en oscuro el escalón 0 salía
crema. Desde el 2026-09-27 es **de un solo tono** (`#13304a` → `#c4e8fc`): los
escalones altos eran turquesa y menta, se leían como otra categoría y el verde
agua rozaba el "cumple" del semáforo. La imagen para compartir usa la misma. Los rótulos del mapa ya no son cinco fijos: `src/lib/mapa/rotulos.ts`
elige los departamentos con más procesos y los coloca sin solaparse en un
viewBox ensanchado (`MARGEN_ROTULOS`). La portada pide 5 (`maxRotulos`) y los
pinta sin caja, con halo: la caja sigue en el SVG para que el algoritmo no los
solape. Se ocultan bajo 600 px, y ahí el SVG se ensancha para que el hueco de
los rótulos no encoja el país. Se tomó la
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
**Portada = mapa + Ficha Viva (2026-09-26).** La portada solo lleva el hero
territorial (mapa, lista, ficha del departamento y buscador) y la Ficha Viva.
**El ticker de fichas recientes salió el 2026-09-27** con `/api/procesos/recientes`
y el fondo animado "blueprint", por quejas de portada cargada (había 15
animaciones en el primer pliegue): plan de tres PR en
`docs/superpowers/plans/2026-09-27-portada-esencial.md`. `mapApiItem` vivió
en `src/components/landing/proceso-resumen.js` hasta el 2026-10-02. Salieron las rutas de intención ("¿En qué
momento estás?"), `S3Motor`, `S2Diagnostico`, `S7Acceso`, las preguntas
frecuentes (con su JSON-LD `FAQPage`), `S5DarkClosing` y la banda "El mercado ahora": repetían lo que ya dicen
el hero y la ficha, o tienen su propia página. `S7Acceso` sigue en `/precios` y
`/cuenta`; los demás componentes se borraron (su estado previo está en git). No
volver a apilar secciones debajo de la Ficha Viva sin una razón medida. La
portada conserva el JSON-LD `Dataset` (`src/lib/landing/dataset-jsonld.ts`, que
ahora también exporta `jsonLdSeguro`) para Google Dataset Search: sin cifras,
sin `license` ni `distribution`, con `isBasedOn` a los conjuntos de datos.gov.co.

**Quién compra y comparador (2026-09-26).** Dos rutas públicas nuevas,
estáticas (revalidate 6 h) y sin leer `searchParams`, como las facetas:
`/licitaciones/entidades` (las entidades con más procesos abiertos,
`src/lib/secop/compradores.ts`, una consulta con `count(*) over ()`; es la otra
mitad de «Quién suele competir aquí», la §7 de cada ficha) y `/licitaciones/comparar` (hasta tres departamentos
con las filas de `detallePorDepartamento()`; la selección va en el **hash** de
la URL, que no llega al servidor, `src/lib/secop/comparador.ts`). Los estilos de
un componente `"use client"` no se exportan desde él: una página de servidor
recibiría una referencia y no el texto (`comparador/estilos.ts`).

**La portada entera en oscuro (2026-09-26).** Ya no conviven un hero oscuro y
secciones claras: el contenedor de la portada lleva `.tema-oscuro`
(`globals.css`), que **redefine los tokens** en su ámbito, alias incluidos
(`--text-primary`, `--border`…, que en `:root` ya se resolvieron contra el
claro). Así la Ficha Viva cambia sin tocar su CSS, y `S7Acceso` sigue claro en
`/precios` y `/cuenta`.
En oscuro `--accent` es cian (texto y enlaces): los botones con texto blanco
usan `--accent-fill`, que existe en los dos temas. Lo que imita la ficha real
(el esquema de la Ficha Viva) lleva `.tema-claro`, como la tarjeta blanca del
hero. Lo mide `tema-oscuro.test.ts`. El resto del sitio sigue claro; sin
interruptor.

**Informe mensual (2026-09-26).** `/informe`: "El mercado del agua en
Colombia" del **último mes completo** en hora de Colombia
(`src/lib/secop/informe.ts`, cuatro consultas probadas contra PGlite), con lo
abierto hoy aparte. Estático (revalidate 6 h). "Descargar PDF" es la impresión
del navegador con una hoja de impresión propia: sin dependencias. **No pide
correo**: recogerlo exige la política de tratamiento (PENDIENTES §18) y
enviarlo, el correo configurado (§0).

**La ficha como centro (2026-09-27).** Siete páginas que respondían preguntas
fuera de la ficha se retiran en tres PR
(`docs/superpowers/plans/2026-09-27-ficha-como-centro.md`). PR 1 hecho: fuera
`/asistente/*` (con `/api/assistant`, `/api/documents` y las dependencias
`ai`/`@ai-sdk`), `/auditoria`, `/reportes/[slug]` (el correo de alertas ya no
genera reporte permanente), `/soluciones` y `/nosotros` (con `PlantaHero`). Cada
URL retirada redirige con un 308 (permanente) desde `next.config.js`. Las tablas
(`conversacion`, `mensaje`, `documento`, `al_reportes`, `al_descartes`) se
quedan: soltarlas es un `DROP` sobre la base viva.
PR 2 hecho: el pliego vive en la §4 de la ficha (`PliegoFicha.tsx`,
`src/lib/secop/pliego-ficha.ts`): con pliego subido muestra requisitos,
presupuesto (también por capítulo, desde el 2026-09-28) y causales con su
origen (reglas o modelo), y su cronograma llena «Fechas»; sin pliego, dice lo
que se desbloquea al subirlo y ofrece subirlo ahí mismo. La ficha
sigue estática: el formulario se pinta para todos, la acción de servidor
(`subirPliegoDesdeFichaAction`) exige sesión, revalida la ficha y devuelve el
resultado en el hash (`#pliego=ok`), que lee `AvisoPliego`. Salieron `/pliego`,
`/api/pliego/extract` y `/api/eligibility/extract` (su paso lo hace ahora
`uploadPliego`). El análisis de pliego es gratis (basta una cuenta) desde el
mismo día: `pliego_extraer` pasó de `pro` a `gratis` en la política.
PR 3 hecho: en la §7 cada rival es un `<details>` (`RivalesFicha.tsx`) que al
abrirse pide `GET /api/ficha/[id]/rival/[key]` → `historialComparable()`
(`src/lib/al/consulta/competidor.ts`): cuántas gana, tasa, mediana
adjudicado/presupuesto y sus últimos procesos comparables (enlazados a su
ficha), recortado al mismo tipo y departamento que la ficha; las multas no se
recortan. Exige la capacidad `competidores` (cuenta gratuita), así que la
respuesta es `private` y no se cachea en el CDN. `competidoresComparables()`
agrupa ya por `proveedor_key`, no por nombre. Salieron `/competidores`,
`/competidores/[key]` (redirigen a `/licitaciones/entidades`), `S4Competidores`,
`historialCompetidor`, `topCompetidores`, `precioReferencia` y
`getCifrasSector` (`cifras.ts` solo exporta `getProcesosVigilados`). Con esto el
plan queda completo.

**Bloque de decisión (2026-09-28).** Vive en «Quiero participar» de la ficha
interactiva (así lo pide su spec del 2026-09-29, que conserva los seis accesos
públicos): `BloqueDecision.tsx`, isla de cliente que sustituye a
`SemaforoConPerfil` con su misma regla (el HTML cacheado lleva la lectura
absoluta y nada del perfil). Veredicto en una frase, tres datos (cuánto, hasta
cuándo, cómo se contrata), las cinco compuertas dibujadas como **canal**
(`CanalCompuertas.tsx`: la forma dice el estado además de la palabra y el color;
el agua se corta en la primera que no cumple) y **un único siguiente paso**.
Frase y paso salen de funciones puras de `semaforo.ts` (`fraseVeredicto`,
`siguientePaso`, `ventanaDeOfertas`, `explicacionModalidad`, `fechaCortaDeDia`):
la frase se deriva del conteo de compuertas, nunca es un juicio aparte. «Quedan
N días» se calcula en el navegador. **Sin cuenta se define el perfil ahí mismo**
con `OferenteWizard` (localStorage); la cuenta se pide al subir el pliego, y
`sincronizarPerfilConCuenta()` (`clientStore.ts`, compartida con el explorador)
sube el perfil local a la cuenta nueva. `habilitacionGate` devuelve
`faltanEnPerfil` y `verdict-publico.ts` lo redacta con el `reason`. «Ver por
qué» es un botón y no un enlace `#…`: `ExploradorFicha` elige sección por el
hash y un ancla desconocida la devuelve al Resumen. La banda va en
`--accent-ocean` con `--on-ocean-muted` y `--accent-river`; las pastillas del
canal, al 6 % de su color (al 10 % el verde y el ámbar no llegaban a AA). Sin
pliego, `PliegoFicha` dice «lo que se desbloquea al subirlo» (solo lo que el
extractor saca). Spec y plan:
`docs/superpowers/{specs,plans}/2026-09-28-ficha-bloque-decision.md`; el paso 3
de ese plan (orden de secciones) quedó sustituido por las seis preguntas.

Antecedente (primera etapa, 2026-09-24): [plan de la etapa](docs/superpowers/plans/2026-09-24-landing-hero-kpis.md).

**Ficha interactiva móvil (2026-09-29).** `/licitaciones/[slug]` se organiza
en seis preguntas: Resumen, ¿Para qué?, Dinero, Plazos, Responsables y Metas.
`ExploradorFicha.tsx` solo selecciona contenido construido en el servidor;
sin JavaScript todas las secciones se pueden leer. Los controles guardan la
sección en el hash y permiten Atrás. Un enlace directo a una sección (`#ficha-participar`)
se vuelve a apuntar al cargar, sin animación: el navegador salta con las siete
visibles y el `scroll-behavior: smooth` competiría. `#pliego` y `#pliego=…` abren «Participar»,
que conserva el semáforo, `PliegoFicha` y `RivalesFicha`. Las fuentes se despliegan
por sección. Sigue la misma URL, las mismas consultas y el ISR de 12 horas.
Las fechas de publicación/recepción son columnas DATE: conservar su día de
calendario, sin convertir medianoche UTC al día anterior en Colombia.
La compuerta de plazo toma `fecha_recepcion` cuando no hay cronograma del pliego
(`toVerdictInput`), y esa fecha cierra al final del día en Colombia.
Necesidad, financiación y metas permanecen por verificar cuando no hay datos;
no deducir avance de obra del estado de contratación ni sitio de ejecución de
la ubicación de la entidad. Diseño aprobado y alcance en
`docs/superpowers/specs/2026-09-29-ficha-interactiva-movil.md`.
