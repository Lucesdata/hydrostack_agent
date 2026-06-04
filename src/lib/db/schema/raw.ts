import { pgTable, uuid, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';

/**
 * Capa cruda (ELT landing). Append-only, inmutable: nunca UPDATE/DELETE.
 * Una fila = una observación de un registro de la fuente en un momento dado.
 */
export const rawRecord = pgTable(
  'raw_record',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Discriminador de fuente: secop_ii_procesos | secop_ii_contratos | ocds | ...
    source: text('source').notNull(),
    // Id nativo del registro en la fuente (id_del_proceso / id_contrato)
    sourceRecordId: text('source_record_id').notNull(),
    // Registro original tal cual llegó, sin recortar ni renombrar
    payload: jsonb('payload').notNull(),
    // SHA-256 del JSON canónico EXCLUYENDO campos volátiles (D10)
    payloadHash: text('payload_hash').notNull(),
    ingestedAt: timestamp('ingested_at', { withTimezone: true }).defaultNow().notNull(),
    // ultima_actualizacion / fecha_de_ultima_publicaci de la fuente; alimenta el watermark
    sourceUpdatedAt: timestamp('source_updated_at', { withTimezone: true }),
    batchId: uuid('batch_id').notNull(),
  },
  (t) => [
    index('raw_record_source_recid_updated_idx').on(t.source, t.sourceRecordId, t.sourceUpdatedAt),
    index('raw_record_source_hash_idx').on(t.source, t.payloadHash),
    index('raw_record_batch_idx').on(t.batchId),
    index('raw_record_payload_gin_idx').using('gin', t.payload),
  ],
);
