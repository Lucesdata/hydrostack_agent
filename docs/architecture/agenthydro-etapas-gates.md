# AgentHydro — etapas y gates, mapeados a la arquitectura real

> Este documento formaliza, con el vocabulario de "etapas con gates binarios"
> de un system prompt de AgentHydro escrito fuera de este repo (celular,
> 2026-08-19), lo que **ya existe y está en producción** en HydroStack. Es
> descriptivo, no prescriptivo: no introduce piezas nuevas ni compromete
> trabajo futuro. Donde el prompt original asumía algo que no existe (Groq
> en el extractor, Playwright, tool-calling, match persistido), se marca
> explícitamente como `NO EXISTE` en vez de forzar la etiqueta.
>
> Contexto de producto: ver [CLAUDE.md](../../CLAUDE.md) y
> [ADR-0002](../adr/ADR-0002-deprecacion-dominio-septico.md). SECOP II es el
> único producto activo.

## Los dos modos

El prompt original distingue `origen: "sistema"` (pipeline interno, sin
usuario esperando respuesta) de `origen: "usuario"` (conversación en
`/mis-coincidencias`). Esa distinción sí es real en la arquitectura actual,
pero **no como un único agente que conmuta de modo** — son dos subsistemas
separados que no comparten runtime:

| Modo | Qué es hoy | Dónde |
|---|---|---|
| `sistema` | Pipeline ELT batch (Drizzle directo a Postgres), sin LLM en el camino salvo el extractor de pliegos | `src/lib/ingest/`, `app/api/cron/ingest`, `app/api/cron/alertas` |
| `usuario` | Motor de chat conversacional, multi-contexto, autenticado | `app/api/assistant/route.ts` + `src/lib/assistants/config.ts` |

No hay un solo "AgentHydro" que reciba `origen` como parámetro y bifurque
internamente. Formalizar el modo `sistema` como un agente LLM sería una
pieza nueva, no una que ya exista con otro nombre — hoy ese camino es batch
estructurado sin agente.

## Etapas — mapeo a código real

| Etapa (prompt) | Skill propuesto | Código real | Estado |
|---|---|---|---|
| 1 — Descubrimiento | `secop-discovery` | `src/lib/ingest/` (`runIngest.ts`, `pipeline.ts`, `sodaFetch.ts`, `watermark.ts`) → `raw_record` (`src/lib/db/schema/raw.ts`) | **Implementado**, sin ese nombre. Ingesta incremental por watermark/keyset, no por "descubrimiento" ad hoc |
| 2 — Clasificación de acceso | `document-access-classifier` | `src/lib/secop/document-access.ts` (`preclassify`, `probeDocument`) + `app/api/secop/probe/route.ts` | **Implementado, coincide casi literal.** Mismo enum `PUBLIC \| RESTRICTED \| NOT_PUBLISHED \| UNKNOWN`. `preclassify()` nunca asume `PUBLIC` por defecto (misma regla del gate propuesto). El probe es deliberadamente on-demand, un GET por proceso, nunca batch |
| 3 — Descarga y extracción | `analyze-pliego`, `extract-cantidades-obra`, `extract-plazos-garantias` | `src/lib/pliego/extractPliegoHybrid.ts` (reglas + fallback Gemini) → `app/api/pliego/extract/route.ts` | **Parcial, con una diferencia estructural real**: no hay descarga automática en dos capas (redirect directo → Playwright). El endpoint de extracción es **upload manual del usuario**, siempre — el propio código lo documenta: *"No hay URL de SECOP que probar aquí (el archivo lo trae el usuario, no lo trae la ingesta)"*. Lo que el prompt describe como fallback ante captcha es, hoy, el único camino |
| 4 — Validación matemática (Phase 0 gate) | `validate-math-consistency` | `src/lib/pliego/validate.ts` (`validatePliego`) | **Implementado** como gate del extractor, separado del semáforo de elegibilidad (ver Etapa 5) |
| 5 — Semáforo de elegibilidad | `semaforo-sector-cuantia`, `semaforo-plazo-zona`, `semaforo-habilitacion` | `src/lib/secop/verdict.ts` — `SectorialGate`, `CuantiaGate`, `PlazoGate`, `UbicacionGate`, `HabilitacionGate`, agregados en `AggregateVerdict` vía `buildVerdict()` | **Implementado y más granular** que lo propuesto: son 5 gates, no 3, ya agregados con `aggregateGateStatuses` (compartido, sin duplicación — ver commit `c4b595b`). `GateStatus` ya cubre el caso "no calculable" |
| 6 — Clasificación UNSPSC | `unspsc-classifier` | `src/lib/oferente/unspsc-catalog.ts`, usado dentro de `SectorialGate` en `verdict.ts` y en `src/lib/matching/` | **Implementado**, integrado al gate sectorial — no es un paso aislado |
| 7 — Persistencia y matching | `escribir_match` | `src/lib/matching/match.ts` (`matchProcesos`), `get-matches-for-perfil.ts` (`getMatchesForPerfil`), `record-coincidencias.ts` (`markCoincidenciasVistas`) | **Parcial, con una diferencia de modelo de datos**: el matching se **calcula on-demand** contra el perfil (no hay tabla de matches persistida que se escriba/reescriba). Lo único que se persiste es que un match fue *visto* (`record-coincidencias`), no el resultado del cruce en sí. La regla de "no duplicar si el timestamp es igual o más reciente" del prompt no tiene tabla equivalente hoy |
| 8 — Entrega (modo `sistema`) | JSON estructurado a Postgres | Escritura directa vía Drizzle en el pipeline de ingesta/transform | **Implementado sin LLM.** No hay agente que emita el JSON del prompt; la escritura es determinística, no generada por modelo |
| 8 — Entrega (modo `usuario`) | `asistente-contratacion` + `consultar_perfil_usuario` | `app/api/assistant/route.ts`, `src/lib/assistants/config.ts` (contextos `ejecucion`, `operacion`) | **Motor genérico implementado, contexto SECOP-matching no existe todavía.** El motor ya está diseñado para agregar un tercer contexto sin tocar el runtime (comentario explícito en el código). No hace tool-calling: es system-prompt + documento inyectado + streaming sobre Claude, no invocación de herramientas como `consultar_hydrostack_db` |

## Herramientas del prompt → equivalente real

| Herramienta propuesta | Equivalente real | Nota |
|---|---|---|
| `consultar_hydrostack_db` | Queries Drizzle directas en cada módulo (`db-search.ts`, `get-matches-for-perfil.ts`, etc.) | No es una tool invocable por un LLM; es código de aplicación normal |
| `navegar_secop` (Playwright) | — | **No existe.** No hay dependencia de Playwright en el repo. El único acceso "en vivo" a SECOP es el GET simple de `probeDocument()` |
| `analizar_pliego` | `extractPliegoHybrid()` | Coincide, pero recibe el archivo por upload, no por URL descargada automáticamente |
| `consultar_perfil_usuario` | `getPerfilDb()` (`src/lib/oferente/perfil-store.ts`, DB, usado en `/mis-coincidencias` autenticado) **y** `clientStore.ts` (localStorage, flujo anónimo pre-registro del wizard de licitaciones) | Dos rutas conviven. El prompt asume `user_id` siempre resuelto — cierto en `/mis-coincidencias`, falso en el wizard público, que es anónimo por diseño |
| `escribir_match` | No hay equivalente 1:1 — ver Etapa 7 | El matching es una vista calculada, no una tabla que se escribe |

## Correcciones a supuestos desactualizados del prompt original

- **"Extractor Hybrid (Groq + Anthropic API)"** → el extractor híbrido usa **reglas + fallback Gemini** (`GEMINI_API_KEY`). El extractor Groq existió pero fue **retirado** en la remediación del 2026-08-12; el archivo ya no está en el repo. Anthropic sí se usa, pero en el motor de chat (`/api/assistant`), un subsistema distinto al extractor de pliegos.
- **Naming fantasma**: el docstring de `app/api/pliego/extract/route.ts` todavía dice *"Cableado real de la extracción de pliegos (Hydro_Agent Capa 3)"* — resto de la nomenclatura del dominio séptico deprecado (ADR-0002), aplicado hoy a un endpoint 100% SECOP. No es el agente deprecado; es un comentario con nombre viejo que vale la pena limpiar en algún momento, sin urgencia.
- **hydroOS / "41 skills / 10 categorías"** → no existe como concepto de código en este repo. La organización real es librerías TS convencionales en `src/lib/*`.

## Lo que sí es una novedad real (no tiene equivalente hoy)

- Flujo de captcha → subida manual asociada a un `proceso_id` específico en el dropzone de `/mis-coincidencias`, con reanudación automática de la Etapa 3. Hoy el probe solo *clasifica* `RESTRICTED`; no hay un puente UI que capture la URL exacta del documento y la asocie a un proceso antes de pedir la subida.
- Modo `sistema` como agente LLM que emite JSON estructurado por proceso — hoy el pipeline batch no pasa por ningún modelo; sería una pieza nueva con costo por proceso a evaluar antes de construirla.
