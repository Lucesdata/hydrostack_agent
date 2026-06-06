import { pgTable, uuid, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { rawRecord } from './raw';

/**
 * Cuarentena de transformación (0.4).
 *
 * Registra filas crudas que NO se pudieron mapear a la canónica por error
 * estructural (id ausente, JSON inesperado, parsing irrecuperable). Distinto de
 * los centinelas conocidos (NIT='No Definido', geografía 'No Definido'), que
 * son comportamiento esperado y terminan en columnas NULL legítimas — esos no
 * van a cuarentena.
 *
 * Append-only: nunca UPDATE/DELETE. Cada intento fallido = una fila. La revisión
 * y los retoques de reglas viven en 0.6; aquí solo capturamos el material.
 */
export const transformQuarantine = pgTable(
  'transform_quarantine',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    rawRecordId: uuid('raw_record_id').references(() => rawRecord.id),
    source: text('source').notNull(),
    sourceRecordId: text('source_record_id'),
    // Razón corta y estable: 'missing_id' | 'missing_nit' | 'parse_error' | ...
    reason: text('reason').notNull(),
    detail: jsonb('detail'), // contexto adicional (mensaje, payload key inválida, etc.)
    batchId: uuid('batch_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('quarantine_source_reason_idx').on(t.source, t.reason),
    index('quarantine_batch_idx').on(t.batchId),
  ],
);
