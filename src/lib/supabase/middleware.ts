import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION_LOCAL, sesionLocalActiva, usuarioLocal } from "../sesion-local/sesion-local";

/**
 * Refresca el token de sesión en cada request (patrón estándar de
 * `@supabase/ssr` para Next.js middleware). Debe llamarse a `getUser()` —
 * no `getSession()` — porque solo `getUser()` revalida contra el servidor
 * de Supabase en vez de confiar en la cookie sin verificar.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Entorno local sin Supabase (solo `next dev` + AQ_SESION_LOCAL=1).
  if (sesionLocalActiva()) {
    const local = usuarioLocal(request.cookies.get(COOKIE_SESION_LOCAL)?.value);
    return { response, user: local ? { id: local.id, email: local.email } : null };
  }

  // Sin NEXT_PUBLIC_SUPABASE_URL/ANON_KEY configuradas (o si Supabase no
  // responde), no debe caerse el sitio entero — se trata como "sin sesión":
  // las rutas protegidas redirigen a /login, las públicas siguen sirviendo.
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    return { response, user };
  } catch {
    return { response, user: null };
  }
}
