/**
 * Inteligencia competitiva (SDD `docs/sdd/00-esqueleto.md`) — tablas `al_*`.
 *
 * Todo lo nuevo del SDD vive aquí y no en los archivos de esquema existentes:
 * el prefijo `al_` y un único archivo hacen visible de un vistazo qué es nuevo
 * frente al esquema intocable (SDD §4.0, restricción R7).
 *
 * `account_id` es `text` y **sin FK**: en v1 contiene `usuario.id`, y en fase 2
 * apuntará a una tabla de cuenta que todavía no existe. Poner la FK ahora la
 * forzaría a existir. La regla que hace útil la columna es R8: el código nuevo
 * filtra por `account_id`, nunca por `usuario_id` — ninguna consulta puede
 * asumir que usuario y cuenta son lo mismo.
 *
 * Toda tabla nace con `.enableRLS()` (CLAUDE.md §4, restricción R6). No es
 * negociable: es lo que deja permanente el cierre de la Data API de 2026-08-26.
 */

import {
  pgTable,
  text,
  uuid,
  boolean,
  integer,
  numeric,
  jsonb,
  timestamp,
  date,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { usuario } from "./cuentas";
import { proceso } from "./hechos";
import { proveedor, entidad, geografia } from "./catalogos";
import { rawRecord } from "./raw";

/** Mismo helper que `hechos.ts`: dinero como numeric(20,2), nunca float. */
const money = (name: string) => numeric(name, { precision: 20, scale: 2 });

/**
 * Criterios de búsqueda declarados por el usuario (SDD §4.2).
 *
 * Es lo que hoy no existe: el matching actual deriva todo del perfil de oferente
 * (`getMatchesForPerfil` → `searchProcesosDb`), y `alerta_preferencias` solo
 * guarda `activo` y `hora_envio`. Una cuenta puede tener varios filtros.
 *
 * Semántica, fijada en el SDD para que ninguna spec la reinterprete: un array
 * NULL o vacío significa "sin restricción", **nunca** "no coincide con nada".
 */
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
    /**
     * Términos libres en MAYÚSCULAS y accent-safe — misma regla que
     * `secop/ingest-net.ts`: `upper()` de SoQL no quita tildes, así que
     * "POTABILIZ" matchea "POTABILIZACIÓN" pero "CAPTACIÓN" no matchea
     * "CAPTACION". Mantener la propiedad al validar la entrada del usuario.
     */
    palabrasClave: text("palabras_clave").array(),
    /** Términos que descalifican aunque haya match positivo. */
    palabrasExcluidas: text("palabras_excluidas").array(),
    /** NITs canónicos (solo dígitos, sin DV) — cruza con `entidad.nit_canonico`. */
    entidadesNit: text("entidades_nit").array(),
    /** DIVIPOLA de 5 dígitos, o de 2 para un departamento completo. */
    divipola: text("divipola").array(),
    modalidades: text("modalidades").array(),
    valorMin: money("valor_min"),
    valorMax: money("valor_max"),

    /** Subset de apertura|adenda|adjudicacion — qué transiciones notifica este filtro. */
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

/**
 * Reportes web permanentes (SDD §9). URL propia, contenido congelado al
 * generarse: el reporte NO se recalcula al visitarlo, que es lo que permite
 * enlazarlo desde el correo y medir su tráfico.
 *
 * Regla dura: un reporte `publico` no puede contener nombre, email, perfil ni
 * filtros de ninguna cuenta.
 */
export const alReportes = pgTable(
  "al_reportes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Segmento de URL: /reportes/<slug>. Inmutable una vez publicado. */
    slug: text("slug").notNull(),
    /** 'publico' (indexable, sin datos de cuenta) | 'privado' (sesión + account_id). */
    visibilidad: text("visibilidad").notNull().default("privado"),
    /** NULL solo si visibilidad='publico'. */
    accountId: text("account_id"),

    /** 'digest_diario' | 'competidor' | 'entidad' | 'mercado_departamento' */
    tipo: text("tipo").notNull(),
    titulo: text("titulo").notNull(),
    /** Parámetros que lo generaron: NIT del competidor, DIVIPOLA, rango de fechas… */
    parametros: jsonb("parametros").notNull(),
    /** Contenido ya resuelto. */
    payload: jsonb("payload").notNull(),

    generadoEn: timestamp("generado_en", { withTimezone: true }).defaultNow().notNull(),
    /** Se actualiza al regenerar; el slug no cambia nunca. */
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).defaultNow().notNull(),
    vistas: integer("vistas").default(0).notNull(),
  },
  (t) => [
    uniqueIndex("al_reportes_slug_uq").on(t.slug),
    index("al_reportes_account_idx").on(t.accountId),
    index("al_reportes_tipo_idx").on(t.tipo),
  ]
).enableRLS();

/**
 * Auditoría del matching determinista (SDD §4.4, §6.2).
 *
 * Existe porque un fallo en la curación de UNSPSC o de sinónimos **no produce
 * falsos positivos: produce silencio**, y el silencio es invisible sin esto.
 * Registra las dos capas: la red de ingesta (`ingest-net.ts`, antes de
 * aterrizar) y el filtro de un usuario (después).
 *
 * ⚠️ Crece más rápido que cualquier otra tabla del esquema: un descarte por
 * proceso evaluado y por filtro. La spec del módulo 5 debe fijar el borrado por
 * antigüedad (candidato: 90 días). El crecimiento sin límite de una tabla
 * append-only ya llenó la cuota una vez (`raw_record`, 2026-08-26).
 */
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
    /** Objeto recortado a 300 chars: auditable a ojo sin duplicar el payload. */
    objetoResumen: text("objeto_resumen"),
    unspscObservado: text("unspsc_observado"),
    valorEstimado: money("valor_estimado"),
    entidadNit: text("entidad_nit"),
    divipola: text("divipola"),

    /**
     * 'sin_unspsc_ni_keyword' | 'segmento_80_excluido' | 'palabra_excluida'
     * | 'fuera_de_cuantia' | 'fuera_de_zona' | 'entidad_no_listada'
     * | 'modalidad_no_listada'
     */
    motivo: text("motivo").notNull(),
    /** Qué término se evaluó, contra qué campo, con qué resultado. */
    evidencia: jsonb("evidencia"),

    /**
     * Versión de la red/diccionario que produjo el descarte. Sin esto la tabla no
     * distingue "lo descartamos con la red vieja" de "lo descartamos con la
     * nueva" y deja de ser auditoría. Se sube cada vez que se toca la red.
     */
    redVersion: text("red_version").notNull(),
    creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("al_descartes_capa_motivo_idx").on(t.capa, t.motivo),
    index("al_descartes_creado_idx").on(t.creadoEn),
    index("al_descartes_account_idx").on(t.accountId),
  ]
).enableRLS();

/**
 * Caché de las consultas de sanciones bajo demanda (SDD §4.6).
 *
 * Tras la V-F-2 la única fuente bajo demanda es RUES: SIRI quedó descartado
 * (42.842 cédulas y cero NITs — no cruza con `proveedor.nit_canonico`). La
 * columna `fuente` se deja abierta por si RUES gana compañía.
 *
 * Un error también se cachea, con TTL corto: si la fuente está caída, reintentar
 * en cada visita a la ficha del proveedor no la va a levantar.
 */
export const alSancionesCache = pgTable(
  "al_sanciones_cache",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** 'rues' (única bajo demanda tras la V-F-2). */
    fuente: text("fuente").notNull(),
    /** NIT canónico: solo dígitos, sin DV — misma normalización que `proveedor`. */
    nitCanonico: text("nit_canonico").notNull(),

    /** Respuesta cruda de la fuente; su interpretación vive en el módulo 3. */
    payload: jsonb("payload"),
    /** 'ok' | 'no_encontrado' | 'error' */
    estado: text("estado").notNull(),
    /** Resumen booleano para la ruta rápida. */
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

/**
 * Máquina de estados de procesos (SDD §4.3). Gemelo de `contrato_evento`
 * aplicado a `proceso`: aquél solo cubre contratos, y el diff de adendas es de
 * procesos. Append-only.
 *
 * La adenda se trata como **diff, no como aviso**: es la transición de mayor
 * valor para el usuario, y "hubo una adenda" sin decir qué cambió no sirve.
 *
 * Se crea aquí, en la Fase 1, aunque su lógica de detección llegue en la Fase 5:
 * el esqueleto es la fuente única de verdad del esquema y las tablas nacen
 * juntas para que ninguna spec de módulo tenga que inventar DDL.
 */
export const alProcesoEvento = pgTable(
  "al_proceso_evento",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    procesoId: uuid("proceso_id")
      .notNull()
      .references(() => proceso.id, { onDelete: "cascade" }),
    /** Id nativo además del uuid, para joins baratos contra `coincidencia`. */
    secopProcesoId: text("secop_proceso_id").notNull(),

    /** 'apertura' | 'adenda' | 'adjudicacion' — text y no enum: añadir un valor no debe pedir migración. */
    tipoEvento: text("tipo_evento").notNull(),

    sourceObservedAt: timestamp("source_observed_at", { withTimezone: true }),
    detectedAt: timestamp("detected_at", { withTimezone: true }).defaultNow().notNull(),

    estadoAnterior: text("estado_anterior"),
    estadoNuevo: text("estado_nuevo"),
    valorAnterior: money("valor_anterior"),
    valorNuevo: money("valor_nuevo"),
    fechaCierreAnterior: date("fecha_cierre_anterior"),
    fechaCierreNueva: date("fecha_cierre_nueva"),

    /**
     * Diff completo campo a campo, que es lo que se renderiza en el correo:
     *   [{ campo: "valor_estimado", antes: "120000000", despues: "145000000" }]
     * Los campos volátiles de `ingest/sources.ts` quedan EXCLUIDOS del diff igual
     * que del `payload_hash`, o se generan adendas espurias en cada corrida.
     */
    delta: jsonb("delta"),

    rawRecordId: uuid("raw_record_id").references(() => rawRecord.id),
    /** Hash del payload nuevo — la llave de idempotencia real. */
    payloadHash: text("payload_hash").notNull(),
  },
  (t) => [
    /** El detector reprocesa ventanas solapadas: mismo snapshot ⇒ ningún evento nuevo. */
    uniqueIndex("al_proceso_evento_idem_uq").on(t.procesoId, t.tipoEvento, t.payloadHash),
    index("al_proceso_evento_detected_idx").on(t.detectedAt),
    index("al_proceso_evento_proceso_idx").on(t.secopProcesoId),
  ]
).enableRLS();

/**
 * Histórico de participación en procesos del sector (SDD §4.7, módulo 2).
 *
 * Una fila = un (proceso, proveedor). Responde las dos preguntas que ningún
 * competidor del nicho responde: **contra quién compito** y **a qué precio gana
 * el que gana**.
 *
 * Dos orígenes, ambos verificados en la V-F:
 *  - `proceso`     → el ADJUDICATARIO, derivado de `raw_record` ya aterrizado.
 *                    Sin red: el dato ya está en casa.
 *  - `proponentes` → los DEMÁS que se presentaron, del dataset `hgi6-6wh3`
 *                    (Proponentes por Proceso SECOP II, 2,3 M filas, 2015→hoy).
 *
 * **El precio solo se conoce del ganador.** La fuente no publica el valor
 * ofertado por quien pierde, y no se añade scraping para conseguirlo (no-objetivo
 * §1.3). `valor_adjudicado` es NULL en toda fila con `adjudicado=false`, y eso es
 * un límite de la fuente, no un dato pendiente de cargar.
 *
 * No lleva `account_id`: es dato de mercado, común a todas las cuentas.
 */
export const alOferentesHistorico = pgTable(
  "al_oferentes_historico",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    secopProcesoId: text("secop_proceso_id").notNull(),
    /** FK al canónico cuando el proceso está aterrizado; NULL si solo lo trae la fuente de proponentes. */
    procesoId: uuid("proceso_id").references(() => proceso.id, { onDelete: "cascade" }),

    /**
     * Llave de deduplicación del proveedor dentro de un proceso: el NIT canónico
     * cuando existe, y el nombre normalizado cuando no.
     *
     * El SDD preveía `UNIQUE (secop_proceso_id, proveedor_id)`, pero eso no
     * deduplica: solo el 49% de los adjudicados trae NIT, y en Postgres los NULL
     * de un índice único no colisionan entre sí — el backfill habría insertado
     * duplicados en cada corrida para la mitad de las filas.
     */
    proveedorKey: text("proveedor_key").notNull(),
    /** Dígitos, sin DV — cruza con `proveedor.nit_canonico` y con `al_sanciones`. */
    proveedorNit: text("proveedor_nit"),
    /** Razón social tal como la publica la fuente. Poblada en el 99,98% de los adjudicados. */
    proveedorNombre: text("proveedor_nombre").notNull(),
    /** Resuelto por NIT contra el catálogo; NULL si ese proveedor aún no tiene contratos. */
    proveedorId: uuid("proveedor_id").references(() => proveedor.id),

    /** `true` = ganó. `false` = se presentó y perdió. */
    adjudicado: boolean("adjudicado").notNull(),

    entidadId: uuid("entidad_id").references(() => entidad.id),
    entidadNit: text("entidad_nit"),
    geografiaId: text("geografia_id").references(() => geografia.codigoDivipola),
    /** UNSPSC sin el prefijo "V1." que trae la fuente. */
    unspsc: text("unspsc"),
    modalidad: text("modalidad"),

    /** Precio de referencia de la entidad. Puede ser 0 en la fuente: se guarda NULL. */
    valorEstimado: money("valor_estimado"),
    /** Precio al que se gana. NULL cuando `adjudicado=false` — la fuente no lo publica. */
    valorAdjudicado: money("valor_adjudicado"),

    fechaAdjudicacion: date("fecha_adjudicacion"),
    fechaPublicacion: date("fecha_publicacion"),

    /** 'proceso' | 'proponentes' — de qué fuente salió la fila. */
    fuente: text("fuente").notNull(),
    rawRecordId: uuid("raw_record_id").references(() => rawRecord.id),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    /** Idempotencia del backfill: reejecutarlo no puede duplicar una participación. */
    uniqueIndex("al_hist_proceso_proveedor_uq").on(t.secopProcesoId, t.proveedorKey),
    /** "Historial de este competidor" — la consulta principal del módulo. */
    index("al_hist_proveedor_fecha_idx").on(t.proveedorNit, t.fechaAdjudicacion),
    index("al_hist_entidad_fecha_idx").on(t.entidadId, t.fechaAdjudicacion),
    index("al_hist_unspsc_idx").on(t.unspsc),
    index("al_hist_adjudicado_idx").on(t.adjudicado),
  ]
).enableRLS();
