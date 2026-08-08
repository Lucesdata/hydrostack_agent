import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Cliente Supabase para Server Components, Route Handlers y Server Actions.
 * `setAll` puede fallar en un Server Component puro (no puede escribir
 * cookies) — se ignora a propósito porque el middleware ya se encarga de
 * refrescar la sesión en cada request.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component sin permiso de escritura — el middleware refresca.
          }
        },
      },
    },
  );
}
