/**
 * Cuentas (Fase 1.1, migrado a Supabase Auth) — usuario · oferente_perfil.
 *
 * `usuario` es un espejo local (Neon) del usuario de Supabase Auth —
 * ver `src/lib/supabase/sync-usuario.ts`. `id` es el UUID que emite
 * Supabase (`auth.users.id`), no uno generado localmente; Supabase gestiona
 * su propia sesión y tokens (viven en el Postgres del proyecto Supabase),
 * así que ya no hacen falta tablas de sesión/cuenta-OAuth/token de
 * verificación en Neon — esas eran el contrato específico que esperaba
 * `@auth/drizzle-adapter` (retirado).
 *
 * `oferentePerfil` sigue la convención del repo: PK uuid, perfil en jsonb
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
  uuid,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const usuario = pgTable("usuario", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

/**
 * Perfil del oferente por cuenta (Fase 1.1). Reemplaza gradualmente al único
 * perfil por navegador que hoy vive en `clientStore` (localStorage) — ver
 * `src/lib/oferente/types.ts` (`OferenteProfile`, ya diseñado para esto: el
 * `id` del tipo es lo que permite promoverlo a fila sin repintar el contrato).
 */
export const oferentePerfil = pgTable(
  "oferente_perfil",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    usuarioId: text("usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    perfil: jsonb("perfil").notNull(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("oferente_perfil_usuario_uq").on(t.usuarioId)]
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
  "envio_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    usuarioId: text("usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    fecha: date("fecha").notNull(),
    /** 'diario' | 'on_demand' */
    tipo: text("tipo").notNull(),
    matches: integer("matches").notNull(),
    /** 'enviado' | 'sin_coincidencias' | 'error' */
    estado: text("estado").notNull(),
    enviadoEn: timestamp("enviado_en", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("envio_log_usuario_fecha_tipo_uq").on(t.usuarioId, t.fecha, t.tipo)]
);

/**
 * Coincidencias detectadas por cuenta — respalda el badge de notificación en
 * el Navbar (avatar). El cron diario (`runDailyAlertas`) inserta una fila la
 * primera vez que un proceso aparece en el matching de un usuario;
 * `onConflictDoNothing` evita reinsertar los que ya existían. Independiente
 * de `alerta_preferencias.activo`: apagar el correo no apaga el badge.
 * `vista_en` se marca al entrar a `/mis-coincidencias`.
 */
export const coincidencia = pgTable(
  "coincidencia",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    usuarioId: text("usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    // Id nativo de SECOP (Match.proceso.id / secopProcesoId) — no FK al uuid
    // interno de `proceso`: el motor de matching solo conoce el id nativo,
    // igual que el resto de referencias externas del repo.
    procesoId: text("proceso_id").notNull(),
    /** 'PASS' | 'WARN' | 'UNKNOWN' (getMatchesForPerfil ya descarta 'FAIL') */
    veredictoOverall: text("veredicto_overall").notNull(),
    creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
    vistaEn: timestamp("vista_en", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("coincidencia_usuario_proceso_uq").on(t.usuarioId, t.procesoId),
    index("coincidencia_usuario_no_vista_idx").on(t.usuarioId, t.vistaEn),
  ]
);

/**
 * Preferencias de alerta por cuenta (Fase 1.5 trae la UI; la fila y el campo
 * `activo` ya existen desde 1.3 porque el unsubscribe de un clic del primer
 * correo necesita algo que apagar).
 */
export const alertaPreferencias = pgTable("alerta_preferencias", {
  usuarioId: text("usuario_id")
    .primaryKey()
    .references(() => usuario.id, { onDelete: "cascade" }),
  activo: boolean("activo").default(true).notNull(),
  horaEnvio: smallint("hora_envio").default(7).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Señal pasiva de intención (Prompt 02 — rutas sin perfilamiento). Ningún
 * flujo de UI pregunta el perfil del usuario; en su lugar registramos qué
 * acción tomó y de ahí se infiere. Sin RLS de Postgres — este DB (Neon) se
 * consulta siempre con el mismo DATABASE_URL de servidor, nunca como el
 * usuario final, así que una policy sobre auth.uid() nunca aplicaría (ver
 * CLAUDE.md §4). El aislamiento es el mismo de siempre en este repo: cada
 * query se filtra por usuarioId en código de aplicación.
 */
export const senalUsuario = pgTable(
  "senal_usuario",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    usuarioId: text("usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    senal: text("senal").notNull(),
    creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("senal_usuario_usuario_idx").on(t.usuarioId)]
);
