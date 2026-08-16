import { pgTable, uuid, text, jsonb, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
// raw_record_payload_gin_idx (índice GIN sobre payload) fue retirado: idx_scan=0 desde
// siempre, consumía ~101MB (20% de la DB de 512MB) sin que ninguna query lo usara.

/**
 * Capa cruda (ELT landing). Upsert por (source, source_record_id) — una fila
 * por registro de la fuente, se sobrescribe al cambiar (2026-08-16). Antes era
 * append-only (una fila por cada cambio de payload_hash, sin techo); ese
 * crecimiento sin límite fue lo que llenó la cuota de Neon. `contrato_evento`
 * (que consumía ese historial) se eliminó junto con este cambio — no tenía
 * lectores.
 */
export const rawRecord = pgTable(
  "raw_record",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Discriminador de fuente: secop_ii_procesos | secop_ii_contratos | ocds | ...
    source: text("source").notNull(),
    // Id nativo del registro en la fuente (id_del_proceso / id_contrato)
    sourceRecordId: text("source_record_id").notNull(),
    // Registro original tal cual llegó, sin recortar ni renombrar
    payload: jsonb("payload").notNull(),
    // SHA-256 del JSON canónico EXCLUYENDO campos volátiles (D10)
    payloadHash: text("payload_hash").notNull(),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).defaultNow().notNull(),
    // ultima_actualizacion / fecha_de_ultima_publicaci de la fuente; alimenta el watermark
    sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
    batchId: uuid("batch_id").notNull(),
  },
  (t) => [
    uniqueIndex("raw_record_source_recid_uq").on(t.source, t.sourceRecordId),
    index("raw_record_source_recid_updated_idx").on(t.source, t.sourceRecordId, t.sourceUpdatedAt),
    index("raw_record_source_hash_idx").on(t.source, t.payloadHash),
    index("raw_record_batch_idx").on(t.batchId),
  ]
);
