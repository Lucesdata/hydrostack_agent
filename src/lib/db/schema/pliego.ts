// src/lib/db/schema/pliego.ts

/**
 * Pliego subido manualmente por un usuario cuando SECOP II bloquea el
 * acceso automático (muro ReCaptcha, ver document-access.ts — un probe
 * server-side nunca lo pasa). Un pliego activo por proceso: el documento
 * es público, no privado por usuario, así que subir uno nuevo reemplaza al
 * anterior (upsert por `procesoId`).
 *
 * `procesoId` es el id NATIVO de SECOP (`secopProcesoId`, tipo
 * "CO1.REQ.xxxx"), no el uuid interno de la tabla `proceso` — el motor de
 * matching (`SecopProceso.id` en src/lib/secop/types.ts) solo conoce el id
 * nativo, mismo criterio que `coincidencia.procesoId` en cuentas.ts.
 */

import {
  pgTable,
  text,
  uuid,
  jsonb,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { usuario } from "./cuentas";

export const pliegoProceso = pgTable(
  "pliego_proceso",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    procesoId: text("proceso_id").notNull(),
    /** Atribución/auditoría, no ownership: el pliego es público (ver comentario del archivo). */
    subidoPorUsuarioId: text("subido_por_usuario_id").references(() => usuario.id, {
      onDelete: "set null",
    }),
    nombreArchivo: text("nombre_archivo").notNull(),
    /** PliegoExtraction (src/lib/pliego/schema.ts) */
    extraction: jsonb("extraction").notNull(),
    /** ValidationReport (src/lib/pliego/validate.ts) */
    validation: jsonb("validation").notNull(),
    /** HybridExtraction["origen"] — por campo, reglas vs. llm */
    origen: jsonb("origen").notNull(),
    /** Denormalizado desde validation.ok — filtra sin deserializar el jsonb. */
    gateMatematicoPasado: boolean("gate_matematico_pasado").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("pliego_proceso_proceso_id_uq").on(t.procesoId),
    index("pliego_proceso_gate_idx").on(t.gateMatematicoPasado),
  ]
);
