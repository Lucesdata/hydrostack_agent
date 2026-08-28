/**
 * Diagnóstico de preparación para licitar — registro histórico por respuesta.
 *
 * Append-only en la práctica: cada vez que alguien completa el cuestionario se
 * inserta una fila y nunca se actualizan sus respuestas. El diagnóstico
 * VIGENTE de un usuario es el más reciente por `creado_en`. Por eso `version`
 * viaja en cada fila: cuando entre `co-apsb-v2` (cambio normativo), los
 * diagnósticos ya respondidos siguen siendo interpretables con el cuestionario
 * que los produjo.
 *
 * Deliberadamente separada de `oferente_perfil` (cuentas.ts), que es lo
 * contrario: una sola fila por cuenta, mutable, con el perfil vigente que
 * consumen matching y semáforo. Aquí está el HECHO declarado; allá el ESTADO
 * derivado. No se duplica el perfil mínimo (sector+zona) porque el
 * cuestionario no pregunta ninguno de los dos — ver
 * docs/diagnostico/02-cuestionario-co-apsb-v1.md §4.
 *
 * `usuario_id` es nullable a propósito: el diagnóstico anónimo se guarda desde
 * el primer envío con solo `session_token` (cookie httpOnly), y el registro lo
 * reclama después llenando `usuario_id` + `reclamado_en`. Es la puerta de
 * entrada del producto, así que la persistencia no puede esperar a la cuenta.
 *
 * `escalon` y `bloqueantes` son text/text[], no enums: agregar un valor no
 * debe pedir migración (misma razón que `contrato_evento.tipo_evento` y
 * `envio_log.tipo`).
 *
 * RLS activo sin políticas, como las otras 22 tablas desde drizzle/0014: la
 * Data API de Supabase queda cerrada para `anon`/`authenticated`, y la app
 * sigue leyendo por conexión Postgres directa (rol que ignora RLS). El
 * aislamiento multi-tenant real es el `WHERE usuario_id = ...` de cada query
 * — ver CLAUDE.md §4.
 */

import { pgTable, text, uuid, jsonb, integer, timestamp, index } from "drizzle-orm/pg-core";
import { usuario } from "./cuentas";

export const diagnostico = pgTable(
  "diagnostico",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Null mientras el diagnóstico es anónimo. `usuario.id` es text (UUID de Supabase Auth). */
    usuarioId: text("usuario_id").references(() => usuario.id, { onDelete: "cascade" }),
    /** Cookie httpOnly del visitante anónimo; permite reclamar la fila tras el registro. */
    sessionToken: text("session_token"),
    /** Versión del cuestionario que produjo el resultado. Ej.: "co-apsb-v1". */
    version: text("version").notNull(),
    /** Clave de pregunta → índice de la opción escogida. */
    respuestas: jsonb("respuestas").notNull(),
    /** Suma de puntos, 0..100. */
    puntajeTotal: integer("puntaje_total").notNull(),
    /** CategoriaId → porcentaje 0..100 sobre el máximo de esa categoría. */
    puntajeAreas: jsonb("puntaje_areas").notNull(),
    /** 'minima_cuantia' | 'menor_cuantia' | 'licitacion_publica' */
    escalon: text("escalon").notNull(),
    /** Ids de remedio: los hard primero, luego los soft. */
    bloqueantes: text("bloqueantes").array().notNull(),
    creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
    reclamadoEn: timestamp("reclamado_en", { withTimezone: true }),
  },
  (t) => [
    // El vigente de un usuario es el último: el índice ordena por fecha desc.
    index("diagnostico_usuario_idx").on(t.usuarioId, t.creadoEn),
    index("diagnostico_session_idx").on(t.sessionToken),
  ]
).enableRLS();
