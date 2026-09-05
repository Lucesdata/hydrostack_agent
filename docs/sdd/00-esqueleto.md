# SDD AquaLicita — Esqueleto v1

> **Estado:** esqueleto aprobado · **Fase 0 (V-F) completada 2026-09-05** — ver §3.
> Fuente única de verdad del esquema.
> **Fecha:** 2026-09-05 · **Consumidor:** Claude Code · **Alcance:** solo Colombia.
>
> ✅ **Fases 0, 0.5, 1, 2, 3 y 4 completadas 2026-09-05.** Las siete tablas
> `al_*` están en la base viva: motor de filtros determinista con auditoría de
> descartes, histórico con 27.035 filas (13.606 adjudicaciones + 13.429
> participaciones sin ganar, 2016→2026) e historial sancionatorio con 2.114
> registros. Siguiente: Fase 5 (máquina de estados de procesos).
>
> ⚠️ La base está en 449 MB. Con el plan Free (500 MB) el margen es del 10 % y el
> criterio de la Fase 2 exige 40 %: **queda pendiente de que Supabase Pro esté
> activo**. Con Pro (8 GB) el margen es del 94,5 %.
>
> Las specs de módulo (`docs/sdd/01-*.md`, `02-*.md`, …) se escriben una a una al
> construir cada módulo. **Ninguna spec de módulo define tablas por su cuenta**:
> si un módulo necesita una tabla, se añade aquí primero.

---

## 0. Auditoría previa: qué asume el brief y qué hay realmente en el repo

Verificado contra el árbol de trabajo el 2026-09-05. Sin esta sección, el plan de
entrega arrancaría construyendo cosas que ya existen y corriendo.

| Supuesto del brief | Realidad verificada | Consecuencia para el SDD |
|---|---|---|
| Base en Neon Postgres | La base viva es **Supabase** (`DATABASE_URL` → `aws-1-eu-west-1.pooler.supabase.com`). Neon es residuo con transferencia agotada (CLAUDE.md §3) | Toda migración se aplica contra Supabase. No usar `DATABASE_URL_UNPOOLED` |
| El cron podría estar scrapeando el portal | **No scrapea.** `src/lib/ingest/sodaFetch.ts` pega a `${SOCRATA_DOMAIN}/resource/{dataset}.json` con `X-App-Token` | V-F-1 se cierra documentando, no migrando. La "primera tarea del plan" del brief desaparece |
| Hay que verificar los dataset IDs de Socrata | `procesos: p6dx-8zbt`, `contratos: jbjy-vk9h`, verificados en vivo 2026-06-23, con `datasetResolver` por nombre canónico y el 4x4 como fallback (`src/lib/secop/config.ts:26`) | Solo quedan por verificar **PAA** y **proponentes/adjudicaciones** |
| Hay que construir el filtro sectorial de ingesta | **Ya existe y está cableado**: `src/lib/secop/ingest-net.ts`, red `(KEYWORDS ∪ UNSPSC agua-exclusivo) AND NOT segmento-80`, derivada de datos con precision/recall medidos (ADR-0001, `docs/fase-0/0.2.1-*`) | El módulo 5 **reusa** esta red; no la reinventa. Es también el insumo de `al_descartes` |
| `al_notificaciones` es nueva | `envio_log` ya existe con UNIQUE `(usuario_id, fecha, tipo)` e idempotencia insert-first (`src/lib/alertas/run-daily.ts`) | Se **extiende** con columnas de entregabilidad; no se duplica |
| `al_matches` es nueva | `coincidencia` ya existe con UNIQUE `(usuario_id, proceso_id)` y `vista_en` | Se **extiende** con `account_id` y `filtro_id`; no se duplica |
| `al_eventos_estado` es nueva | `contrato_evento` existe desde `drizzle/0000` con `valor_anterior/nuevo`, `estado_anterior/nuevo`, `delta jsonb` — pero **solo para contratos** | Se crea `al_proceso_evento` (misma forma, aplicada a `proceso`). El diff de adendas es de procesos, no de contratos |
| `al_filtros_usuario` es nueva | **Correcto, es nueva.** `alerta_preferencias` solo tiene `activo` y `hora_envio`. Hoy el criterio de búsqueda es el perfil de oferente, no un filtro del usuario | Tabla nueva con DDL literal en §4 |
| `secop_procesos` | No existe con ese nombre. El canónico es `proceso` + `contrato` + `raw_record` + `sync_log` | Se documentan como existentes e **intocables** |
| El canal email es una decisión pendiente | Resend ya cableado (`src/lib/email/send.ts`, `AUTH_RESEND_KEY`) con digest diario y unsubscribe de un clic | El módulo 6 extiende lo existente |

**Lo genuinamente nuevo:** histórico de adjudicaciones, sanciones, auditoría de
descartes, filtros por usuario, eventos de proceso con diff, reportes permanentes
y PAA.

---

## 1. Contexto y no-objetivos

AquaLicita es inteligencia de compras públicas en agua y saneamiento sobre SECOP II.
Este SDD cubre la capa que convierte la ingesta ya existente en producto de
inteligencia competitiva: contra quién se compite, a qué precio se gana, quién está
inhabilitado, qué cambió en un pliego y a quién avisar.

### No-objetivos (explícitos)

1. **Nada fuera de Colombia.** Ni España, ni OpenPLACSP, ni TED, ni como sección futura.
2. **No se construye multi-tenant.** Los códigos de equipo son fase 2. En v1
   `account_id` existe en el esquema y siempre vale `usuario.id`.
3. **No se listan los precios de las ofertas perdedoras.** La V-F-4 encontró
   `hgi6-6wh3` (Proponentes por Proceso SECOP II, 2,3 M filas desde 2015), así que
   **sí se lista quién se presentó a cada proceso**. Lo que ese dataset no publica
   es el valor ofertado por cada proponente: solo el del adjudicatario. Ese dato
   queda fuera y **no se añade scraping para conseguirlo**.
4. **La base no responde preguntas fuera del sector agua.** El filtro sectorial se
   aplica en ingesta (ADR-0001, Opción C). Una consulta del tipo "¿qué más contrata
   esta empresa?" devolverá solo su actividad en agua y saneamiento. Es una
   limitación estructural, no un bug; el segmento UNSPSC 80 está excluido y esos
   registros **no son reclasificables sin backfill**.
5. **No hay WhatsApp ni Telegram.** Email en fase 1.
6. **No se construye la ruta agente en lenguaje natural.** Se declara en §8 y se
   deja fuera de v1.
7. **No se consultan sanciones bajo demanda.** El modelo híbrido del brief
   preveía SIRI y RUES por NIT con caché de 30 días. Ninguna es accesible: SIRI
   solo publica cédulas (V-F-2) y la API de RUES responde **403** sin
   credenciales, sin dataset nacional alternativo en datos.gov.co. El módulo 3
   es masivo y local; `al_sanciones_cache` existe sin productor, esperando una
   fuente consultable.
8. **No se afirma que nadie esté inhabilitado.** Lo que hay son multas
   contractuales. Ver §4.7.
9. **No se toca autenticación, ni el extractor de pliegos, ni el veredicto Nivel 0.**
10. **No se construye scraping de ninguna fuente.**

---

## 2. Restricciones fijas

Estas no se negocian. Cualquier spec de módulo que las contradiga está mal.

| # | Restricción | Cómo se verifica que se cumple |
|---|---|---|
| R1 | **El backend, el esquema existente y la autenticación no se modifican.** | Ninguna spec toca `src/lib/supabase/`, `src/lib/acceso/`, `src/lib/pliego/`, `src/lib/eligibility/` |
| R2 | **Toda migración es aditiva.** Se permite `CREATE TABLE`, `CREATE INDEX` y `ALTER TABLE ... ADD COLUMN <nullable, sin default>`. Se prohíbe `DROP`, `ALTER COLUMN`, `RENAME`, y añadir `NOT NULL` a tabla poblada | `grep -E "DROP|ALTER COLUMN|RENAME" drizzle/00*.sql` sobre las migraciones nuevas devuelve vacío |
| R3 | **Solo Colombia.** | — |
| R4 | **Sin cambios de arquitectura ni de stack.** Sin brokers, sin colas externas, sin reescrituras. Toda cadencia se ejecuta con Vercel Cron sobre rutas Next existentes | `vercel.json` solo gana entradas de `crons`; `package.json` no gana dependencias de infraestructura |
| R5 | **La taxonomía sectorial es UNSPSC.** El catálogo vive en `src/lib/oferente/unspsc-catalog.ts` y la red de ingesta en `src/lib/secop/ingest-net.ts` | — |
| R6 | **Toda tabla nueva nace con `.enableRLS()`** (CLAUDE.md §4). No es negociable ni siquiera para tablas de catálogo | `SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity;` devuelve 0 filas |
| R7 | **Prefijo `al_` en toda tabla nueva.** Señal visual de qué es nuevo frente al esquema intocable | — |
| R8 | **`account_id` en toda tabla de datos de usuario.** En v1 `account_id = usuario.id`. **Ninguna consulta puede asumir que usuario y cuenta son lo mismo**: se filtra por `account_id`, nunca por `usuario_id`, en el código nuevo | `grep -rn "usuario_id" src/lib/**/al-*.ts` no aparece en cláusulas WHERE de los módulos nuevos |

### Nota sobre R2 y las tablas existentes

Las tres tablas existentes que reciben `ADD COLUMN` (`coincidencia`, `envio_log`,
`alerta_preferencias`) lo hacen con columnas **nullable y sin default**. Ninguna
query actual las nombra, así que el runtime no cambia el día de la migración. El
backfill (`UPDATE ... SET account_id = usuario_id`) es un paso posterior y separado,
y una fila con `account_id` NULL debe seguir funcionando en las rutas viejas.

---

## 3. Verificación de fuentes (V-F) — EJECUTADA 2026-09-05

Las seis se ejecutaron el 2026-09-05. **Cuatro pasan, una revierte una decisión a
favor y una BLOQUEA la Fase 2.** Salidas literales abajo.

No es la "Fase 0" del proyecto: aquélla es el test binario del extractor de pliegos
(extracción limpia de un PDF real, cero campos alucinados, matemáticas
consistentes, `NO_ENCONTRADO` honesto) y es independiente de esto.

### V-F-1 — Qué usa el cron actual · ✅ PASA

`src/lib/ingest/sodaFetch.ts` usa `SOCRATA_DOMAIN` (`https://www.datos.gov.co`).
No hay scraping. **No hay migración que hacer.**

Sub-tarea V-F-1b — la ejecución en producción que CLAUDE.md daba por no verificada:

```
       source       | status |          started_at           | records_ingested | records_failed
--------------------+--------+-------------------------------+------------------+----------------
 secop_ii_contratos | ok     | 2026-09-04 11:43:08.248833+00 |               47 |              0
 secop_ii_procesos  | ok     | 2026-09-04 11:43:06.658612+00 |              128 |              0
 secop_ii_contratos | ok     | 2026-09-03 11:43:08.139114+00 |              363 |              0
 secop_ii_procesos  | ok     | 2026-09-03 11:43:06.318006+00 |              141 |              0
 secop_ii_contratos | ok     | 2026-09-02 11:43:08.210968+00 |               12 |              0
 secop_ii_procesos  | ok     | 2026-09-02 11:43:06.885603+00 |               39 |              0
```

**Resultado:** cinco días consecutivos, ambas fuentes, `status='ok'`, cero fallos.
El cron corre en producción. **Actualizar CLAUDE.md**, que aún dice lo contrario.

Estado de la base: 90.076 procesos, 38.258 contratos, 128.334 raw_record.

- [x] Ejecutado 2026-09-05

### V-F-2 — Dataset masivo de sanciones · ⚠️ PASA CON FUENTE DISTINTA

Los dos candidatos que el brief suponía **no sirven**:

| Candidato | Filas | Veredicto |
|---|---|---|
| `iaeu-rcn6` Antecedentes de SIRI (Procuraduría) | 42.846 | **Descartado.** `GROUP BY nombre_tipo_identificacion` → 42.842 CÉDULA DE CIUDADANÍA + 4 CÉDULA EXTRANJERÍA. **Cero NITs.** Solo personas naturales: no cruza con `proveedor.nit_canonico` |
| `jr8e-e8tu` Responsabilidad Fiscal (CGR) | **60** | Descartado por volumen. No es el boletín nacional |
| `n2rx-k8hk` Procesos de Responsabilidad Fiscal | — | Descartado: es de la Contraloría **Departamental del Cauca** |

El Boletín de Responsables Fiscales **no está publicado como dataset Socrata
nacional en datos.gov.co**. Las búsquedas por "boletin deudores morosos" y
"sanciones contratistas" no devuelven nada utilizable.

**Fuentes que sí sirven, ambas de Colombia Compra Eficiente:**

| Id | Nombre | Filas | Campo identidad | Actualizado |
|---|---|---|---|---|
| `4n4q-k399` | Multas y Sanciones SECOP I | 1.714 | `documento_contratista` | 2026-09-01 |
| `it5q-hg94` | SECOPII - Multas y Sanciones | 548 | `as_codigo_proveedor_objeto` | 2026-09-04 |

Campos de `4n4q-k399`: `documento_contratista`, `nombre_contratista`,
`valor_sancion`, `fecha_de_firmeza`, `numero_de_resolucion`, `nit_entidad`,
`nombre_entidad`, `numero_de_contrato`, `municipio`.
Campos de `it5q-hg94`: `id_proceso`, `id_contrato`, `tipo_de_sancion`, `valor`,
`valor_pagado`, `fecha_evento`, `aplico_garantias`, `nombre_proveedor_objeto_de`.

**Consecuencia para el módulo 3 — cambia lo que promete.** Estas fuentes son
**multas contractuales de SECOP**, no inhabilidades. Responden "¿a este proveedor
lo han multado por incumplir?", que es una señal legítima y accionable, pero **no**
"¿está inhabilitado para contratar?". La segunda pregunta requiere SIRI y RUES por
NIT bajo demanda, y SIRI solo devuelve personas naturales, así que en la práctica
depende del representante legal — dato que no tenemos.

**El módulo 3 se renombra a "historial sancionatorio", no "inhabilidades".** La UI
debe decir exactamente eso. Prometer inhabilidades con estos datos sería falso.

- [x] Ejecutado 2026-09-05 · ids = `4n4q-k399`, `it5q-hg94` · 2.262 filas totales

### V-F-3 — Dataset del PAA · ✅ PASA

`9sue-ezhx` — **SECOPII - Plan Anual De Adquisiciones Detalle**, Colombia Compra
Eficiente. **11.623.049 filas**, actualizado 2026-09-04.

Los cuatro campos exigidos existen: `categorias_unspsc` ✓, `valor_total_esperado`
(y `valor_esperado_de_presupuesto`) ✓, `nit_entidad` ✓, `fecha_esperada_de_inicio` ✓.
Además: `descripcion`, `modalidad`, `annio`, `url_proceso`, `procesos_relacionados`
(que enlaza el PAA con el proceso real cuando sale), `version_del_paa`.

Complemento `b6m4-qgqv` — **SECOP II - PAA - Encabezado**: aporta `departamento_paa`
y `municipio_paa`, la geografía que el detalle no trae.

**Consecuencia:** 11,6 M de filas hacen **obligatorio** el filtro sectorial en
ingesta — el mismo `$where` de `ingest-net.ts` sobre `descripcion` y
`categorias_unspsc`. Aterrizar el PAA sin filtrar reventaría la base sola.

- [x] Ejecutado 2026-09-05 · id = `9sue-ezhx` (+ `b6m4-qgqv`) · UNSPSC = `categorias_unspsc`

### V-F-4 — Dataset de proponentes · ✅ EXISTE — revierte el no-objetivo §1.3

`hgi6-6wh3` — **Proponentes por Proceso SECOP II**, Colombia Compra Eficiente.
**2.301.286 filas**, cobertura 2015-02-14 → 2026-09-04, actualizado a diario.

Columnas: `id_procedimiento`, `nit_proveedor`, `proveedor`, `codigo_proveedor`,
`nit_entidad`, `entidad_compradora`, `nombre_procedimiento`, `fecha_publicaci_n`.

**La llave cruza directo:** `id_procedimiento` tiene el formato `CO1.REQ.*`, el
mismo de `proceso.secop_proceso_id`. Verificado sobre filas reales.

**Cobertura medida** (12 procesos nuestros al azar, `estado_actual='Seleccionado'`):

| Modalidad de la muestra | Cobertura |
|---|---|
| Licitación pública / Selección abreviada / Concurso de méritos | **10/12** (1 a 17 proponentes por proceso) |
| Contratación directa / Régimen especial | **0/12** |

Los ceros **no son un fallo del dataset**: la contratación directa no tiene
pluralidad de oferentes por definición. El dataset cubre lo que tiene que cubrir.

En el sector: 6.616 filas solo con `nombre_procedimiento LIKE '%ACUEDUCTO%'`, con
procesos de hasta **83 proponentes** (`CO1.REQ.1275505`, 83; `CO1.REQ.8603673`, 65;
`CO1.REQ.8592187`, 62 — los tres ya están en nuestra base).

**Lo que el dataset NO trae: el precio de cada oferta.** Solo quién se presentó.

**Consecuencia — el no-objetivo §1.3 se levanta parcialmente:**

- ✅ **SÍ** se puede responder "**contra quién** compito": la lista de proponentes
  por proceso, desde 2015.
- ✅ **SÍ** se puede responder "a qué precio **gana** el adjudicatario"
  (`valor_adjudicacion` del payload de procesos ya aterrizado).
- ❌ **NO** se puede responder "a qué precio **ofertó el que perdió**". Eso sigue
  siendo no-objetivo, y no se añade scraping para conseguirlo.

- [x] Ejecutado 2026-09-05 · id = `hgi6-6wh3` · existe: **sí**

### V-F-5 — Límite de crons de Vercel · ⚠️ PASA CON RESTRICCIÓN DURA

```
$ vercel api /v2/user | jq -r '.user.billing.plan'
hobby
```

**Plan Hobby.** Límites: **2 cron jobs como máximo** y **frecuencia diaria como
mínimo** (no se admiten cadencias sub-diarias). `vercel.json` ya declara exactamente
2, ambos diarios: `/api/cron/ingest` (11:00 UTC) y `/api/cron/alertas` (12:00 UTC).

**No queda ni un slot libre y la cadencia de 6 h del brief es imposible en Hobby.**

Consecuencias, sin cambiar arquitectura (R4):

1. **Despachador único obligatorio.** `app/api/cron/tick/route.ts` reemplaza a
   `/api/cron/ingest` en `vercel.json` y llama por orden: ingesta → detector de
   eventos → PAA (solo día 1) → sanciones (solo lunes). Las rutas nuevas existen
   como funciones, no como entradas de cron.
2. **La detección de cambios pasa de 6 h a diaria.** Y no se pierde nada: el canal
   de notificación es un correo diario agregado, así que detectar cada 6 h no
   adelantaría ni un aviso. La cadencia de 6 h del brief era un calco de
   LicitacionesARG, que notifica por Telegram en tiempo real. Con email diario es
   trabajo sin destinatario.
3. El `maxDuration` de 300 s pasa a ser compartido por todas las etapas. El tope de
   páginas (`CRON_MAX_PAGES`) debe repartirse, y cada etapa cierra su propia fila
   en `sync_log` para que un truncamiento sea atribuible.

- [x] Ejecutado 2026-09-05 · plan = **hobby** · crons = 2/2 usados · mínimo = diario

### V-F-6 — Cuota de Supabase · ❌ FALLA — BLOQUEA LA FASE 2

```
 total
--------
 484 MB
```

**El plan Free de Supabase tiene 500 MB. Estamos al 96,8 % ANTES de cargar nada.**

El criterio era `tamaño_actual + filas_nuevas × 4 KB < 90 %` de la cuota. Ya se
incumple sin el backfill. Quedan **≈16 MB** de margen.

Desglose:

| Tabla | Tamaño | Nota |
|---|---|---|
| `raw_record` | **319 MB** | 207 MB son payload jsonb puro (125 MB procesos + 82 MB contratos) |
| `proceso` | 95 MB | 90.076 filas |
| `contrato` | 49 MB | 38.258 filas |
| `proveedor` | 7,4 MB | |
| resto | < 2 MB | |

Índices muertos recuperables: `proceso_portafolio_idx` (5,6 MB, **0 scans**),
`contrato_proveedor_idx` (1,2 MB, **0 scans**), `contrato_pkey` (2,4 MB, 0 scans —
**no se toca**, es la PK). Total realista a recuperar: **≈7 MB**. No resuelve nada.

Verificaciones colaterales, ambas correctas:

- Tablas de `public` sin RLS: **0**. La regla R6 se cumple hoy.
- `usuario.plan`: **no existe en la base**. La migración `0017` sigue pendiente,
  como decía CLAUDE.md.

**Ninguna fase que escriba datos puede arrancar hasta resolver esto.** No es solo
la Fase 2: crear `al_filtros_usuario` cabe, pero la ingesta diaria sigue creciendo
~50 MB/mes contra un margen de 16 MB. **La base se llena sola en menos de tres
semanas aunque no se construya nada.**

- [x] Ejecutado 2026-09-05 · 484 MB / 500 MB = **96,8 %** · cabe: **no**

### Resumen y decisión pendiente

| V-F | Resultado |
|---|---|
| 1 · cron | ✅ Socrata, corriendo en prod, 5 días ok |
| 2 · sanciones | ⚠️ Sí, pero son multas contractuales, no inhabilidades. SIRI descartado (solo cédulas) |
| 3 · PAA | ✅ `9sue-ezhx`, 11,6 M filas, con UNSPSC |
| 4 · proponentes | ✅ Existe. Se levanta parte del no-objetivo §1.3 |
| 5 · crons | ⚠️ Hobby: 2/2 usados, mínimo diario. Despachador obligatorio |
| 6 · cuota | ❌ **484/500 MB. Bloquea todo.** |

**La Fase 1 no puede arrancar hasta decidir sobre la cuota** (§11, Fase 0.5).

---

## 4. Modelo de datos

### 4.0 Convenciones

- Todo lo nuevo vive en `src/lib/db/schema/aqualicita.ts`, exportado desde
  `src/lib/db/schema/index.ts`. Un solo archivo mantiene el prefijo `al_` visible
  de un vistazo y evita tocar los archivos de esquema existentes.
- `money` se replica del helper de `hechos.ts`: `numeric(name, { precision: 20, scale: 2 })`.
- `account_id` es `text`, **sin FK**: en v1 contiene `usuario.id`, en fase 2 apuntará
  a una tabla de cuenta que aún no existe. Poner FK ahora la forzaría a existir.
- Los ids nativos de SECOP se guardan como `text` (`secop_proceso_id`,
  `id_contrato`), no como FK al uuid interno — misma convención que `coincidencia`.

### 4.1 Tablas existentes: intocables, documentadas

| Tabla | Papel en este SDD | Se toca |
|---|---|---|
| `raw_record` | Landing append-only (source, source_record_id, payload jsonb, payload_hash, batch_id). UNIQUE `(source, source_record_id)` | No |
| `sync_log` | Control del incremental por fuente; el watermark es `MAX(watermark_to) WHERE source=? AND status IN ('ok','partial')` | No. Los módulos nuevos **reusan** este mecanismo, con `source` propio |
| `proceso` | Entidad canónica del proceso. `secop_proceso_id` UNIQUE, `portafolio_id`, `estado_actual`, `valor_estimado`, `document_access` | No |
| `contrato` | Entidad canónica del contrato. `secop_contrato_id` UNIQUE, `proveedor_id`, `valor_inicial/actual` | No |
| `contrato_evento` | Log append-only de cambios en **contratos**, con `delta jsonb` | No. `al_proceso_evento` es su gemelo para procesos |
| `entidad`, `proveedor`, `geografia` | Catálogos, `nit_canonico` UNIQUE en las dos primeras. **Son la llave de relación de todo lo nuevo** | No |
| `clasificacion_sectorial` | Clasificación derivada versionada por `clasificador_version` | No |
| `usuario`, `oferente_perfil` | Cuenta y perfil de elegibilidad | No |
| `coincidencia`, `envio_log`, `alerta_preferencias` | Matches, envíos y preferencias de entrega | **Solo `ADD COLUMN` nullable** (§4.8) |
| `diagnostico` | Cuestionario público de preparación | No |

### 4.2 `al_filtros_usuario` — DDL completo

Criterios de búsqueda declarados por el usuario. Es lo que hoy no existe: el
matching actual deriva todo del perfil de oferente. Un usuario puede tener varios
filtros (`"PTAR en Antioquia > 500M"` y `"micromedición nacional"`).

```ts
export const alFiltrosUsuario = pgTable(
  "al_filtros_usuario",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** v1: siempre igual a usuario.id. Sin FK — la tabla de cuenta llega en fase 2. */
    accountId: text("account_id").notNull(),
    usuarioId: text("usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    nombre: text("nombre").notNull(),
    activo: boolean("activo").default(true).notNull(),

    /** Códigos UNSPSC completos, sin el prefijo "V1." (se añade al construir el WHERE). */
    unspsc: text("unspsc").array(),
    /** Términos libres, MAYÚSCULAS y accent-safe — misma regla que ingest-net.ts. */
    palabrasClave: text("palabras_clave").array(),
    /** Términos que descalifican aunque haya match positivo. */
    palabrasExcluidas: text("palabras_excluidas").array(),
    /** NITs canónicos (solo dígitos, sin DV) — cruza con entidad.nit_canonico. */
    entidadesNit: text("entidades_nit").array(),
    /** Códigos DIVIPOLA de 5 dígitos o de 2 (departamento completo). */
    divipola: text("divipola").array(),
    modalidades: text("modalidades").array(),
    valorMin: numeric("valor_min", { precision: 20, scale: 2 }),
    valorMax: numeric("valor_max", { precision: 20, scale: 2 }),

    /** Qué transiciones notifica este filtro: subset de apertura|adenda|adjudicacion. */
    eventosNotificables: text("eventos_notificables")
      .array()
      .default(sql`ARRAY['apertura','adenda','adjudicacion']::text[]`)
      .notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("al_filtros_account_idx").on(t.accountId, t.activo),
    index("al_filtros_usuario_idx").on(t.usuarioId),
  ]
).enableRLS();
```

**Semántica del filtro** (fijada aquí para que ninguna spec la reinterprete):
un proceso hace match si
`(unspsc ∩ proceso.unspsc ≠ ∅  OR  cualquier palabraClave ∈ objeto‖nombre‖descripción)`
`AND ninguna palabraExcluida ∈ objeto‖nombre‖descripción`
`AND (entidadesNit vacío OR entidad.nit_canonico ∈ entidadesNit)`
`AND (divipola vacío OR proceso.geografia_id LIKE ANY(divipola‖'%'))`
`AND (modalidades vacío OR proceso.modalidad ∈ modalidades)`
`AND valor_estimado BETWEEN COALESCE(valorMin,0) AND COALESCE(valorMax,'infinity')`.
Un array NULL o vacío significa "sin restricción", nunca "no coincide con nada".

### 4.3 `al_proceso_evento` — DDL completo

Máquina de estados de procesos. Gemelo de `contrato_evento`, aplicado a `proceso`.
Append-only. **La adenda se trata como diff, no como aviso**: es la transición de
mayor valor.

```ts
export const alProcesoEvento = pgTable(
  "al_proceso_evento",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** FK al uuid interno; el id nativo se guarda además para joins baratos. */
    procesoId: uuid("proceso_id")
      .notNull()
      .references(() => proceso.id, { onDelete: "cascade" }),
    secopProcesoId: text("secop_proceso_id").notNull(),

    /** 'apertura' | 'adenda' | 'adjudicacion' — text, no enum: añadir un valor no debe pedir migración. */
    tipoEvento: text("tipo_evento").notNull(),

    /** Timestamp de la fuente (fecha_de_ultima_publicaci); NULL si la fuente no lo trae. */
    sourceObservedAt: timestamp("source_observed_at", { withTimezone: true }),
    detectedAt: timestamp("detected_at", { withTimezone: true }).defaultNow().notNull(),

    estadoAnterior: text("estado_anterior"),
    estadoNuevo: text("estado_nuevo"),
    valorAnterior: numeric("valor_anterior", { precision: 20, scale: 2 }),
    valorNuevo: numeric("valor_nuevo", { precision: 20, scale: 2 }),
    fechaCierreAnterior: date("fecha_cierre_anterior"),
    fechaCierreNueva: date("fecha_cierre_nueva"),

    /**
     * Diff completo campo a campo:
     *   [{ campo: "valor_estimado", antes: "120000000", despues: "145000000" }, ...]
     * Es lo que se renderiza en el correo. Los campos que se diffean se declaran
     * en la spec del módulo 4; los campos volátiles de ingest/sources.ts quedan
     * EXCLUIDOS del diff igual que del payload_hash, o se generan adendas espurias.
     */
    delta: jsonb("delta"),

    /** Raw que produjo la detección: trazabilidad hasta el snapshot exacto. */
    rawRecordId: uuid("raw_record_id").references(() => rawRecord.id),
    /** Hash del payload nuevo — la llave de idempotencia real (ver índice). */
    payloadHash: text("payload_hash").notNull(),
  },
  (t) => [
    /**
     * Idempotencia: el detector es un cron que reprocesa ventanas solapadas.
     * Un mismo (proceso, tipo, hash del snapshot) no puede producir dos eventos.
     */
    uniqueIndex("al_proceso_evento_idem_uq").on(t.procesoId, t.tipoEvento, t.payloadHash),
    index("al_proceso_evento_detected_idx").on(t.detectedAt),
    index("al_proceso_evento_proceso_idx").on(t.secopProcesoId),
  ]
).enableRLS();
```

### 4.4 `al_descartes` — DDL completo

Auditoría del matching determinista. Existe porque un fallo en la curación de
UNSPSC o de sinónimos **no produce falsos positivos: produce silencio**, y el
silencio es invisible sin esta tabla.

Registra dos capas de descarte: el que hace la red de ingesta (`ingest-net.ts`,
antes de aterrizar) y el que hace el filtro de un usuario (después).

```ts
export const alDescartes = pgTable(
  "al_descartes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** 'ingesta' (red sectorial) | 'filtro' (criterio de un usuario). */
    capa: text("capa").notNull(),
    /** NULL cuando capa='ingesta': todavía no hay usuario en juego. */
    accountId: text("account_id"),
    filtroId: uuid("filtro_id").references(() => alFiltrosUsuario.id, { onDelete: "cascade" }),

    secopProcesoId: text("secop_proceso_id").notNull(),
    /** Objeto recortado a 300 chars: suficiente para auditar a ojo sin duplicar el payload. */
    objetoResumen: text("objeto_resumen"),
    unspscObservado: text("unspsc_observado"),
    valorEstimado: numeric("valor_estimado", { precision: 20, scale: 2 }),
    entidadNit: text("entidad_nit"),
    divipola: text("divipola"),

    /**
     * 'sin_unspsc_ni_keyword' | 'segmento_80_excluido' | 'palabra_excluida'
     * | 'fuera_de_cuantia' | 'fuera_de_zona' | 'entidad_no_listada'
     * | 'modalidad_no_listada'
     */
    motivo: text("motivo").notNull(),
    /** Evidencia estructurada: qué término evaluó, contra qué campo, con qué resultado. */
    evidencia: jsonb("evidencia"),

    /** Versión de la red/diccionario que produjo el descarte — sin esto no es auditable. */
    redVersion: text("red_version").notNull(),
    creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("al_descartes_capa_motivo_idx").on(t.capa, t.motivo),
    index("al_descartes_creado_idx").on(t.creadoEn),
    index("al_descartes_account_idx").on(t.accountId),
  ]
).enableRLS();
```

**Retención — fijada en 90 días** (`DIAS_RETENCION` en
`src/lib/al/matching/registrar-descartes.ts`), podados al final de cada corrida.
Además, **los descartes de un filtro se reemplazan en cada corrida, no se
acumulan**: interesa el estado actual de qué se está perdiendo, no una copia por
cada ejecución del cron. El crecimiento sin límite de una append-only ya llenó
la cuota una vez (`raw_record`, agosto de 2026).

**La capa `ingesta` no se puede registrar desde la base.** Esos procesos nunca
llegan a `raw_record`: la red se aplica como `$where` en Socrata, así que lo
descartado se queda en la fuente. Auditarlo es ir a buscarlo —
`scripts/al-auditar-red.ts` toma una muestra SIN el filtro sectorial y la evalúa
contra la misma red (`matchesSectorNet`, que ya existía y es la autoridad). Es un
sondeo a mano, no una etapa del cron: es caro y su valor está en ejecutarlo
cuando se toca la red o el diccionario.

### 4.5 `al_reportes` — DDL completo

Reportes web permanentes: URL propia, indexable, con analítica. No efímeros.

```ts
export const alReportes = pgTable(
  "al_reportes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Segmento de URL: /reportes/<slug>. Inmutable una vez publicado. */
    slug: text("slug").notNull(),
    /** 'publico' (indexable, sin datos de cuenta) | 'privado' (requiere sesión y account_id). */
    visibilidad: text("visibilidad").notNull().default("privado"),
    /** NULL solo si visibilidad='publico'. */
    accountId: text("account_id"),

    /** 'digest_diario' | 'competidor' | 'entidad' | 'mercado_departamento' */
    tipo: text("tipo").notNull(),
    titulo: text("titulo").notNull(),
    /** Parámetros que lo generaron: NIT del competidor, DIVIPOLA, rango de fechas… */
    parametros: jsonb("parametros").notNull(),
    /** Contenido ya resuelto. El reporte NO se recalcula al visitarlo: es permanente. */
    payload: jsonb("payload").notNull(),

    generadoEn: timestamp("generado_en", { withTimezone: true }).defaultNow().notNull(),
    /** Se actualiza al regenerar; el slug no cambia. */
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).defaultNow().notNull(),
    vistas: integer("vistas").default(0).notNull(),
  },
  (t) => [
    uniqueIndex("al_reportes_slug_uq").on(t.slug),
    index("al_reportes_account_idx").on(t.accountId),
    index("al_reportes_tipo_idx").on(t.tipo),
  ]
).enableRLS();
```

### 4.6 `al_sanciones_cache` — DDL completo

Caché de las consultas bajo demanda (SIRI, RUES). No depende de conocer el esquema
de la fuente: guarda el payload crudo.

```ts
export const alSancionesCache = pgTable(
  "al_sanciones_cache",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** 'siri' | 'rues' */
    fuente: text("fuente").notNull(),
    /** NIT canónico: solo dígitos, sin DV — misma normalización que proveedor.nit_canonico. */
    nitCanonico: text("nit_canonico").notNull(),

    /** Respuesta cruda de la fuente. Su interpretación vive en la spec del módulo 3. */
    payload: jsonb("payload"),
    /** 'ok' | 'no_encontrado' | 'error' — un error también se cachea, con TTL corto. */
    estado: text("estado").notNull(),
    /** Resumen booleano para la ruta rápida: ¿hay algo que impida contratar? */
    tieneHallazgo: boolean("tiene_hallazgo"),

    consultadoEn: timestamp("consultado_en", { withTimezone: true }).defaultNow().notNull(),
    /** consultadoEn + 30 días para 'ok'; + 24 h para 'error'. */
    expiraEn: timestamp("expira_en", { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex("al_sanciones_cache_fuente_nit_uq").on(t.fuente, t.nitCanonico),
    index("al_sanciones_cache_expira_idx").on(t.expiraEn),
  ]
).enableRLS();
```

### 4.7 Tablas pendientes de la V-F: entidad, campos mínimos y llave de relación

Su DDL definitivo se cierra en la spec de su módulo, **después** de la V-F, y
entonces se actualiza este esqueleto. Aquí solo se fija lo que no puede cambiar.

#### `al_oferentes_historico` — ✅ DDL CERRADO 2026-09-05

Definición viva en `src/lib/db/schema/aqualicita.ts`, migración `0020`.

**Entidad:** la participación de un proveedor en un proceso del sector. Una fila
= un (proceso, proveedor); `adjudicado` distingue al ganador del resto.

**Dos decisiones que el DDL preliminar no anticipaba y que la carga real impuso:**

**1. La llave de deduplicación es `proveedor_key`, no `proveedor_id`.**
El esqueleto preveía `UNIQUE (secop_proceso_id, proveedor_id)`. Eso no deduplica:
solo el 49 % de las adjudicaciones trae NIT, y en Postgres los NULL de un índice
único no colisionan entre sí — el backfill habría insertado duplicados en cada
corrida para la mitad de las filas. `proveedor_key` es `nit:<canónico>` cuando hay
NIT creíble y `nom:<nombre normalizado>` cuando no.

**2. Hay que rechazar los documentos comodín.** La fuente publica "0", "0000",
"1", "999999999", "1111111111" en el campo de documento. Aceptarlos fusiona
empresas sin relación bajo un mismo competidor: medido en la carga real, "0"
agrupaba 22 razones sociales distintas y los comodines de dígito repetido otras
19. `nitPlausible()` exige 6–12 dígitos y ningún dígito repetido; lo implausible
se trata como ausente y la llave cae al nombre — separa de más antes que fusionar
de menos. Sin esta regla había 13.857 proveedores distintos; con ella, **13.965**.

**Fuentes, ambas verificadas:**

| Origen | Qué aporta | Escritura |
|---|---|---|
| `raw_record` (procesos ya aterrizados) | El adjudicatario y su precio. Sin red | `onConflictDoUpdate` — una adjudicación puede corregirse en la fuente |
| `hgi6-6wh3` vía Socrata | Los demás proponentes | `onConflictDoNothing` — **nunca degrada** una fila de adjudicatario |

Las dos pasadas convergen en cualquier orden. De 15.573 filas de proponentes
descargadas, 2.144 colisionaron con su fila de adjudicatario: es el ganador, que
no debe contarse dos veces.

**El criterio de carga NO es el estado del proceso.** `estado_del_procedimiento
= 'Seleccionado'` **no** implica adjudicado: 23.195 de nuestros 36.724
"Seleccionado" tienen `adjudicado = 'No'`. El criterio es `adjudicado = 'Si'`.
Usar el estado habría cargado un 63 % de filas sin ganador.

**Índices:** UNIQUE `(secop_proceso_id, proveedor_key)`; `(proveedor_nit,
fecha_adjudicacion)` para el historial de un competidor; `(entidad_id,
fecha_adjudicacion)`; `unspsc`; `adjudicado`.

**No lleva `account_id`:** es dato de mercado, común a todas las cuentas.

#### `al_sanciones` — ✅ DDL CERRADO 2026-09-05

Definición viva en `src/lib/db/schema/aqualicita.ts`, migración `0021`.

**Entidad:** una multa contractual impuesta a un contratista del Estado.
**No es una inhabilidad**, y el módulo se llama "historial sancionatorio"
precisamente por eso.

**El hallazgo que define la tabla: cada fuente cruza por una llave distinta.**
No estaba previsto y se midió, no se supuso:

| Fuente | Filas cargadas | Campo de identidad | Cruce |
|---|---|---|---|
| `4n4q-k399` SECOP I | 1.569 | `documento_contratista` | **Por proveedor.** 250 de 1.096 documentos tienen forma de NIT de empresa; 36 sanciones cruzan con 28 proveedores nuestros |
| `it5q-hg94` SECOP II | 545 | `as_codigo_proveedor_objeto` | **Por proceso.** Sus 251 documentos son de 7–8 dígitos y **ninguno** tiene forma de NIT de empresa: 0 cruzan. Su `id_proceso` (`CO1.BDOS.*`) sí empata con `proceso.portafolio_id` — 16 sanciones enganchadas |

Por eso la tabla admite las dos vías (`nit_canonico` → `proveedor_id`,
`portafolio_id` → `proceso_id`) y **ninguna es obligatoria**.

**Sin `vigente_hasta`.** Ninguna fuente publica vigencia y una multa contractual
no caduca: se guarda `fecha_firmeza` y no se implementa caducidad.

**Llave de deduplicación `registro_key`**, compuesta y determinista — la misma
lección de `al_oferentes_historico.proveedor_key`: un UNIQUE sobre columnas
nulables no deduplica y la recarga semanal duplicaría todo cada lunes. De 1.714
filas de origen en SECOP I quedan 1.569: la fuente publica registros repetidos.

**Tres clases de basura filtradas, todas medidas:**

1. **Autorreferencia** (14 filas): `documento_contratista` es el NIT de la
   *propia entidad* y `nombre_contratista` un número de resolución. La fila se
   conserva —la sanción existió— pero no se promueve a NIT: cruzarla diría que
   un hospital se sancionó a sí mismo.
2. **Documentos de prueba** (6 filas): `123456789` / "PRUEBA CONTRATISTA".
   `nitPlausible()` rechaza ahora también las secuencias de teclado.
3. **Comodines**: heredado del histórico, dígito repetido.

Quedan 2.069 filas cruzables de 2.114.

**La consulta separa evidencia de inferencia.** `sancionesDeProveedor()` devuelve
`directas` (la sanción nombra su documento) y `porProceso` (la sanción cuelga de
un proceso que ganó) en campos distintos. La segunda es probable, no cierta: el
sancionado podría ser otro interviniente. Mezclarlas presentaría una inferencia
como un hecho.

**`cobertura.cruzablePorDocumento: false` significa "no lo sabemos", no "está
limpio".** Sin NIT creíble la vía directa no aplica, y la UI debe decirlo así.

### 4.8 `ALTER TABLE` sobre tablas existentes (aditivos)

Todas las columnas son **nullable y sin default**. Ninguna query actual las nombra.

```ts
// coincidencia — pasa a poder venir de un filtro explícito, no solo del perfil
accountId: text("account_id"),
filtroId: uuid("filtro_id").references(() => alFiltrosUsuario.id, { onDelete: "set null" }),

// envio_log — entregabilidad
accountId: text("account_id"),
reporteId: uuid("reporte_id").references(() => alReportes.id, { onDelete: "set null" }),
proveedorMensajeId: text("proveedor_mensaje_id"),   // id de Resend
estadoEntrega: text("estado_entrega"),              // 'delivered'|'bounced'|'complained'|'opened'
entregaActualizadaEn: timestamp("entrega_actualizada_en", { withTimezone: true }),

// alerta_preferencias — el usuario elige qué transiciones le llegan
accountId: text("account_id"),
eventosNotificables: text("eventos_notificables").array(),
```

**Backfill, en migración separada y posterior:**
`UPDATE coincidencia SET account_id = usuario_id WHERE account_id IS NULL;` (ídem
para las otras dos). El código nuevo lee `COALESCE(account_id, usuario_id)` hasta
que el backfill esté verificado; después, solo `account_id`.

---

## 5. Pipeline de ingesta

### 5.1 Lo que ya existe y se reusa sin tocar

`runIngestPipeline` (`src/lib/ingest/pipeline.ts`) orquesta: keyset/sweep paginado
(`pagination.ts`) → `sodaFetchPage` → `raw_record` con `payload_hash` que **excluye
los campos volátiles** declarados en `sources.ts` → transform → entidades canónicas.
El watermark vive en `sync_log` como texto verbatim de Socrata, comparado
lexicográficamente para evitar drift de zona horaria.

**Toda fuente nueva se declara como un `IngestSource` más** en
`src/lib/ingest/sources.ts` y hereda idempotencia, watermark, deduplicación por
hash y registro en `sync_log` gratis. Esto es lo que hace que R4 (sin cambios de
arquitectura) sea cumplible.

### 5.2 Fuentes y cadencias

**V-F-5 resuelta: plan Hobby, 2 crons como máximo, frecuencia mínima diaria, y los
2 ya están usados.** El despachador único no es una alternativa, es la única forma.

`vercel.json` mantiene exactamente dos entradas: `/api/cron/tick` (que reemplaza a
`/api/cron/ingest`) y `/api/cron/alertas`. Todo lo demás son funciones que `tick`
invoca por orden, no rutas de cron.

| Etapa dentro de `tick` | `source` | Cuándo corre | Módulo | Estado |
|---|---|---|---|---|
| SECOP II procesos | `secop_ii_procesos` | Diaria | — | **Existe** |
| SECOP II contratos | `secop_ii_contratos` | Diaria | — | **Existe** |
| Detector de eventos | relee `raw_record` | Diaria | 4 | Nuevo |
| Proponentes | `secop_ii_proponentes` (`hgi6-6wh3`) | Diaria | 2 | Nuevo |
| Sanciones (recarga completa) | `secop_multas` (`4n4q-k399`, `it5q-hg94`) | Lunes | 3 | Nuevo |
| PAA | `secop_paa` (`9sue-ezhx`) | Día 1 del mes | 1 | Nuevo |
| Histórico adjudicaciones | — | Carga inicial única, fuera del cron | 2 | script `npm run al:backfill` |
| RUES | — | Bajo demanda, caché 30 d | 3 | `/api/al/sanciones/[nit]` — sin cron |

**La cadencia de 6 h del brief se abandona, y no se pierde nada.** El canal es un
correo diario agregado: detectar un cambio a las 03:00 en vez de a las 09:00 no
adelanta ningún aviso. Esa cadencia era un calco de LicitacionesARG, que notifica
por Telegram en tiempo real. Con email diario es trabajo sin destinatario.

**Reparto del `maxDuration`:** los 300 s pasan a ser compartidos. `CRON_MAX_PAGES`
se reparte por etapa y **cada etapa abre y cierra su propia fila en `sync_log`**,
para que un truncamiento sea atribuible a una fuente concreta. Una etapa que falla
no aborta las siguientes: `tick` las ejecuta en secuencia con `try/catch` por etapa
y devuelve 500 solo si falla la ingesta base.

### 5.3 Idempotencia y deduplicación — reglas por tabla

| Tabla | Llave de idempotencia | Comportamiento en colisión |
|---|---|---|
| `raw_record` | UNIQUE `(source, source_record_id)` + `payload_hash` | Si el hash no cambió, no se reescribe: no hubo cambio real |
| `al_proceso_evento` | UNIQUE `(proceso_id, tipo_evento, payload_hash)` | `onConflictDoNothing`. Reprocesar la misma ventana no duplica eventos |
| `al_oferentes_historico` | UNIQUE `(secop_proceso_id, proveedor_id)` | `onConflictDoUpdate` sobre valores (una adjudicación puede corregirse en la fuente) |
| `al_sanciones` | UNIQUE `(fuente, nit_canonico, tipo, vigente_desde)` | `onConflictDoNothing` |
| `al_sanciones_cache` | UNIQUE `(fuente, nit_canonico)` | `onConflictDoUpdate`: la consulta nueva reemplaza la caducada |
| `coincidencia` | UNIQUE `(usuario_id, proceso_id)` — ya existe | `onConflictDoNothing` — ya implementado |
| `envio_log` | UNIQUE `(usuario_id, fecha, tipo)` — ya existe | Insert-first `onConflictDoNothing`: reserva la fila **antes** de enviar |

### 5.4 Manejo de fallos

Igual que el pipeline existente, sin invención:

1. Cada corrida abre una fila en `sync_log` con `status='running'` y cierra en
   `ok` | `partial` | `failed`, con `error_summary` y `batch_id`.
2. **Truncamiento controlado:** tope de páginas por invocación (hoy
   `CRON_MAX_PAGES = 200`). Si se alcanza, la corrida queda `partial` y el
   watermark **avanza igual** hasta donde llegó: la siguiente corrida continúa.
   Nunca se reintenta desde cero.
3. **Fallo de red o 5xx de Socrata:** la corrida cierra `failed` sin mover el
   watermark. La siguiente corrida reprocesa la misma ventana; la deduplicación
   por hash hace que eso sea inocuo.
4. **Corridas zombis:** `src/lib/ingest/staleRuns.ts` ya cierra las que quedaron
   en `running`. Las fuentes nuevas lo heredan.
5. **Fila que no transforma:** va a `transform_quarantine`, no rompe el lote.
6. `CRON_SECRET` obligatorio como `Bearer` en toda ruta `/api/cron/*`, fail-closed
   con 401 si la env var no está definida. Las rutas nuevas copian el patrón literal
   de `app/api/cron/ingest/route.ts`.

---

## 6. Motor de matching usuario ↔ licitación

### 6.1 Determinista, cero IA, cero coste por licitación

Un match es una consulta SQL contra `proceso` con los criterios de
`al_filtros_usuario` (semántica en §4.2). No hay modelo, no hay embedding, no hay
llamada externa. Respuesta instantánea y coste marginal cero.

**El trabajo real no está en el motor, está en la curación:** la lista de códigos
UNSPSC y el diccionario de sinónimos del sector (PTAP, PTAR, acueducto,
alcantarillado, redes, captación, aducción, saneamiento básico, micromedición,
vertimiento, colector, interceptor, emisario, PSMV…). Esas listas ya existen y
están medidas contra datos reales en `src/lib/secop/ingest-net.ts` — el motor de
filtros las usa como **valor por defecto** del filtro de un usuario nuevo.

### 6.2 Por qué existe `al_descartes`

Un fallo de curación no genera falsos positivos, genera **silencio**: la licitación
simplemente no aparece y nadie se entera. `al_descartes` (§4.4) es el único
mecanismo que hace ese silencio auditable.

Consulta de auditoría que debe funcionar desde terminal:

```sql
SELECT motivo, count(*) AS n, min(creado_en) AS desde
FROM al_descartes
WHERE capa = 'ingesta' AND creado_en > now() - interval '7 days'
GROUP BY motivo ORDER BY n DESC;
```

Y el muestreo manual, que es el que de verdad detecta la curación pobre:

```sql
SELECT secop_proceso_id, objeto_resumen, unspsc_observado, motivo
FROM al_descartes
WHERE capa = 'ingesta' AND motivo = 'sin_unspsc_ni_keyword'
ORDER BY random() LIMIT 25;
```

**Regla operativa:** cada vez que se toque la red o el diccionario, se sube
`red_version`. Sin eso, la tabla no distingue "lo descartamos con la red vieja" de
"lo descartamos con la nueva" y deja de ser auditoría.

### 6.3 Contratos de función

```ts
// src/lib/al/matching/evaluar-filtro.ts
/** Puro. Sin SQL, sin IO. `motivo: null` es un match. */
export function evaluarFiltro(
  filtro: FiltroValidado,
  proceso: ProcesoEvaluable
): { motivo: MotivoDescarte | null; evidencia: Record<string, unknown> | null };

// src/lib/al/matching/buscar-candidatos.ts
/** Acota el UNIVERSO (estado + borrado lógico). NO aplica criterios del filtro. */
export async function buscarCandidatos(
  opts?: { estado?: string | null; limit?: number }
): Promise<{ items: ProcesoEvaluable[]; truncado: boolean }>;

// src/lib/al/matching/registrar-descartes.ts
export async function registrarDescartes(
  capa: "ingesta" | "filtro",
  descartes: DescarteInput[]
): Promise<number>;
```

**Corrección sobre el diseño preliminar: el prefiltro NO aplica criterios del
usuario.** El esqueleto decía "traduce el filtro a un WHERE de Drizzle; prefiltro
en SQL, no en memoria". Se implementó así y estaba mal por dos razones que solo
se ven al correrlo:

1. **Un criterio aplicado en SQL es un descarte que `al_descartes` nunca ve.**
   Con zona y cuantía en el `WHERE`, los motivos `fuera_de_zona`,
   `fuera_de_cuantia`, `entidad_no_listada` y `modalidad_no_listada` no podían
   aparecer jamás: cuatro de los siete eran código muerto, y el usuario no podía
   enterarse de que perdió una licitación por estar fuera de su departamento.
   Medido: con el prefiltro, 2 motivos distintos en la tabla; sin él, **6**.
2. **Duplicar la semántica en SQL y en TS es cómo divergen**, y el síntoma de que
   divergen vuelve a ser silencio.

El coste es despreciable porque la red sectorial ya se aplicó en ingesta: el
universo abierto son ~550 procesos, no 90.000. `truncado` avisa si alguna vez
deja de serlo — un truncamiento silencioso es el mismo fallo con otro nombre.

`evaluarFiltro` devuelve el motivo en el caso negativo: es lo que alimenta
`al_descartes` sin una segunda pasada. Retorno nullable y no unión discriminada
porque el repo compila con `strict: false`.

### 6.4 Relación con el veredicto de elegibilidad — no se mezclan

El filtro decide **si la licitación le interesa** al usuario. El veredicto Nivel 0
(`buildVerdict`, intocable) decide **si puede participar**. Son ortogonales: un
proceso puede hacer match y salir `FAIL`. El motor nuevo no llama a `buildVerdict`;
la página y el correo componen ambos resultados.

---

## 7. Capa de notificación

### 7.1 Agregación: un correo por cuenta y día

Se extiende `runDailyAlertas` (`src/lib/alertas/run-daily.ts`), no se reescribe.
El cambio: hoy itera sobre `oferente_perfil`; pasa a iterar sobre **cuentas con al
menos un `al_filtros_usuario` activo**, y agrega en un solo correo todos los
eventos de todos los filtros de esa cuenta.

Contenido del correo, en este orden:

1. **Adendas** de procesos que la cuenta ya sigue, con el diff renderizado campo a
   campo (antes → después). Es lo primero porque es lo de mayor valor.
2. **Adjudicaciones** de procesos seguidos: quién ganó y a qué precio.
3. **Aperturas** nuevas que hacen match, agrupadas por filtro.
4. Enlace al reporte permanente del día (§9) y unsubscribe de un clic.

Si no hay nada en ninguna sección: **no se envía correo**, y `envio_log` registra
`estado='sin_coincidencias'`. Un correo vacío diario es la vía más rápida a que lo
marquen como spam.

### 7.2 Frecuencia e idempotencia

Diaria, hora configurable en `alerta_preferencias.hora_envio` (default 7 COT).
La idempotencia ya está resuelta y no se toca: insert-first en `envio_log` con
`onConflictDoNothing` sobre UNIQUE `(usuario_id, fecha, tipo)` — se reserva la fila
**antes** de hacer el trabajo, así una reejecución del cron o dos invocaciones
solapadas nunca duplican un correo.

### 7.3 Entregabilidad

Sin usuarios todavía, la reputación del dominio está por construir.

- Resend ya cableado (`AUTH_RESEND_KEY`). Verificar **SPF, DKIM y DMARC** del
  dominio remitente antes del primer envío masivo — es una casilla del plan, no un
  detalle de operación.
- El webhook de Resend escribe `estado_entrega` y `proveedor_mensaje_id` en
  `envio_log` (§4.8). Sin eso, un rebote es invisible.
- **Apagado automático:** dos `bounced` duros consecutivos para una cuenta ponen
  `alerta_preferencias.activo = false`. Seguir enviando a una dirección muerta
  quema el dominio para todos.
- Unsubscribe de un clic ya existe (`src/lib/email/unsubscribe-token.ts`) y debe
  ir además como cabecera `List-Unsubscribe`.

---

## 8. Capa de consulta

### 8.1 Ruta rápida SQL — es la de v1

Consultas parametrizadas contra Postgres, respuesta en milisegundos, coste cero.
Se extiende `src/lib/secop/db-search.ts` (que ya resuelve el prefiltro de procesos)
con las consultas nuevas del histórico y las sanciones:

```ts
// src/lib/al/consulta/competidor.ts
/** "¿Contra quién compito?" — historial de un NIT en el sector agua. */
export async function historialCompetidor(nit: string): Promise<{
  proveedor: { nitCanonico: string; razonSocial: string | null };
  adjudicaciones: number;
  valorTotal: string;
  ratioAdjudicadoSobreEstimado: number | null;
  porEntidad: Array<{ entidad: string; n: number; valor: string }>;
  porAnio: Array<{ anio: number; n: number; valor: string }>;
  sanciones: { tieneHallazgo: boolean; fuentesConsultadas: string[] };
}>;

// src/lib/al/consulta/precio-referencia.ts
/** "¿A qué precio se gana esto?" — distribución por UNSPSC y zona. */
export async function precioReferencia(params: {
  unspsc?: string[]; divipola?: string[]; desde?: Date;
}): Promise<{ n: number; medianaRatio: number | null; p25: number | null; p75: number | null }>;
```

### 8.2 Ruta agente — declarada, no construida en v1

`app/api/assistant/route.ts` ya existe y está tras `PROTECTED_PREFIXES`. La ruta de
lenguaje natural sobre estos datos es deseable y es explícitamente **no-objetivo de
v1** (§1.6). Cuando se construya, se hará como traductor a las funciones de §8.1,
nunca con SQL generado por el modelo contra la base.

---

## 9. Reportes permanentes

**Permanentes, no efímeros:** URL propia, contenido congelado en el momento de
generarse (`al_reportes.payload`), no recalculado al visitarse. Esto es lo que
permite enlazarlos desde el correo, compartirlos y medir tráfico.

- **Ruta:** `app/reportes/[slug]/page.tsx`.
- **Slug:** derivado del tipo y los parámetros, sufijo aleatorio corto para que no
  sea adivinable. Inmutable una vez publicado; regenerar actualiza `payload` y
  `actualizado_en`, nunca el slug.
- **Visibilidad — decidida, no abierta:**
  - `publico`: reportes de mercado sin datos de cuenta (perfil de un competidor,
    mercado de un departamento, precios por familia UNSPSC). Indexables,
    `account_id` NULL. Son el activo de tráfico y SEO.
  - `privado`: el digest diario de una cuenta y cualquier reporte que refleje sus
    filtros. Requieren sesión **y** que `al_reportes.account_id` coincida con la
    cuenta en sesión. Un slug filtrado no debe bastar para leerlos.
- **Analítica:** `al_reportes.vistas` se incrementa en el server component. Basta
  para v1; no se añade proveedor de analítica.
- **Regla dura:** un reporte `publico` no puede contener el nombre, el email, el
  perfil ni los filtros de ninguna cuenta. La spec del módulo 6 debe incluir un
  test que lo verifique sobre el `payload` serializado.

---

## 10. Migraciones e impacto sobre lo existente

### 10.1 Deuda previa que hay que resolver antes de la primera migración nueva

`drizzle/0017_mushy_expediter.sql` está **comiteada y sin aplicar**: `usuario.plan`
existe en el esquema Drizzle y no en la Supabase viva (CLAUDE.md §4). Generar una
migración nueva encima de ese desfase produce un snapshot inconsistente.

**Primera acción de la Fase 1, antes que nada:**

```bash
npm run db:migrate    # aplica 0017 pendiente
psql "$DATABASE_URL" -c "\d usuario"   # debe mostrar la columna plan
```

### 10.2 Orden de migraciones

| Migración | Contenido | Estado |
|---|---|---|
| `0017_mushy_expediter` | `usuario.plan` — estaba comiteada sin aplicar desde el 2026-08-29 | ✅ **Aplicada 2026-09-05** |
| `0018_special_madame_web` | `al_filtros_usuario`, `al_reportes`, `al_descartes`, `al_proceso_evento`, `al_sanciones_cache` (CREATE + ENABLE RLS) | ✅ **Aplicada 2026-09-05** |
| `0019_secret_changeling` | 9 `ADD COLUMN` nullable en `coincidencia`, `envio_log`, `alerta_preferencias` + 2 FK | ✅ **Aplicada 2026-09-05** |
| `0020_huge_ego` | `al_oferentes_historico` (DDL cerrado tras V-F-4: incluye proponentes) | ✅ **Aplicada 2026-09-05** |
| `0021_kind_warbird` | `al_sanciones` (DDL cerrado tras V-F-2) | ✅ **Aplicada 2026-09-05** |

**Las cinco tablas sin dependencia externa se crearon juntas en `0018`**, no
repartidas por fase como preveía el plan original. Razón: el esqueleto es la
fuente única de verdad del esquema (§4.0), y crear `al_proceso_evento` en la
Fase 5 obligaría a su spec a redefinir DDL que ya está decidido. Solo quedan
fuera las dos que dependían de la V-F.

**El backfill de `account_id` no es una migración.** Es un `UPDATE` idempotente
con `WHERE account_id IS NULL`, ejecutado una vez el 2026-09-05 (12 filas en
`envio_log`; `coincidencia` y `alerta_preferencias` estaban vacías). No lleva
número porque no es DDL y re-ejecutarlo es inocuo.

### 10.3 Impacto sobre el runtime existente: ninguno el día de la migración

- Ninguna ruta actual lee las columnas nuevas.
- `getMatchesForPerfil` y `runDailyAlertas` siguen funcionando igual hasta que la
  Fase 6 los extienda.
- RLS: las tablas nuevas nacen con RLS activo y **sin políticas**, igual que las 23
  existentes. El runtime no las ve afectadas porque el acceso va por Drizzle con
  conexión Postgres directa, cuyo rol ignora RLS; la Data API pública sigue
  devolviendo `[]`.

**Verificación obligatoria después de cada migración:**

```bash
psql "$DATABASE_URL" -c "SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity;"
```

Debe devolver **0 filas**. Si devuelve alguna, la migración se revierte.

---

## 11. Plan de entrega por fases

Cada criterio de aceptación es **binario y comprobable desde terminal**. "Funciona
correctamente" no es un criterio.

El orden pone primero los módulos de mayor retorno (histórico + sanciones): son
autónomos, no dependen del canal de notificación, y responden "¿contra quién compito
y a qué precio gana?". Si hay que recortar alcance, se recortan las fases 4-6, no
las 2-3.

---

### Fase 0 — Verificación de fuentes · ✅ COMPLETADA 2026-09-05

Las seis V-F ejecutadas y registradas en §3 con sus salidas literales. Resultado:
cuatro pasan, la V-F-4 levanta parte de un no-objetivo, la V-F-6 bloquea.

---

### Fase 0.5 — Cuota de base de datos · ✅ COMPLETADA 2026-09-05

Sale de la V-F-6. **484 MB de 500 MB (96,8 %) antes de escribir una sola tabla
nueva.** La ingesta diaria crece sola: la base se llena en menos de tres semanas
aunque no se construya nada. No es una fase de este SDD en sentido estricto — es
una decisión de infraestructura que hay que tomar antes de la Fase 1.

Tres vías, no excluyentes:

| Vía | Recupera | Coste | Qué se pierde |
|---|---|---|---|
| **A. Supabase Pro** | 8 GB (16×) | ~25 USD/mes | Nada |
| **B. Podar el payload de `raw_record` antiguo** | hasta ~200 MB | 0 | La capacidad de re-transformar sin volver a Socrata. Se conserva `payload_hash`, `source_record_id` y `source_updated_at`, así que la deduplicación y el watermark siguen intactos; lo que se pierde es el JSON crudo |
| **C. Retirar índices muertos** | ~7 MB | 0 | Nada (`proceso_portafolio_idx` y `contrato_proveedor_idx` tienen 0 scans) |

**Resuelto: se sube a Supabase Pro (vía A), y como puente se ejecutó una poda que
no estaba en la tabla y que resultó mejor que las tres.**

**La poda real fue el bloat, no los índices.** `raw_record` tenía 21.653 tuplas
muertas (14,4 % de 150k) acumuladas por los upserts desde el 2026-08-16:

```
$ psql -c "VACUUM (FULL, ANALYZE) raw_record;"     # 37 s
484 MB → 432 MB   ·   raw_record 319 MB → 267 MB   ·   52 MB recuperados
```

Filas intactas: 128.334 raw_record, 90.076 procesos, 38.258 contratos.

**Los índices muertos NO se retiraron, y es deliberado:**

| Índice | Tamaño | Scans (43 días) | Decisión |
|---|---|---|---|
| `proceso_portafolio_idx` | 5,6 MB | 0 | **Se conserva.** Retirarlo exige editar `hechos.ts` para que `db:generate` no lo recree, y eso rompe R1 y R2 por el 1,1 % de la cuota. El transform construye el índice portafolio→proceso con un `SELECT` de tabla completa a un `Map` de JS (`transform/writers.ts:348`), por eso marca 0 scans |
| `contrato_proveedor_idx` | 1,2 MB | 0 | **Se conserva.** `historialCompetidor(nit)` de la Fase 2 consulta exactamente por `proveedor_id`: borrarlo para recrearlo en dos fases es churn |

Las estadísticas llevan acumulando desde el 2026-07-24 (43 días), así que los
"0 scans" son señal real y no un artefacto de un reset reciente.

**Aceptación — cumplida:**
1. 432 MB / 500 MB = 86,4 %. Con Pro (8 GB) el margen pasa a 94,7 %. ✅
2. No se eligió B: el `payload` de `raw_record` sigue completo y el pipeline ELT
   conserva la capacidad de re-derivar sin volver a Socrata. ✅

---

### Fase 1 — Cimientos: migración pendiente + tablas base · ✅ COMPLETADA 2026-09-05

Aplicadas `0017`, `0018` y `0019` (§10.2) más el backfill de `account_id`. CRUD de
filtros en `/api/al/filtros`.

**Archivos:**

| Ruta | Papel |
|---|---|
| `src/lib/db/schema/aqualicita.ts` | Las cinco tablas `al_*`, todas con `.enableRLS()` |
| `src/lib/al/cuenta.ts` | `cuentaDe(user)` — el único sitio que sabe que en v1 cuenta = usuario (R8) |
| `src/lib/al/filtros/tipos.ts` | Contrato y validación, puro y testeable |
| `src/lib/al/filtros/store.ts` | CRUD, **siempre filtrado por `account_id`** |
| `src/lib/al/filtros/guard.ts` | `autorizar(capacidad)` → consulta `acceso/politica.ts` |
| `app/api/al/filtros/route.ts` · `[id]/route.ts` | GET/POST · PUT/DELETE |
| `src/__tests__/al/filtros-tipos.test.ts` | 12 casos, incl. la semántica del array vacío |

**Dos decisiones que tomó el código, no el plan:**

1. **`filtros` se declaró como capacidad en `src/lib/acceso/politica.ts`** (nivel
   `gratis`), no como un `if (user)` en el handler — es lo que manda CLAUDE.md §4.
   El test `politica.test.ts` falló al añadirla, que es exactamente su propósito:
   existe para que nadie meta una capacidad sin clasificarla.
2. **Retorno nullable en vez de unión discriminada.** El repo compila con
   `strict: false`, así que `{ok: true} | {ok: false}` no estrecha y obligaría a
   asertar el tipo en cada handler. Se usa el idiom del repo (`getSessionUser`).
   No se tocó el `tsconfig`: cambiarlo cascadearía errores por todo el árbol.

**Aceptación — cumplida:**
1. `psql -c "\d usuario"` incluye `plan | text | not null | 'gratis'::text`. ✅
2. Tablas de `public` sin RLS: **0** de 28. ✅
3. `grep -cE "DROP |ALTER COLUMN |RENAME " drizzle/0018*.sql drizzle/0019*.sql` → `0` y `0`. ✅
4. `account_id IS NULL` → `0` en `coincidencia`, `envio_log` y `alerta_preferencias`. ✅
5. GET, POST y DELETE sin sesión → **HTTP 401** `{"error":"No hay sesión activa"}`. ✅
6. `npm test` → **669/669**. ✅
7. **Extra, y es el que importa:** el aislamiento por `account_id` se probó contra
   la base viva — otra cuenta no ve el filtro en el listado, no puede actualizarlo
   (devuelve `null` → 404) ni borrarlo. Un filtro ajeno y uno inexistente responden
   igual a propósito: distinguirlos filtraría la existencia de filtros de otros.

---

### Fase 2 — Histórico de oferentes y precios (módulo 2) · ✅ COMPLETADA 2026-09-05

Migración `0020` + carga inicial en dos pasadas. **Se levantó el no-objetivo de
listar proponentes** (V-F-4): el histórico responde contra quién se compite, no
solo quién ganó.

**Archivos:**

| Ruta | Papel |
|---|---|
| `src/lib/al/historico/mapear.ts` | Mapeo puro payload → fila. Reusa `cleanText` y `canonicalizeNit` de la ingesta; no duplica la lista de centinelas |
| `src/lib/al/historico/backfill.ts` | Las dos pasadas, ambas idempotentes |
| `src/lib/al/consulta/competidor.ts` | `historialCompetidor()` y `precioReferencia()` |
| `scripts/al-backfill-historico.ts` | `npm run al:backfill-historico` |
| `src/__tests__/al/historico-mapear.test.ts` | 15 casos |

**Guardia de tamaño en el script.** Mide `pg_database_size` tras cada lote y
aborta al llegar al umbral (`--max-mb`, 470 por defecto) en vez de llenar la base
y dejar el proyecto en solo lectura, que tumbaría el login y no solo la ingesta.
Lo ya escrito queda válido: reanudar es volver a ejecutar.

**Bug de producción encontrado y corregido de paso.** `src/lib/secop/config.ts`
mapeaba `adjudicatario: "nombre_del_adjudicador"`, que es **la persona de la
entidad que firma la adjudicación**, no la empresa ganadora. `ProcessDetail.tsx`
llevaba mostrando el nombre de un funcionario bajo la etiqueta "Adjudicatario".
El campo correcto es `nombre_del_proveedor`, que además cuadra con
`nit_del_proveedor_adjudicado`. Hay un test que lo fija.

**Aceptación — cumplida salvo el margen de cuota:**

1. 27.035 filas, `fecha_adjudicacion` de **2016-03-07 a 2026-09-01**. ✅
   (El SDD hablaba de 2015; la red sectorial no trae nada anterior a marzo de 2016,
   y el volumen solo es significativo desde 2020. Dato, no defecto.)
2. Backfill ejecutado **cuatro veces**: el `count(*)` no cambia. ✅
3. Adjudicados sin `valor_adjudicado`: **21 de 13.606 = 0,15 %** (umbral 5 %). Y
   no-adjudicados con valor: **0** — la fuente no publica el precio del perdedor
   y el esquema no finge que sí. ✅
4. Procesos con ≥2 participantes: el mayor tiene **88**. ✅
5. Procesos con más de un ganador: **0**. ✅
6. `historialCompetidor('900393756')` → 240 participaciones, 173 adjudicaciones,
   72,1 % de éxito, 9.016 M COP, ratio adjudicado/estimado **1,0**, y sus rivales
   frecuentes con nombre y marcador. ✅
7. **Margen de cuota: NO cumplido con el plan actual.** 449 MB de 500 MB deja un
   10 %, y el criterio pide 40 %. Con Supabase Pro (8 GB) el margen es del 94,5 %.
   Es lo único que queda abierto de esta fase.

**Lo que el módulo ya responde,** con `precioReferencia()`:

| Consulta | n | Mediana ratio | p25 | Mediana adjudicado |
|---|---|---|---|---|
| Todo el sector | 13.445 | 0,998 | 0,863 | 45,5 M COP |
| Antioquia (`divipola: ['05']`) | 1.765 | 1,000 | 0,963 | 92,2 M COP |
| UNSPSC 77121701 desde 2022 | 149 | **0,830** | 0,636 | 11,5 M COP |

La última fila es el tipo de dato que justifica el módulo: esa familia se gana
un 17 % por debajo del presupuesto oficial, mientras el sector en conjunto se
adjudica prácticamente al precio de referencia.

---

### Fase 3 — Historial sancionatorio (módulo 3) · ✅ COMPLETADA 2026-09-05

Migración `0021` + recarga completa de las dos fuentes + `/api/al/sanciones/[nit]`
+ integración en `historialCompetidor()`.

**El módulo cambió de nombre y de promesa.** Iba a llamarse "sanciones e
inhabilidades". Lo que las fuentes accesibles publican son **multas
contractuales**, así que se llama historial sancionatorio. Prometer
inhabilidades con estos datos sería falso.

**Archivos:**

| Ruta | Papel |
|---|---|
| `src/lib/al/sanciones/mapear.ts` | Mapeo puro de las dos fuentes, con los tres filtros de basura |
| `src/lib/al/sanciones/ingesta.ts` | Recarga completa semanal + resolución de las dos vías de cruce |
| `src/lib/al/sanciones/consulta.ts` | `sancionesDeProveedor()` — separa evidencia de inferencia |
| `app/api/al/sanciones/[nit]/route.ts` | GET, tras `autorizar()` |
| `scripts/al-recargar-sanciones.ts` | `npm run al:sanciones` |
| `src/__tests__/al/sanciones-mapear.test.ts` | 9 casos, casi todos sobre basura de la fuente |

**La consulta bajo demanda no se construyó, y es la decisión de la fase.** RUES
responde **403** sin credenciales y datos.gov.co solo tiene datasets de cámaras
de comercio regionales sueltas, inútiles a escala nacional. Construir
`/api/al/sanciones` contra un 403 habría sido un stub que nunca funciona. El
endpoint sirve lo ya cargado: instantáneo, sin llamada externa y sin caché que
mantener. `al_sanciones_cache` queda creada y sin productor, documentada como el
punto de enchufe si aparece una fuente consultable.

**Aceptación — cumplida:**

1. `secop_i_multas` **1.569** · `secop_ii_multas` **545**. ✅
2. Segunda corrida consecutiva: 2.114 → **2.114**. ✅
3. Cruce con proveedores reales: **36 sanciones sobre 28 proveedores** de nuestro
   catálogo, más **16** enganchadas por proceso. El criterio decía que un 0 aquí
   invalidaría el módulo. ✅
4. El endpoint no hace llamadas externas: la latencia es la de un `SELECT` sobre
   índice. El criterio original medía la caché, que ya no existe. ✅
5. `al_sanciones_cache` con filas expiradas al nacer: **0**. ✅
6. Un NIT sin hallazgos devuelve listas vacías y `tieneHallazgo: false`, no un
   error — y `cobertura.cruzablePorDocumento` distingue "está limpio" de "no lo
   sabemos". ✅
7. La UI dirá "historial sancionatorio": **pendiente**, no se construyó pantalla
   en esta fase. El contrato de datos ya lo impone (`HistorialSancionatorio`,
   con `fuentesNoDisponibles` explícitas).

**Basura filtrada, toda medida:** 14 autorreferencias (la entidad puso su propio
NIT como contratista), 6 documentos de prueba (`123456789` / "PRUEBA
CONTRATISTA") y los comodines heredados del histórico. Quedan 2.069 filas
cruzables de 2.114.

---

### Fase 4 — Motor de filtros + auditoría de descartes (módulo 5) · ✅ COMPLETADA 2026-09-05

**Archivos:**

| Ruta | Papel |
|---|---|
| `src/lib/al/matching/tipos.ts` | `MOTIVOS`, `ProcesoEvaluable`, `VERSION_FILTRO`, `VERSION_RED` |
| `src/lib/al/matching/evaluar-filtro.ts` | Puro. Toda la semántica del filtro vive aquí |
| `src/lib/al/matching/buscar-candidatos.ts` | Acota el universo. **No** aplica criterios |
| `src/lib/al/matching/red-sectorial.ts` | Etiqueta del rechazo de la red, sobre `matchesSectorNet` |
| `src/lib/al/matching/registrar-descartes.ts` | Escritura, reemplazo por filtro y poda a 90 días |
| `src/lib/al/matching/correr-filtros.ts` | Orquestación: coincidencias + descartes, simétricos |
| `scripts/al-correr-filtros.ts` · `al-auditar-red.ts` | `npm run al:filtros` · `al:auditar-red` |
| `src/__tests__/al/evaluar-filtro.test.ts` | 17 casos, uno por motivo + el guardián de cobertura |

**Dos bugs que solo aparecieron al correr contra datos reales:**

1. **`validarFiltro` rechazaba `"83101"`** por exigir 6–10 dígitos, cuando ése es
   exactamente el prefijo de familia que usa la red del propio repo
   (`WATER_EXCLUSIVE_UNSPSC`) y `evaluarFiltro` hace match por prefijo. El
   validador contradecía a los otros dos. Ahora admite 2–10 dígitos.
2. **La búsqueda truncaba en silencio** en 500 candidatos con 547 procesos
   abiertos. En este módulo eso es el fallo que existe para evitar: ahora
   `buscarCandidatos` devuelve `truncado` y `correrFiltro` lo grita.

**Aceptación — cumplida:**

1. Tras dos corridas consecutivas: `coincidencia` **547 filas, 0 duplicados**. ✅
2. `al_descartes` con **6 motivos distintos** (todos menos `entidad_no_listada`,
   que necesita un filtro con NITs). Antes de quitar el prefiltro SQL eran 2. ✅
3. `npm test` → **711/711**, con un caso por cada motivo de la capa `filtro` y un
   test que falla si se añade un motivo sin probarlo. ✅
4. El filtro sin criterios devuelve **547 de 547** procesos abiertos, no cero. ✅
5. El muestreo de §6.2 devuelve filas legibles con su motivo y su evidencia. ✅

**Lo que la auditoría ya muestra:**

| Capa | Motivo | Filas |
|---|---|---|
| ingesta | `segmento_80_excluido` | 841 |
| ingesta | `sin_unspsc_ni_keyword` | 640 |
| filtro | `sin_unspsc_ni_keyword` | 1.452 |
| filtro | `fuera_de_zona` | 95 |
| filtro | `modalidad_no_listada` | 57 |
| filtro | `palabra_excluida` | 18 |
| filtro | `fuera_de_cuantia` | 16 |

El sondeo de la red (muestra de 1.500 procesos de 5 días, sin filtro sectorial)
confirma la derivación del ADR-0001: **solo el 1,3 % pasa la red**, y el segmento
80 es el 57 % de lo descartado.

Y la evidencia es accionable, que era el objetivo: una "EJECUCIÓN DE LAS
ACTIVIDADES DE OPTIMIZACIÓN…" descartada por `fuera_de_cuantia` con
`{min: 500000000, valor: 25812560}` le dice al usuario exactamente qué se está
perdiendo y por qué.

---

### Fase 5 — Máquina de estados de procesos (módulo 4)

`0020` + etapa `detectarEventos` dentro de `app/api/cron/tick/route.ts` (V-F-5:
Hobby no admite una ruta de cron propia) que compara el snapshot nuevo contra el
anterior y escribe apertura, adenda con diff y adjudicación. Cadencia diaria.

**Aceptación:**
1. Tras dos ejecuciones consecutivas del cron sin cambios en la fuente,
   `al_proceso_evento` **no gana filas** en la segunda.
2. `psql -c "SELECT count(*) FROM al_proceso_evento WHERE tipo_evento='adenda' AND delta IS NULL;"` → `0`. Una adenda sin diff es un aviso, y eso es exactamente lo que este módulo no debe producir.
3. Ningún campo de `volatileFields` (`src/lib/ingest/sources.ts`) aparece como clave
   dentro de `delta`: `psql -c "SELECT count(*) FROM al_proceso_evento WHERE delta @> '[{\"campo\":\"visualizaciones_del\"}]';"` → `0`.
4. Los tres `tipo_evento` aparecen al menos una vez tras una semana de operación.
5. `vercel.json` sigue declarando **exactamente 2** crons: `jq '.crons | length' vercel.json` → `2`.

---

### Fase 6 — Notificación agregada + reportes permanentes (módulo 6)

Extensión de `runDailyAlertas` a filtros y eventos, webhook de entregabilidad de
Resend, y `app/reportes/[slug]`.

**Aceptación:**
1. Una cuenta con 3 filtros y eventos en los 3 recibe **un** correo, no tres:
   `psql -c "SELECT count(*) FROM envio_log WHERE fecha=CURRENT_DATE AND tipo='diario' AND usuario_id='<id>';"` → `1`.
2. Ejecutar el cron dos veces el mismo día no produce un segundo envío (mismo
   count `1`) — la idempotencia existente sigue en pie tras el cambio.
3. Una cuenta sin novedades no recibe correo y su `envio_log.estado` es
   `'sin_coincidencias'`.
4. `curl -I https://<host>/reportes/<slug-publico>` → `200` sin cookie de sesión;
   `curl -I .../reportes/<slug-privado>` sin sesión → `401` o `404`, nunca `200`.
5. Tras el webhook de Resend, ≥1 fila de `envio_log` tiene `estado_entrega` no nulo.
6. `dig TXT <dominio>` y `dig TXT resend._domainkey.<dominio>` devuelven SPF y DKIM
   configurados.

---

## Apéndice A — Qué NO cierra este esqueleto

Estas decisiones se toman en la spec de su módulo, con el contexto de lo ya
construido, y **al tomarse se actualiza este documento**:

- DDL definitivo de `al_oferentes_historico` y `al_sanciones`. La V-F cerró las
  fuentes y los campos de identidad; falta traducirlos a tipos Drizzle exactos.
- Lista exacta de campos que entran al `delta` de una adenda (módulo 4).
- Esquema del `payload` de cada `tipo` de reporte (módulo 6).
- Si el PAA aterriza como `IngestSource` propio o como tabla derivada. La V-F-3
  confirmó que `9sue-ezhx` trae `categorias_unspsc`, así que la red sectorial le
  aplica; lo que queda por decidir es si sus 11,6 M de filas justifican tabla propia
  o si basta con enlazar por `procesos_relacionados`.
- Cómo normalizar el campo de documento de `al_sanciones`: la fuente mezcla cédulas
  y NITs en `documento_contratista` sin discriminador de tipo.
- Si `pliego_extraer` y el histórico quedan tras la frontera `pro` de
  `src/lib/acceso/politica.ts`. **Supuesto de v1: todo lo nuevo es nivel `gratis`.**
