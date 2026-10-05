import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { borrarSessionToken } from "@/src/lib/diagnostico/session-token";
import { COOKIE_SESION_LOCAL, sesionLocalActiva } from "@/src/lib/sesion-local/sesion-local";

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

  if (sesionLocalActiva()) {
    response.cookies.delete(COOKIE_SESION_LOCAL);
    borrarSessionToken(response);
    response.headers.set("Clear-Site-Data", '"storage"');
    return response;
  }

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

  // Mismo motivo para el perfil de oferente que SecopExplorer copia de la
  // cuenta al localStorage: sin esto, la siguiente persona en este navegador
  // vería el semáforo de cada ficha calculado con el perfil de otra. La
  // cabecera cubre el cierre sin JavaScript; FormCerrarSesion lo borra además
  // en el cliente para los navegadores que la ignoran. "storage" no toca las
  // cookies (las de Supabase ya las limpió signOut) ni la caché HTTP.
  response.headers.set("Clear-Site-Data", '"storage"');

  return response;
}
