import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * No usa `src/lib/supabase/server.ts` a propósito: ese cliente escribe
 * cookies vía `next/headers` dentro de un try/catch pensado para Server
 * Components (donde escribir cookies no está permitido y se ignora en
 * silencio). Acá las cookies de logout se atan directo al `NextResponse`
 * que devolvemos, sin intermediarios — mismo patrón que
 * `src/lib/supabase/middleware.ts`.
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/', request.url));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.signOut();

  return response;
}
