import { pgTable, uuid, text, jsonb, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
// raw_record_payload_gin_idx (índice GIN sobre payload) fue retirado: idx_scan=0 desde
// siempre, consumía ~101MB (20% de la DB de 512MB) sin que ninguna query lo usara.
//
// 2026-08-26 — mismo caso, tres índices más, ~35MB: source_recid_updated_idx,
// source_hash_idx y batch_idx. Los tres eran del diseño append-only anterior
// (buscar la última versión de un registro, detectar cambios por hash,
// reprocesar por lote); con el upsert por (source, source_record_id) del
// 2026-08-16 dejaron de tener sentido y el planner nunca los eligió: 0
// escaneos en 9 días, frente a 262.649 del unique y 234.651 de la PK.
// Definiciones originales, por si hicieran falta:
//   CREATE INDEX raw_record_source_recid_updated_idx ON raw_record
//     USING btree (source, source_record_id, source_updated_at);
//   CREATE INDEX raw_record_source_hash_idx ON raw_record
//     USING btree (source, payload_hash);
//   CREATE INDEX raw_record_batch_idx ON raw_record USING btree (batch_id);

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
  (t) => [uniqueIndex("raw_record_source_recid_uq").on(t.source, t.sourceRecordId)]
).enableRLS();
