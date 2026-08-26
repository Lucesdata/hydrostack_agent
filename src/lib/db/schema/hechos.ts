import {
  pgTable,
  uuid,
  text,
  numeric,
  date,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { entidad, geografia, proveedor } from "./catalogos";
import { rawRecord } from "./raw";

const money = (name: string) => numeric(name, { precision: 20, scale: 2 });

/** Proceso de contratación. Foto de estado (mutable). */
export const proceso = pgTable(
  "proceso",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    secopProcesoId: text("secop_proceso_id").notNull(), // CO1.REQ.xxxx (id nativo)
    portafolioId: text("portafolio_id"), // CO1.BDOS.xxxx — llave de enlace con contrato (D11/H1)
    referencia: text("referencia"),
    entidadId: uuid("entidad_id").references(() => entidad.id),
    geografiaId: text("geografia_id").references(() => geografia.codigoDivipola),
    modalidad: text("modalidad"),
    tipoContrato: text("tipo_contrato"),
    objeto: text("objeto"),
    valorEstimado: money("valor_estimado"),
    fechaPublicacion: date("fecha_publicacion"),
    estadoActual: text("estado_actual"),
    estadoCodigo: text("estado_codigo"),
    // Gate de acceso documental (B2/C). text (no enum) para añadir estados sin
    // migración: PUBLIC | RESTRICTED | NOT_PUBLISHED | UNKNOWN. Solo PUBLIC llega
    // al extractor de pliegos. `evaluated_at` marca la última (pre)clasificación.
    documentAccess: text("document_access"),
    documentAccessReason: text("document_access_reason"),
    documentAccessMethod: text("document_access_method"), // metadata | probe
    documentAccessEvaluatedAt: timestamp("document_access_evaluated_at", { withTimezone: true }),
    rawRecordIdActual: uuid("raw_record_id_actual").references(() => rawRecord.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }), // soft delete (D6)
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("proceso_secop_id_uq").on(t.secopProcesoId),
    index("proceso_portafolio_idx").on(t.portafolioId),
    index("proceso_doc_access_idx").on(t.documentAccess),
  ]
).enableRLS();

/**
 * Contrato. Foto de estado (mutable).
 * valor_inicial / fecha_fin_inicial inmutables; *_actual mutan vía eventos (0.1 §2).
 */
export const contrato = pgTable(
  "contrato",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    secopContratoId: text("secop_contrato_id").notNull(), // CO1.PCCNTR.xxxx
    // Resuelto vía proceso.portafolio_id (contratos.proceso_de_compra), no por id_del_proceso (H1)
    procesoId: uuid("proceso_id").references(() => proceso.id),
    proveedorId: uuid("proveedor_id").references(() => proveedor.id),
    proveedorRaw: text("proveedor_raw"), // texto crudo cuando proveedor_id es NULL (basura/centinela)
    entidadId: uuid("entidad_id").references(() => entidad.id),
    geografiaId: text("geografia_id").references(() => geografia.codigoDivipola),
    objeto: text("objeto"),
    referencia: text("referencia"),
    modalidad: text("modalidad"),
    tipoContrato: text("tipo_contrato"),
    valorInicial: money("valor_inicial"),
    valorActual: money("valor_actual"),
    fechaFirma: date("fecha_firma"),
    fechaInicio: date("fecha_inicio"),
    fechaFinInicial: date("fecha_fin_inicial"),
    fechaFinActual: date("fecha_fin_actual"),
    estadoActual: text("estado_actual"),
    prorrogable: boolean("prorrogable"),
    // Ejecución financiera: solo foto, NO genera eventos (D13)
    valorFacturado: money("valor_facturado"),
    valorPagado: money("valor_pagado"),
    valorPendientePago: money("valor_pendiente_pago"),
    ultimaModificacionAt: timestamp("ultima_modificacion_at", { withTimezone: true }),
    rawRecordIdActual: uuid("raw_record_id_actual").references(() => rawRecord.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }), // soft delete (D6)
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("contrato_secop_id_uq").on(t.secopContratoId),
    index("contrato_proveedor_idx").on(t.proveedorId),
    index("contrato_entidad_idx").on(t.entidadId),
    index("contrato_estado_idx").on(t.estadoActual),
  ]
).enableRLS();

// contrato_evento (log append-only de cambios detectados por diff entre
// snapshots) se eliminó el 2026-08-16: no tenía ningún lector (ninguna vista,
// API o email la usaba) y dependía del raw_record append-only que llenó la
// cuota de Neon. Si en el futuro hace falta historial de cambios, reconstruir
// como log acotado (ej. últimos N eventos por contrato), no antes de que algo
// lo lea.
