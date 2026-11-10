import { sql } from "drizzle-orm";

/**
 * «Hoy» en Colombia, como DATE, evaluado **una vez por consulta**.
 *
 * `(now() at time zone 'America/Bogota')::date` escrito directo en un `WHERE` u
 * `ORDER BY` lo evalúa Postgres fila a fila (resolver la zona por nombre cuesta).
 * Sobre `proceso` (≈94.000 filas) el conteo por departamento de la portada tardaba
 * 8,4 s y con el subselect escalar —un InitPlan, constante para toda la consulta—
 * 174 ms, con el mismo resultado (medido 2026-10-24, ver
 * `docs/superpowers/specs/2026-10-24-diagnostico-ingesta-timeouts.md`).
 *
 * No volver a escribir la expresión en línea: usar esta función.
 */
export function hoyEnColombia() {
  return sql`(select (now() at time zone 'America/Bogota')::date)`;
}
