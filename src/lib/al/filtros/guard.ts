/**
 * Puerta de acceso compartida por las rutas de `/api/al/*`.
 *
 * La decisión de "quién puede qué" se consulta a `acceso/politica.ts`, que es la
 * única fuente de verdad (CLAUDE.md §4). Un `if (user)` suelto en cada handler
 * es exactamente lo que ese módulo existe para eliminar.
 *
 * `plan` va como `null` explícito: `filtros` es capacidad `gratis`, así que el
 * plan no cambia el resultado y no vale la pena una consulta a la base por cada
 * petición. Si alguna capacidad de `/api/al/*` pasara a `pro`, aquí es donde hay
 * que leer `usuario.plan` — no en el handler.
 */

import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { nivelDe, puede, type Capacidad } from "@/src/lib/acceso/politica";
import { cuentaDe } from "@/src/lib/al/cuenta";

export interface Autorizacion {
  accountId: string;
  usuarioId: string;
}

/**
 * `null` = no autorizado; el handler traduce eso a 401. Retorno nullable y no
 * unión discriminada porque el repo compila con `strict: false` y una unión por
 * `ok: true | false` no estrecha — es el mismo idiom de `getSessionUser`.
 */
export async function autorizar(capacidad: Capacidad): Promise<Autorizacion | null> {
  const user = await getSessionUser();
  if (!user) return null;
  if (!puede(nivelDe(user, null), capacidad)) return null;
  return { accountId: cuentaDe(user), usuarioId: user.id };
}
