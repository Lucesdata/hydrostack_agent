// src/lib/db/schema/asistentes.ts

/**
 * Asistentes de proyecto (Prompt 03 — Fase 1): documento subido, conversación
 * y mensajes por contexto ('ejecucion' | 'operacion', ver
 * src/lib/assistants/config.ts) + lista de espera del contexto 'mercado'
 * (aún no implementado). Sin RLS de Postgres — mismo motivo que
 * senal_usuario en cuentas.ts: este DB (Neon) se consulta siempre con el
 * DATABASE_URL de servidor, nunca como el usuario final. Aislamiento por
 * usuarioId en cada query de aplicación, como el resto del repo.
 */

import { pgTable, text, timestamp, uuid, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { usuario } from './cuentas';

/** Un documento subido por el usuario (contrato adjudicado o referencia normativa). */
export const documento = pgTable(
  'documento',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'cascade' }),
    /** 'contrato' | 'referencia' */
    tipo: text('tipo').notNull(),
    /** 'ejecucion' | 'operacion' */
    contexto: text('contexto').notNull(),
    nombreArchivo: text('nombre_archivo').notNull(),
    /** Ruta dentro del bucket privado 'contracts' de Supabase Storage. */
    rutaStorage: text('ruta_storage').notNull(),
    textoExtraido: text('texto_extraido').notNull(),
    creadoEn: timestamp('creado_en', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('documento_usuario_contexto_idx').on(t.usuarioId, t.contexto)],
).enableRLS();

/**
 * Una conversación por (usuario, contexto) — el motor de chat es único pero
 * cada contexto mantiene su propio historial. `onConflictDoNothing` en
 * getOrCreateConversation (conversations.ts) se apoya en este unique.
 */
export const conversacion = pgTable(
  'conversacion',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'cascade' }),
    contexto: text('contexto').notNull(),
    creadoEn: timestamp('creado_en', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('conversacion_usuario_contexto_uq').on(t.usuarioId, t.contexto)],
).enableRLS();

/** Un turno de la conversación. `contenido` guarda el UIMessage completo (parts incluidas). */
export const mensaje = pgTable(
  'mensaje',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversacionId: uuid('conversacion_id')
      .notNull()
      .references(() => conversacion.id, { onDelete: 'cascade' }),
    /** 'user' | 'assistant' | 'system' */
    rol: text('rol').notNull(),
    contenido: text('contenido').notNull(),
    creadoEn: timestamp('creado_en', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('mensaje_conversacion_idx').on(t.conversacionId)],
).enableRLS();

/** Interés registrado para el contexto 'mercado' (Fase 2, aún sin implementar). */
export const listaEsperaMercado = pgTable(
  'lista_espera_mercado',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'cascade' }),
    creadoEn: timestamp('creado_en', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('lista_espera_mercado_usuario_uq').on(t.usuarioId)],
).enableRLS();
