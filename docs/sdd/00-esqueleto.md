# SDD AquaLicita — Esqueleto v1

> **Estado:** esqueleto aprobado. Fuente única de verdad del esquema.
> **Fecha:** 2026-09-05 · **Consumidor:** Claude Code · **Alcance:** solo Colombia.
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
3. **No se listan proponentes vencidos.** Ver §3 V-F-4 y §4.7: si no hay dataset
   público de ofertas por proceso, el histórico entrega **adjudicatario y precio
   adjudicado**, no la lista de quienes perdieron. Decisión tomada, no pendiente.
4. **La base no responde preguntas fuera del sector agua.** El filtro sectorial se
   aplica en ingesta (ADR-0001, Opción C). Una consulta del tipo "¿qué más contrata
   esta empresa?" devolverá solo su actividad en agua y saneamiento. Es una
   limitación estructural, no un bug; el segmento UNSPSC 80 está excluido y esos
   registros **no son reclasificables sin backfill**.
5. **No hay WhatsApp ni Telegram.** Email en fase 1.
6. **No se construye la ruta agente en lenguaje natural.** Se declara en §8 y se
   deja fuera de v1.
7. **No se toca autenticación, ni el extractor de pliegos, ni el veredicto Nivel 0.**
8. **No se construye scraping de ninguna fuente.**

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

## 3. Verificación de fuentes (V-F) — BLOQUEANTE

**No se escribe código de ningún módulo hasta que las seis casillas estén marcadas
con el comando ejecutado y su salida pegada en este documento.** No es la "Fase 0"
del proyecto: aquélla es el test binario del extractor de pliegos (extracción limpia
de un PDF real, cero campos alucinados, matemáticas consistentes, `NO_ENCONTRADO`
honesto) y es independiente de esto.

### V-F-1 — Qué usa el cron actual · **RESUELTA**

`src/lib/ingest/sodaFetch.ts` usa `SOCRATA_DOMAIN` de `src/lib/secop/config.ts`
(`https://www.datos.gov.co`). No hay scraping en el pipeline de ingesta. **No hay
migración que hacer.**

Queda una sub-tarea abierta, porque CLAUDE.md declara la ejecución en producción
como no verificada:

```bash
# V-F-1b — ¿ha corrido el cron en producción?
psql "$DATABASE_URL" -c "SELECT source, status, started_at, records_ingested FROM sync_log ORDER BY started_at DESC LIMIT 10;"
```

**Criterio binario:** hay ≥1 fila con `status='ok'` y `started_at` dentro de los
últimos 7 días, para cada uno de `secop_ii_procesos` y `secop_ii_contratos`.
Si no la hay, la Fase 1 arranca arreglando el cron, no construyendo módulos.

- [ ] Ejecutado · salida:

### V-F-2 — Dataset masivo de sanciones descargable en bloque

Candidato principal: Boletín de Responsables Fiscales (Contraloría) publicado en
datos.gov.co. **No dar por supuesto que existe como dataset Socrata.**

```bash
curl -s "https://api.us.socrata.com/api/catalog/v1?domains=datos.gov.co&q=responsables%20fiscales&limit=20" \
  | jq -r '.results[] | "\(.resource.id)\t\(.resource.name)\t\(.resource.columns_field_name | length) cols"'
curl -s "https://api.us.socrata.com/api/catalog/v1?domains=datos.gov.co&q=inhabilidades&limit=20" \
  | jq -r '.results[] | "\(.resource.id)\t\(.resource.name)"'
```

**Criterio binario:** se identifica **un** id 4x4 cuyo dataset contenga un campo de
documento de identidad/NIT y un campo de vigencia o fecha, y `curl` de una página
de 5 filas devuelve JSON no vacío. Se pega aquí el id, el nombre del campo NIT y
una fila de ejemplo.

Si no existe: el módulo 3 se degrada a **solo consulta bajo demanda** (SIRI + RUES,
caché 30 días) y se elimina el cruce masivo del alcance de v1. Esa degradación se
decide aquí, no a mitad de la implementación.

- [ ] Ejecutado · id 4x4 = ______ · campo NIT = ______

### V-F-3 — Dataset del PAA (Plan Anual de Adquisiciones)

El PAA es la ventaja temporal del producto: anticipa con meses lo que el portal
publica después.

```bash
curl -s "https://api.us.socrata.com/api/catalog/v1?domains=datos.gov.co&q=plan%20anual%20de%20adquisiciones&limit=20" \
  | jq -r '.results[] | "\(.resource.id)\t\(.resource.name)\t\(.resource.updatedAt)"'
```

**Criterio binario:** id 4x4 confirmado + se verifica que existan campos de
(a) código UNSPSC, (b) valor estimado, (c) entidad/NIT, (d) fecha estimada de
inicio del proceso. Sin (a) el PAA no cruza con la red sectorial y el módulo pierde
su razón de ser — decidir entonces si se filtra por texto libre.

- [ ] Ejecutado · id 4x4 = ______ · campo UNSPSC = ______

### V-F-4 — ¿Existe dataset de proponentes / ofertas por proceso?

Determina si el módulo 2 puede responder "quién ofertó" o solo "quién ganó".

```bash
curl -s "https://api.us.socrata.com/api/catalog/v1?domains=datos.gov.co&q=SECOP%20II%20oferentes&limit=20" \
  | jq -r '.results[] | "\(.resource.id)\t\(.resource.name)"'
curl -s "https://api.us.socrata.com/api/catalog/v1?domains=datos.gov.co&q=SECOP%20propuestas&limit=20" \
  | jq -r '.results[] | "\(.resource.id)\t\(.resource.name)"'
```

**Criterio binario:** sí/no. **Decisión ya tomada para el caso "no":** el módulo 2
se construye sobre adjudicatario + valor adjudicado y el no-objetivo §1.3 queda
firme. No se añade scraping bajo ninguna circunstancia.

Los campos de adjudicación ya están aterrizados en el payload de procesos y son
legibles hoy (`src/lib/secop/db-search.ts:197-199`: `adjudicadoRaw`,
`valorAdjudicacionRaw`, `adjudicatarioRaw`), así que el caso "no" es entregable
sin fuente nueva.

- [ ] Ejecutado · existe: sí / no

### V-F-5 — Límite de crons del plan de Vercel

El brief pide cadencias de 6 h y mensual. El plan Hobby de Vercel limita el número
de cron jobs y su frecuencia mínima; hoy `vercel.json` declara dos, ambos diarios.

```bash
vercel project ls
# y en el dashboard: Settings → Crons (o `vercel api /v1/projects/<id>` → plan)
```

**Criterio binario:** se confirma el plan y cuántos crons y qué frecuencia mínima
admite. **Si el plan no admite 6 h**, la arquitectura no cambia (R4): se consolida
en un único despachador `app/api/cron/tick/route.ts` que decide qué corre según la
hora, y el resto de rutas de cron pasan a ser funciones invocadas desde ahí. Esa
consolidación se decide aquí, no durante la Fase 5.

- [ ] Ejecutado · plan = ______ · crons permitidos = ______ · frecuencia mínima = ______

### V-F-6 — Holgura de cuota en Supabase antes del backfill

En agosto de 2026 la cuota del plan Free ya obligó a retirar tres índices muertos.
El backfill histórico añade volumen.

```bash
psql "$DATABASE_URL" -c "SELECT pg_size_pretty(pg_database_size(current_database())) AS total;"
psql "$DATABASE_URL" -c "SELECT relname, pg_size_pretty(pg_total_relation_size(c.oid)) AS size FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' ORDER BY pg_total_relation_size(c.oid) DESC LIMIT 10;"
```

Y el conteo real que el backfill traería, **antes** de traerlo:

```bash
# sustituir <WHERE> por el sectorWhere de SECTOR_NET_CONTRATOS urlencodeado
curl -s "https://www.datos.gov.co/resource/jbjy-vk9h.json?\$select=count(1)&\$where=<WHERE>%20AND%20fecha_de_firma%20%3E=%20%272015-01-01%27"
```

**Criterio binario:** `filas_a_cargar × 4 KB estimados + tamaño_actual < 90 %` de la
cuota del plan. Si no cabe, la Fase 2 arranca desde el año más reciente hacia atrás
y se detiene al llegar al 90 %, dejando registrado el año alcanzado.

- [ ] Ejecutado · tamaño actual = ______ · filas estimadas = ______ · cabe: sí / no

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

**Retención:** esta tabla crece más rápido que cualquier otra (un descarte por
proceso evaluado y por filtro). La spec del módulo 5 debe fijar un borrado por
antigüedad; el candidato es 90 días, con un conteo agregado que sobreviva. El
crecimiento sin límite de una tabla append-only ya llenó la cuota una vez.

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

#### `al_oferentes_historico`

**Entidad:** una adjudicación histórica del sector agua desde 2015. Una fila = un
proceso adjudicado a un proveedor.

**Alcance decidido:** solo contratos/procesos **adjudicados** (V-F-6, decisión de
volumen). No se aterriza el histórico completo de procesos. Y **adjudicatario, no
proponentes** (V-F-4, no-objetivo §1.3).

**Campos mínimos, ya fijados:**

| Campo | Tipo | Origen |
|---|---|---|
| `account_id` | — | **No lleva.** Es dato de mercado, común a todas las cuentas |
| `secop_proceso_id` | `text` | `proceso.secop_proceso_id` / payload |
| `proveedor_id` | `uuid` FK → `proveedor.id` | **Llave de relación principal.** Cruza con `al_sanciones` por NIT |
| `entidad_id` | `uuid` FK → `entidad.id` | Contra quién se contrata |
| `geografia_id` | `text` FK → `geografia.codigo_divipola` | Dónde |
| `unspsc` | `text` | Para agregar por familia de código |
| `valor_estimado` | `numeric(20,2)` | Precio de referencia de la entidad |
| `valor_adjudicado` | `numeric(20,2)` | **Precio al que se gana.** Es la razón de existir del módulo |
| `fecha_adjudicacion` | `date` | Serie temporal |
| `modalidad` | `text` | Cruza con el escalón de contratación del diagnóstico |
| `raw_record_id` | `uuid` FK → `raw_record.id` | Trazabilidad |

**Índices obligatorios:** UNIQUE `(secop_proceso_id, proveedor_id)` para
idempotencia del backfill; índice en `(proveedor_id, fecha_adjudicacion)` para la
consulta "historial de este competidor"; índice en `(entidad_id, fecha_adjudicacion)`.

**Fuente de los datos:** derivada de `raw_record` ya aterrizado
(`adjudicado`, `valor_adjudicacion`, `adjudicatario` del payload de procesos —
ver `src/lib/secop/db-search.ts:197-199`) más `contrato`. **No requiere fuente
externa nueva**, lo que hace este módulo entregable aunque V-F-2/3/4 fallen.

#### `al_sanciones`

**Entidad:** un hallazgo de sanción o inhabilidad sobre un NIT.

**Campos mínimos, ya fijados:** `fuente` (`text`: `'boletin_fiscal'|'siri'|'rues'`),
`nit_canonico` (`text`, **llave de relación** con `proveedor.nit_canonico`),
`tipo` (`text`), `vigente_desde` / `vigente_hasta` (`date`), `payload` (`jsonb`
crudo de la fuente), `ingested_at`, `raw_record_id`.

**Índices obligatorios:** índice en `nit_canonico`; UNIQUE
`(fuente, nit_canonico, tipo, vigente_desde)` para idempotencia del cruce masivo.

**Lo que la V-F-2 decide y aquí no se puede fijar:** el nombre y tipo real de los
campos de la fuente masiva, y si `vigente_hasta` existe. Si la fuente no publica
vigencia, el diseño cambia: una sanción sin fecha de fin no puede caducar sola, y
la spec del módulo 3 tendrá que decidir entre asumirla permanente o refrescar la
tabla entera en cada corrida.

**Advertencia de producto que debe ir en la UI:** un hallazgo es una señal para
verificar en la fuente oficial, nunca una afirmación de que una empresa está
inhabilitada. La homonimia de NIT y los desfases de publicación son reales.

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

| Fuente | `source` | Cadencia | Ruta | Estado |
|---|---|---|---|---|
| SECOP II procesos | `secop_ii_procesos` | Diaria 06:00 COT | `/api/cron/ingest` | **Existe** |
| SECOP II contratos | `secop_ii_contratos` | Diaria 06:00 COT | `/api/cron/ingest` | **Existe** |
| Cambios de estado (detector de eventos) | `secop_ii_procesos` (relee raw) | Cada 6 h | `/api/cron/eventos` | Nuevo — sujeto a V-F-5 |
| PAA | `secop_paa` | Mensual, día 1 | `/api/cron/paa` | Nuevo — sujeto a V-F-3 |
| Sanciones masivas | `sanciones_masiva` | Semanal | `/api/cron/sanciones` | Nuevo — sujeto a V-F-2 |
| Histórico adjudicaciones | — | Carga inicial única + incremental semanal | script `npm run al:backfill` + `/api/cron/historico` | Nuevo |
| SIRI / RUES | — | Bajo demanda, caché 30 d | `/api/al/sanciones/[nit]` | Nuevo — sin cron |

**Si V-F-5 dice que el plan no admite estas cadencias:** un único
`app/api/cron/tick/route.ts` diario o cada 6 h que decide internamente qué corre
según `new Date().getUTCHours()` y el día del mes. Mismo código, misma
arquitectura, un solo cron declarado.

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
/** Puro. Sin SQL, sin IO. Testeable con fixtures. */
export function evaluarFiltro(
  filtro: FiltroUsuario,
  proceso: ProcesoEvaluable
): { match: true } | { match: false; motivo: MotivoDescarte; evidencia: unknown };

// src/lib/al/matching/buscar-por-filtro.ts
/** Traduce el filtro a un WHERE de Drizzle. Prefiltro en SQL, no en memoria. */
export async function buscarPorFiltro(
  filtro: FiltroUsuario,
  opts?: { desde?: Date; limit?: number }
): Promise<ProcesoEvaluable[]>;

// src/lib/al/matching/registrar-descartes.ts
export async function registrarDescartes(
  capa: "ingesta" | "filtro",
  descartes: DescarteInput[]
): Promise<number>;
```

`evaluarFiltro` devuelve el motivo en el caso negativo: es lo que alimenta
`al_descartes` sin una segunda pasada.

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

| Migración | Contenido | Riesgo |
|---|---|---|
| `0018` | `al_filtros_usuario`, `al_reportes`, `al_descartes` (CREATE + enableRLS) | Nulo: tablas nuevas |
| `0019` | `ADD COLUMN` nullable en `coincidencia`, `envio_log`, `alerta_preferencias` | Nulo: nullable, sin default, ninguna query las nombra |
| `0020` | `al_proceso_evento` | Nulo |
| `0021` | `al_oferentes_historico` (DDL cerrado tras V-F) | Nulo |
| `0022` | `al_sanciones`, `al_sanciones_cache` (DDL cerrado tras V-F-2) | Nulo |
| `0023` | Backfill `account_id = usuario_id` (UPDATE, sin DDL) | Bajo: idempotente, con `WHERE account_id IS NULL` |

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

### Fase 0 — Verificación de fuentes · BLOQUEANTE

Ejecutar V-F-1 … V-F-6 (§3) y pegar las salidas en este documento.

**Aceptación:** las seis casillas de §3 marcadas, cada una con el comando y su
salida literal. `git log --oneline -1 docs/sdd/00-esqueleto.md` muestra el commit
que las cerró.

---

### Fase 1 — Cimientos: migración pendiente + tablas base

Aplicar `0017`; crear `0018` (`al_filtros_usuario`, `al_reportes`, `al_descartes`),
`0019` (ADD COLUMN) y `0023` (backfill `account_id`). CRUD de filtros en
`/api/al/filtros`.

**Aceptación:**
1. `psql "$DATABASE_URL" -c "\d usuario"` incluye la columna `plan`.
2. La consulta de RLS de §10.3 devuelve **0 filas**.
3. `grep -cE "DROP |ALTER COLUMN |RENAME " drizzle/0018*.sql drizzle/0019*.sql` → `0`.
4. `psql -c "SELECT count(*) FROM coincidencia WHERE account_id IS NULL;"` → `0`.
5. `curl -X POST .../api/al/filtros` con sesión crea una fila; el mismo POST sin
   sesión devuelve 401.

---

### Fase 2 — Histórico de adjudicaciones (módulo 2)

`0021` + backfill de adjudicaciones 2015→hoy **solo adjudicadas**, derivado de
`raw_record`/`contrato` ya aterrizados. Script `npm run al:backfill-historico`,
incremental semanal después.

**Aceptación:**
1. `psql -c "SELECT count(*), min(fecha_adjudicacion), max(fecha_adjudicacion) FROM al_oferentes_historico;"` → count > 0 y `min <= '2016-12-31'`.
2. Ejecutar el backfill **dos veces seguidas**: el `count(*)` de la segunda es
   idéntico al de la primera (idempotencia por UNIQUE).
3. `psql -c "SELECT count(*) FROM al_oferentes_historico WHERE valor_adjudicado IS NULL;"` → menor al 5 % del total.
4. `historialCompetidor('<NIT real del sector>')` devuelve ≥1 adjudicación y su
   `ratioAdjudicadoSobreEstimado` está entre 0 y 2.
5. `pg_database_size` tras el backfill sigue por debajo del 90 % de la cuota
   (mismo comando de V-F-6).

---

### Fase 3 — Sanciones e inhabilidades (módulo 3)

`0022` + cruce masivo semanal de la fuente de V-F-2 + `/api/al/sanciones/[nit]`
para SIRI y RUES bajo demanda con caché de 30 días.

**Aceptación:**
1. Tras la primera corrida del cruce masivo, `al_sanciones` tiene ≥1 fila.
2. Segunda corrida consecutiva: `count(*)` no aumenta (UNIQUE + `onConflictDoNothing`).
3. `curl /api/al/sanciones/<nit>` dos veces seguidas: la segunda responde en
   <100 ms y `al_sanciones_cache.consultado_en` **no** cambia entre ambas.
4. `psql -c "SELECT count(*) FROM al_sanciones_cache WHERE expira_en <= consultado_en;"` → `0`.
5. Un NIT sin hallazgos devuelve `estado='no_encontrado'`, no un error.

---

### Fase 4 — Motor de filtros + auditoría de descartes (módulo 5)

`buscarPorFiltro` + `evaluarFiltro` + escritura en `al_descartes` en ambas capas.

**Aceptación:**
1. Tras dos ejecuciones consecutivas del cron, `coincidencia` gana ≥1 fila y
   `psql -c "SELECT count(*) FROM (SELECT usuario_id, proceso_id FROM coincidencia GROUP BY 1,2 HAVING count(*)>1) d;"` → `0`.
2. `al_descartes` tiene filas con al menos tres `motivo` distintos.
3. `npm test -- evaluar-filtro` pasa, con un caso por cada `MotivoDescarte`.
4. Un filtro con todos los arrays vacíos devuelve **todos** los procesos abiertos
   del sector, no cero (§4.2: vacío = sin restricción).
5. La consulta de muestreo de §6.2 devuelve 25 filas legibles con su motivo.

---

### Fase 5 — Máquina de estados de procesos (módulo 4)

`0020` + `/api/cron/eventos` (o el despachador de V-F-5) que compara el snapshot
nuevo contra el anterior y escribe apertura, adenda con diff y adjudicación.

**Aceptación:**
1. Tras dos ejecuciones consecutivas del cron sin cambios en la fuente,
   `al_proceso_evento` **no gana filas** en la segunda.
2. `psql -c "SELECT count(*) FROM al_proceso_evento WHERE tipo_evento='adenda' AND delta IS NULL;"` → `0`. Una adenda sin diff es un aviso, y eso es exactamente lo que este módulo no debe producir.
3. Ningún campo de `volatileFields` (`src/lib/ingest/sources.ts`) aparece como clave
   dentro de `delta`: `psql -c "SELECT count(*) FROM al_proceso_evento WHERE delta @> '[{\"campo\":\"visualizaciones_del\"}]';"` → `0`.
4. Los tres `tipo_evento` aparecen al menos una vez tras una semana de operación.

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

- DDL definitivo de `al_oferentes_historico` y `al_sanciones` (depende de V-F).
- Lista exacta de campos que entran al `delta` de una adenda (módulo 4).
- Política de retención de `al_descartes` (candidato: 90 días).
- Esquema del `payload` de cada `tipo` de reporte (módulo 6).
- Si el PAA aterriza como `IngestSource` propio o como tabla derivada (depende de
  si trae UNSPSC — V-F-3).
- Si `pliego_extraer` y el histórico quedan tras la frontera `pro` de
  `src/lib/acceso/politica.ts`. **Supuesto de v1: todo lo nuevo es nivel `gratis`.**
