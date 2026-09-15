import { createClient } from "@/src/lib/supabase/server";

export interface SessionUser {
  id: string;
  email: string;
}

/**
 * Next usa una excepción como SEÑAL DE CONTROL, no como error: cuando algo pide
 * `cookies()` durante un render estático, lanza un `DynamicServerError` para
 * abortar ese render y rehacerlo como dinámico. Si alguien lo captura, Next se
 * queda creyendo que la página siguió siendo estática y al cerrar el render
 * aborta con un 500 opaco: "Page changed from static to dynamic at runtime".
 *
 * Eso es justo lo que pasó el 2026-09-15: el `catch` de aquí abajo —puesto para
 * tratar "sin Supabase" como "sin sesión"— se tragaba la señal y tumbaba las 43
 * rutas facetadas en producción. El `catch` sigue siendo correcto para lo que
 * fue escrito; solo tiene que dejar pasar lo que no le pertenece.
 *
 * Se reconoce por el `digest`, que es la parte estable de este contrato.
 */
function esSenalDeNext(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    typeof (e as { digest?: unknown }).digest === "string" &&
    ((e as { digest: string }).digest === "DYNAMIC_SERVER_USAGE" ||
      (e as { digest: string }).digest.startsWith("NEXT_"))
  );
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
  } catch (e) {
    if (esSenalDeNext(e)) throw e;
    return null;
  }
}

export interface DisplayUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

/** Para el Navbar: id + nombre + foto a mostrar (con fallback a correo/iniciales). */
export async function getSessionDisplayUser(): Promise<DisplayUser | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) return null;
    const meta = user.user_metadata ?? {};
    const fullName = typeof meta.full_name === "string" ? meta.full_name : null;
    const avatarUrl =
      typeof meta.avatar_url === "string"
        ? meta.avatar_url
        : typeof meta.picture === "string"
          ? meta.picture
          : null;
    return { id: user.id, email: user.email, fullName, avatarUrl };
  } catch (e) {
    if (esSenalDeNext(e)) throw e;
    return null;
  }
}
