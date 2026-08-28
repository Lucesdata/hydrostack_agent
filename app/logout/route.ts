import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { borrarSessionToken } from "@/src/lib/diagnostico/session-token";

/**
 * No usa `src/lib/supabase/server.ts` a propósito: ese cliente escribe
 * cookies vía `next/headers` dentro de un try/catch pensado para Server
 * Components (donde escribir cookies no está permitido y se ignora en
 * silencio). Acá las cookies de logout se atan directo al `NextResponse`
 * que devolvemos, sin intermediarios — mismo patrón que
 * `src/lib/supabase/middleware.ts`.
 */
export async function POST(request: NextRequest) {
  // 303, no el 307 por defecto: un 307 preserva el método del request
  // original, así que el navegador reintentaría `/` con POST (una página,
  // no un route handler) en vez de GET.
  const response = NextResponse.redirect(new URL("/", request.url), 303);

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
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.signOut();

  // La cookie del diagnóstico anónimo muere con la sesión: si no, la
  // siguiente cuenta que entre en este navegador reclamaría un diagnóstico
  // que no es suyo.
  borrarSessionToken(response);

  return response;
}
