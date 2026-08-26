/**
 * Caché de requisitos habilitantes ya estructurados, por proceso. Insumo del
 * cálculo de habilitacionGate — NO es el resultado de una evaluación (esa
 * sigue sin persistirse, invariante D18 de verdict.ts). Sin RLS (CLAUDE.md
 * §4): compartida entre todos los usuarios porque describe el PROCESO, no
 * una cuenta — cualquier oferente que consulte el mismo proceso reusa la
 * misma extracción.
 */

import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const requisitosProceso = pgTable('requisitos_proceso', {
  procesoId: text('proceso_id').primaryKey(),
  requisitos: jsonb('requisitos').notNull(),
  extraidoEn: timestamp('extraido_en', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();
