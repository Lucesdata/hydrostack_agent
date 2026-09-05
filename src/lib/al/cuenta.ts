/**
 * Resolución de la cuenta a la que pertenece una petición (SDD §4.0, R8).
 *
 * En v1 una cuenta ES un usuario, así que esto devuelve `user.id`. Existe como
 * función y no como acceso directo a `user.id` porque la fase 2 introduce
 * códigos de equipo: entonces una cuenta pasará a agrupar varios usuarios y
 * esta función consultará la tabla de pertenencia. Cuando llegue ese día, el
 * cambio ocurre AQUÍ y en ningún otro sitio.
 *
 * Ésa es toda la razón de ser de la restricción R8: **ninguna consulta puede
 * asumir que usuario y cuenta son lo mismo**. El código nuevo filtra por
 * `account_id`; `usuario_id` queda como dato de autoría, no de aislamiento.
 */

import type { SessionUser } from "@/src/lib/supabase/get-session-user";

export function cuentaDe(user: SessionUser): string {
  return user.id;
}
