import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';

/**
 * Control del incremental por fuente. El watermark de la próxima corrida es
 * MAX(watermark_to) WHERE source = ? AND status IN ('ok','partial') (0.1 §4.5).
 */
export const syncLog = pgTable(
  'sync_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    source: text('source').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    // Cursor de la fuente: timestamp "floating" de Socrata (sin zona), guardado
    // verbatim como texto. Se compara lexicográficamente y se reinyecta en el
    // $where sin conversión de zona (evita drift). Ver lib/ingest/watermark.ts.
    watermarkFrom: text('watermark_from'),
    watermarkTo: text('watermark_to'),
    recordsIngested: integer('records_ingested').default(0).notNull(),
    recordsFailed: integer('records_failed').default(0).notNull(),
    status: text('status').notNull().default('running'), // running | ok | failed | partial
    errorSummary: text('error_summary'),
    batchId: uuid('batch_id'), // liga la corrida con las filas de raw_record que produjo
  },
  (t) => [index('sync_log_source_status_idx').on(t.source, t.status)],
);
