/**
 * Cuentas (Fase 1.1) — usuario · cuenta · sesión · token_verificacion ·
 * oferente_perfil.
 *
 * Las 4 primeras tablas son el contrato que `@auth/drizzle-adapter` espera
 * (ver `node_modules/@auth/drizzle-adapter/lib/pg.js` → `defineTables`).
 * Se copian columna por columna del default del adapter (mismos nombres de
 * columna SQL y mismas claves JS que el adapter accede por propiedad:
 * `usersTable.email`, `accountsTable.providerAccountId`, etc.) — deliberado,
 * para no divergir del contrato en futuras versiones del paquete. Es la
 * única excepción al snake_case/español del resto del repo: es infra
 * vendorizada, no un modelo de dominio propio.
 *
 * `oferentePerfil` sí sigue la convención del repo: PK uuid, perfil en jsonb
 * (contrato TS estable `OferenteProfile`, sin normalizar — decisión ya fijada
 * en docs/plan-arquitectura-roadmap.md §3.1).
 */

import {
  pgTable,
  text,
  timestamp,
  integer,
  smallint,
  boolean,
  date,
  primaryKey,
  uuid,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const usuario = pgTable('usuario', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
});

export const cuenta = pgTable(
  'cuenta',
  {
    userId: text('userId')
      .notNull()
      .references(() => usuario.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sesion = pgTable('sesion', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => usuario.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const tokenVerificacion = pgTable(
  'token_verificacion',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

/**
 * Perfil del oferente por cuenta (Fase 1.1). Reemplaza gradualmente al único
 * perfil por navegador que hoy vive en `clientStore` (localStorage) — ver
 * `src/lib/oferente/types.ts` (`OferenteProfile`, ya diseñado para esto: el
 * `id` del tipo es lo que permite promoverlo a fila sin repintar el contrato).
 */
export const oferentePerfil = pgTable(
  'oferente_perfil',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'cascade' }),
    perfil: jsonb('perfil').notNull(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('oferente_perfil_usuario_uq').on(t.usuarioId)],
);

/**
 * Log de envíos de alertas (Fase 1.3 — bajo demanda; Fase 1.4 reusa `tipo:
 * 'diario'` para la idempotencia del cron). `tipo`/`estado` son text, no enum,
 * por la misma razón que `contrato_evento.tipo_evento` (hechos.ts): agregar
 * valores no debe pedir migración. Unique (usuario_id, fecha, tipo): el cron
 * diario hace insert-first para no duplicar; el botón "enviar ahora" hace
 * upsert (un clic repetido el mismo día actualiza el registro, no lo duplica).
 */
export const envioLog = pgTable(
  'envio_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'cascade' }),
    fecha: date('fecha').notNull(),
    /** 'diario' | 'on_demand' */
    tipo: text('tipo').notNull(),
    matches: integer('matches').notNull(),
    /** 'enviado' | 'sin_coincidencias' | 'error' */
    estado: text('estado').notNull(),
    enviadoEn: timestamp('enviado_en', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('envio_log_usuario_fecha_tipo_uq').on(t.usuarioId, t.fecha, t.tipo)],
);

/**
 * Preferencias de alerta por cuenta (Fase 1.5 trae la UI; la fila y el campo
 * `activo` ya existen desde 1.3 porque el unsubscribe de un clic del primer
 * correo necesita algo que apagar).
 */
export const alertaPreferencias = pgTable('alerta_preferencias', {
  usuarioId: text('usuario_id')
    .primaryKey()
    .references(() => usuario.id, { onDelete: 'cascade' }),
  activo: boolean('activo').default(true).notNull(),
  horaEnvio: smallint('hora_envio').default(7).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
