import { pgTable, uuid, text, numeric, boolean, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { proceso, contrato } from './hechos';

/**
 * Capa derivada: clasificación sectorial agua/saneamiento (0.2.1).
 * Recomputable: se trunca y regenera desde la canónica sin tocar el estado (D18).
 * clasificador_version permite comparar corridas entre versiones del clasificador (D20).
 */
export const clasificacionSectorial = pgTable(
  'clasificacion_sectorial',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contratoId: uuid('contrato_id').references(() => contrato.id),
    procesoId: uuid('proceso_id').references(() => proceso.id),
    sectorScore: numeric('sector_score', { precision: 5, scale: 4 }), // 0–1
    sectorTier: text('sector_tier'), // alta | media | baja
    sectorAgua: boolean('sector_agua').default(false).notNull(),
    sectorMatchReason: jsonb('sector_match_reason'), // qué señales dispararon y con qué evidencia
    clasificadorVersion: text('clasificador_version').notNull(),
    clasificadoAt: timestamp('clasificado_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('clasif_contrato_idx').on(t.contratoId),
    index('clasif_proceso_idx').on(t.procesoId),
    index('clasif_agua_idx').on(t.sectorAgua),
  ],
);
