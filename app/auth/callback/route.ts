import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { syncUsuario } from "@/src/lib/supabase/sync-usuario";
import { reclamarDiagnosticoAnonimo } from "@/src/lib/diagnostico/reclamar";
import {
  COOKIE_RECUPERACION,
  VIDA_RECUPERACION_SEGUNDOS,
  esDestinoRecuperacion,
} from "@/src/lib/supabase/recuperacion";

/**
 * Callback único para OAuth (Google) y verificación de correo — Supabase
 * usa el mismo intercambio de `code` por sesión (PKCE) para ambos flujos.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      await syncUsuario(data.user);
      // Si respondió el diagnóstico sin cuenta, ahora es suyo.
      await reclamarDiagnosticoAnonimo(data.user.id);
      const respuesta = NextResponse.redirect(`${origin}${next}`);
      // Recuperación de contraseña: la cookie solo se deja aquí, tras un
      // intercambio válido, y /restablecer la exige (ver recuperacion.ts).
      if (esDestinoRecuperacion(next)) {
        respuesta.cookies.set(COOKIE_RECUPERACION, "1", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: VIDA_RECUPERACION_SEGUNDOS,
        });
      }
      return respuesta;
    }
  }

  // Un enlace de recuperación gastado o abierto en otro navegador no es un fallo
  // de Google: se explica y se ofrece pedir otro.
  if (esDestinoRecuperacion(next)) {
    return NextResponse.redirect(`${origin}/recuperar?error=link_invalid`);
  }
  return NextResponse.redirect(`${origin}/login?error=oauth_error`);
}
