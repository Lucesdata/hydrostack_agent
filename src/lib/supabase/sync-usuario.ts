import type { User } from '@supabase/supabase-js';
import { db } from '@/src/lib/db/client';
import { usuario } from '@/src/lib/db/schema/cuentas';

/**
 * Espejo local (Neon) del usuario de Supabase Auth. `auth.users` vive en el
 * Postgres del proyecto Supabase, no en Neon, así que no hay trigger de DB
 * posible — se sincroniza en código en cada login/signup exitoso. `usuario.id`
 * pasa a ser el UUID que emite Supabase en vez del que generaba
 * `@auth/drizzle-adapter`; el resto de tablas (`oferente_perfil`, `envio_log`,
 * `alerta_preferencias`) siguen referenciando `usuario.id` sin cambios.
 */
export async function syncUsuario(user: User): Promise<void> {
  if (!user.email) return;

  const fullName =
    typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null;

  await db
    .insert(usuario)
    .values({
      id: user.id,
      name: fullName,
      email: user.email,
      emailVerified: user.email_confirmed_at ? new Date(user.email_confirmed_at) : null,
    })
    .onConflictDoUpdate({
      target: usuario.id,
      set: {
        name: fullName,
        email: user.email,
        emailVerified: user.email_confirmed_at ? new Date(user.email_confirmed_at) : null,
      },
    });
}
