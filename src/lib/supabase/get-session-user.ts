import { createClient } from '@/src/lib/supabase/server';

export interface SessionUser {
  id: string;
  email: string;
}

/**
 * Reemplaza al `auth()` de Auth.js — mismo shape mínimo
 * (`{ id, email } | null`) que ya consumían los call sites existentes.
 * Sin NEXT_PUBLIC_SUPABASE_URL/ANON_KEY (o si Supabase no responde) se
 * trata como sin sesión en vez de reventar la ruta — mismo criterio que
 * `src/lib/supabase/middleware.ts`.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) return null;
    return { id: user.id, email: user.email };
  } catch {
    return null;
  }
}

export interface DisplayUser {
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

/** Para el Navbar: nombre + foto a mostrar (con fallback a correo/iniciales). */
export async function getSessionDisplayUser(): Promise<DisplayUser | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) return null;
    const meta = user.user_metadata ?? {};
    const fullName = typeof meta.full_name === 'string' ? meta.full_name : null;
    const avatarUrl =
      typeof meta.avatar_url === 'string'
        ? meta.avatar_url
        : typeof meta.picture === 'string'
          ? meta.picture
          : null;
    return { email: user.email, fullName, avatarUrl };
  } catch {
    return null;
  }
}
