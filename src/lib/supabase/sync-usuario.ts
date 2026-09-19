import type { User } from "@supabase/supabase-js";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { usuario } from "@/src/lib/db/schema/cuentas";

/**
 * El correo ya pertenece a otra fila de `usuario` cuya cuenta sigue viva en
 * Supabase Auth. No se resuelve adivinando: puede ser un espejo con el correo
 * desfasado (la otra cuenta cambió de correo y no ha vuelto a entrar) o dos
 * cuentas SSO con el mismo correo. Ninguno de los dos casos autoriza a borrar
 * ni a reasignar los datos de esa cuenta.
 */
export class ColisionEmailUsuarioError extends Error {
  constructor(
    readonly usuarioIdNuevo: string,
    readonly usuarioIdExistente: string
  ) {
    super(
      `El correo de la cuenta ${usuarioIdNuevo} ya está en usuario con la cuenta ` +
        `${usuarioIdExistente}, que sigue viva en auth.users`
    );
    this.name = "ColisionEmailUsuarioError";
  }
}

/**
 * Espejo del usuario de Supabase Auth en `usuario`. `auth.users` y `usuario`
 * viven en el mismo Postgres pero en esquemas distintos, sin FK ni trigger entre
 * ellos: se sincroniza en código en cada login/signup exitoso. `usuario.id` es
 * el UUID de `auth.users.id`.
 *
 * Borrar una cuenta en el dashboard de Supabase deja su fila aquí. Si la misma
 * dirección se registra otra vez, Auth emite un id NUEVO y el upsert choca
 * contra el único de `email`, que `ON CONFLICT (id)` no cubre. Ver
 * `liberarEmailDeCuentaBorrada`.
 */
export async function syncUsuario(user: User): Promise<void> {
  if (!user.email) return;

  const fullName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;
  const datos = {
    name: fullName,
    email: user.email,
    emailVerified: user.email_confirmed_at ? new Date(user.email_confirmed_at) : null,
  };
  const upsert = () =>
    db
      .insert(usuario)
      .values({ id: user.id, ...datos })
      .onConflictDoUpdate({ target: usuario.id, set: datos });

  // El camino normal es una sola sentencia; la reparación solo corre cuando
  // choca, que es un caso raro y no justifica una transacción en cada login.
  try {
    await upsert();
  } catch (err) {
    if (!esColisionDeEmail(err)) throw err;
    await liberarEmailDeCuentaBorrada(user.id, user.email);
    await upsert();
  }
}

/**
 * Borra la fila que ocupa `email` con otro id, SOLO si ese id ya no existe en
 * `auth.users`. Las FK hacia `usuario.id` (`ON DELETE CASCADE`, salvo
 * `pliego_proceso`, que es `SET NULL` porque el pliego es público) se llevan
 * con ella el perfil, las alertas, los envíos, las coincidencias, el
 * diagnóstico, los documentos y las conversaciones.
 *
 * Se borra y no se reapunta a propósito:
 * - Mismo correo no es misma persona. `signUpAction` sincroniza antes de que
 *   el correo esté confirmado, así que reapuntar le entregaría el perfil y los
 *   documentos de la cuenta borrada a quien escribiera esa dirección.
 * - Borrar una cuenta en el dashboard es una decisión explícita (puede ser una
 *   solicitud de supresión de datos). Reapuntar la desharía.
 * - Las FK son `ON UPDATE NO ACTION`: reapuntar obligaría a actualizar cada
 *   tabla hija a mano, y la próxima tabla que referencie `usuario` quedaría
 *   fuera sin que nada avise. El borrado usa la cascada ya declarada.
 *
 * Los objetos que la cuenta subió a Supabase Storage (`documento.ruta_storage`)
 * NO se borran aquí: no son filas de esta base.
 */
async function liberarEmailDeCuentaBorrada(usuarioIdNuevo: string, email: string): Promise<void> {
  // Comprobar y borrar en una sola sentencia: la cuenta no puede aparecer en
  // Auth entre la comprobación y el borrado. `id::text` porque `auth.users.id`
  // es uuid y `usuario.id` es text.
  const borradas = await db
    .delete(usuario)
    .where(
      and(
        eq(usuario.email, email),
        ne(usuario.id, usuarioIdNuevo),
        sql`not exists (select 1 from auth.users a where a.id::text = ${usuario.id})`
      )
    )
    .returning({ id: usuario.id });

  if (borradas.length > 0) {
    // Sin el correo en el log: basta con los ids para rastrearlo.
    console.warn("[syncUsuario] espejo de una cuenta borrada de Auth eliminado", {
      usuarioIdBorrado: borradas[0].id,
      usuarioIdNuevo,
    });
    return;
  }

  // No se borró nada: o la otra cuenta sigue viva en Auth, o un sync
  // concurrente del mismo alta (doble clic en el enlace del correo) ya la
  // borró. Solo lo primero es un error.
  const [viva] = await db
    .select({ id: usuario.id })
    .from(usuario)
    .where(and(eq(usuario.email, email), ne(usuario.id, usuarioIdNuevo)));
  if (viva) throw new ColisionEmailUsuarioError(usuarioIdNuevo, viva.id);
}

const MAX_CAUSE_DEPTH = 5;

/**
 * `true` si el error es la violación del único de `usuario.email`. Drizzle
 * envuelve el error del driver en `DrizzleQueryError` con `cause`, igual que
 * asume `src/lib/db/transient.ts`.
 */
function esColisionDeEmail(err: unknown): boolean {
  let actual: unknown = err;
  for (let i = 0; i < MAX_CAUSE_DEPTH && actual instanceof Error; i++) {
    const { code, constraint } = actual as Error & { code?: unknown; constraint?: unknown };
    if (code === "23505" && constraint === usuario.email.uniqueName) return true;
    actual = actual.cause;
  }
  return false;
}
