/**
 * Commercial & Supply Intelligence — esquema (CI-04). Fuente: docs/sdd/00-esqueleto.md
 * §4.9; plan: docs/superpowers/plans/2026-11-09-ci-03-plan-de-datos.md.
 *
 * Este archivo cubre las migraciones A (perfil de empresa, consentimiento,
 * seguimiento, auditoría) y C (línea base y cambios de contrato). Quedan fuera,
 * a propósito, B (evidencia y necesidades) y D (`representacion_proveedor`,
 * compartida con Talent Intelligence, D10): no se generan hasta cerrar sus
 * precondiciones.
 *
 * Reglas del bloque:
 *  · Toda tabla nace con `.enableRLS()` y sin políticas (R6, CLAUDE.md §4).
 *  · La taxonomía tecnológica NO tiene tablas (D16): vive en
 *    `src/lib/tecnologia/taxonomia-v1.ts`; aquí solo se guarda `nodo_codigo` +
 *    `taxonomia_version` como `text`, y la validez la comprueba el código.
 *  · Estados como `text` + CHECK solo donde son frontera de confianza.
 *  · Consulta sobre filas de cuenta SIEMPRE filtrada por `usuario_id` (R8).
 *  · Las tablas append-only (`ci_consentimiento`, `ci_auditoria`) se protegen con
 *    un trigger escrito a mano en la migración (Drizzle no modela triggers).
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { usuario } from "./cuentas";
import { contrato } from "./hechos";

const money = (name: string) => numeric(name, { precision: 20, scale: 2 });

/** Estado de procedencia de un dato de empresa: declarado < documentado < verificado. */
const ESTADOS_DATO = "('declarado','documentado','verificado')";

/** Empresa comercial (internacional). Una cuenta = una empresa en V1 (D2). */
export const ciEmpresa = pgTable(
  "ci_empresa",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    usuarioId: text("usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    razonSocial: text("razon_social").notNull(),
    /** ISO 3166-1 alfa-2. */
    pais: text("pais").notNull(),
    registroEmpresarial: text("registro_empresarial"),
    sitioOficial: text("sitio_oficial"),
    coberturaNacional: boolean("cobertura_nacional").default(false).notNull(),
    estadoVerificacion: text("estado_verificacion").default("sin_verificar").notNull(),
    /**
     * Idiomas, monedas, certificaciones, garantías, soporte, repuestos, tiempos,
     * instalación, importación/entrega y operación directa o con aliado. Cada
     * campo es `{ valor, estado }` con `estado` declarado|documentado|verificado.
     * Sin listas de precios.
     */
    atributos: jsonb("atributos")
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("ci_empresa_usuario_uq").on(t.usuarioId),
    index("ci_empresa_pais_idx").on(t.pais),
    check("ci_empresa_pais_ck", sql`char_length(${t.pais}) = 2`),
    check(
      "ci_empresa_verificacion_ck",
      sql`${t.estadoVerificacion} IN ('sin_verificar','en_revision','verificada','rechazada','revocada')`
    ),
  ]
).enableRLS();

export const ciEmpresaRol = pgTable(
  "ci_empresa_rol",
  {
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => ciEmpresa.id, { onDelete: "cascade" }),
    rol: text("rol").notNull(),
    estadoDato: text("estado_dato").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.empresaId, t.rol] }),
    check(
      "ci_empresa_rol_rol_ck",
      sql`${t.rol} IN ('fabricante_internacional','fabricante_colombiano','distribuidor_autorizado','representante_comercial','importador','integrador_tecnologico','empresa_ingenieria','empresa_constructora','prestador_servicios_especializados','consultora','instalacion_mantenimiento','operador_infraestructura')`
    ),
    check("ci_empresa_rol_estado_ck", sql`${t.estadoDato} IN ${sql.raw(ESTADOS_DATO)}`),
  ]
).enableRLS();

export const ciEmpresaCapacidad = pgTable(
  "ci_empresa_capacidad",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => ciEmpresa.id, { onDelete: "cascade" }),
    /** Código de `taxonomia-v1.ts`; validado en código, no por FK (D16). */
    nodoCodigo: text("nodo_codigo").notNull(),
    taxonomiaVersion: text("taxonomia_version").notNull(),
    estadoDato: text("estado_dato").notNull(),
    marcas: text("marcas").array(),
    /** Sin precios ni listas de precios (brief §6). */
    especificaciones: jsonb("especificaciones"),
  },
  (t) => [
    uniqueIndex("ci_empresa_capacidad_empresa_nodo_uq").on(t.empresaId, t.nodoCodigo),
    index("ci_empresa_capacidad_nodo_idx").on(t.nodoCodigo),
    check("ci_empresa_capacidad_estado_ck", sql`${t.estadoDato} IN ${sql.raw(ESTADOS_DATO)}`),
  ]
).enableRLS();

export const ciEmpresaCobertura = pgTable(
  "ci_empresa_cobertura",
  {
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => ciEmpresa.id, { onDelete: "cascade" }),
    /** DIVIPOLA de departamento (2 dígitos) o municipio (5). */
    divipola: text("divipola").notNull(),
    estadoDato: text("estado_dato").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.empresaId, t.divipola] }),
    check("ci_empresa_cobertura_divipola_ck", sql`${t.divipola} ~ '^[0-9]{2}([0-9]{3})?$'`),
    check("ci_empresa_cobertura_estado_ck", sql`${t.estadoDato} IN ${sql.raw(ESTADOS_DATO)}`),
  ]
).enableRLS();

/**
 * Prueba de consentimiento (Ley 1581). Append-only: el estado vigente es la
 * última fila por (usuario, finalidad). Independiente del consentimiento de
 * marketing (`senal_usuario`) y de las alertas de licitación.
 */
export const ciConsentimiento = pgTable(
  "ci_consentimiento",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    usuarioId: text("usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    finalidad: text("finalidad").notNull(),
    accion: text("accion").notNull(),
    versionTexto: text("version_texto").notNull(),
    creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("ci_consentimiento_vigente_idx").on(t.usuarioId, t.finalidad, t.creadoEn.desc()),
    check("ci_consentimiento_finalidad_ck", sql`${t.finalidad} IN ('alertas_comerciales')`),
    check("ci_consentimiento_accion_ck", sql`${t.accion} IN ('alta','baja')`),
  ]
).enableRLS();

/**
 * Seguimiento comercial. Los PROCESOS no entran aquí: se siguen guardando por
 * `/mis-procesos` (`senal_usuario`), sin duplicar.
 */
export const ciSeguimiento = pgTable(
  "ci_seguimiento",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    usuarioId: text("usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    objetoTipo: text("objeto_tipo").notNull(),
    objetoId: text("objeto_id").notNull(),
    creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("ci_seguimiento_unico_uq").on(t.usuarioId, t.objetoTipo, t.objetoId),
    check("ci_seguimiento_tipo_ck", sql`${t.objetoTipo} IN ('contrato','necesidad','contratista')`),
  ]
).enableRLS();

/** Auditoría inmutable. Sin FK a `usuario`: el registro sobrevive a la cuenta. Sin datos sensibles en `detalle`. */
export const ciAuditoria = pgTable(
  "ci_auditoria",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorTipo: text("actor_tipo").notNull(),
    actorId: text("actor_id"),
    accion: text("accion").notNull(),
    objetoTipo: text("objeto_tipo"),
    objetoId: text("objeto_id"),
    detalle: jsonb("detalle"),
    creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("ci_auditoria_actor_idx").on(t.actorId, t.creadoEn.desc()),
    index("ci_auditoria_objeto_idx").on(t.objetoTipo, t.objetoId),
  ]
).enableRLS();

// ── Migración C: línea base y cambios de contrato ────────────────────────────
// La ausencia de `contrato_evento` (eliminada 2026-08-16, drizzle/0011) deja sin
// historial `valor_actual`, `fecha_fin_actual` y `estado_actual`. Se reconstruye
// con una línea base acotada (como `al_proceso_estado`), no con `raw_record`.

/** Una fila por contrato: la última foto vista. Se sobrescribe en cada detección. */
export const ciContratoEstado = pgTable("ci_contrato_estado", {
  contratoId: uuid("contrato_id")
    .primaryKey()
    .references(() => contrato.id),
  valorActual: money("valor_actual"),
  fechaFinActual: date("fecha_fin_actual"),
  estadoActual: text("estado_actual"),
  vistoEn: timestamp("visto_en", { withTimezone: true }).notNull(),
}).enableRLS();

/**
 * Cambios detectados. Idempotente por (contrato, campo, valor nuevo).
 * Retención: los 20 más recientes por contrato (la poda es del job, no de la tabla).
 */
export const ciContratoCambio = pgTable(
  "ci_contrato_cambio",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contratoId: uuid("contrato_id")
      .notNull()
      .references(() => contrato.id),
    campo: text("campo").notNull(),
    valorAnterior: text("valor_anterior"),
    valorNuevo: text("valor_nuevo"),
    detectadoEn: timestamp("detectado_en", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("ci_contrato_cambio_unico_uq").on(t.contratoId, t.campo, t.valorNuevo),
    index("ci_contrato_cambio_contrato_idx").on(t.contratoId, t.detectadoEn.desc()),
    check(
      "ci_contrato_cambio_campo_ck",
      sql`${t.campo} IN ('valor_actual','fecha_fin_actual','estado_actual')`
    ),
  ]
).enableRLS();
