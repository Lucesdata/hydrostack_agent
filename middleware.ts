import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/src/lib/supabase/middleware";

/**
 * Refresca la sesión de Supabase en cada request y protege las rutas que
 * requieren cuenta: /cuenta (preferencias de alerta) y /diagnostico/historial.
 * La subida del pliego desde la ficha no pasa por aquí: la ficha es pública y
 * la acción de servidor exige sesión por su cuenta (pliego-actions.ts). Una ruta de API que se llama con
 * fetch() desde un botón (no una navegación) NO va aquí: un redirect de
 * middleware lo sigue en silencio como un 200 con el HTML de /login en vez del
 * 401 que el botón espera. Esa ruta hace su propio gate de sesión. (La lección
 * salió de /api/mercado/waitlist, retirada el 2026-09-27.)
 * Este archivo hace UNA sola distinción: anónimo o con sesión, por prefijo de
 * ruta. No puede hacer más: corre en el runtime Edge y no puede consultar
 * Postgres, así que no puede leer `usuario.plan` ni decidir nada sobre el
 * nivel `pro`. Esa decisión le corresponde a los route handlers y Server
 * Components, no a este archivo. Hoy la única frontera que la política
 * (`src/lib/acceso/politica.ts`) aplica en runtime es `veredicto_detalle`
 * (nivel `gratis`), dentro de POST /api/secop/verdict; el nivel `pro` está
 * declarado en la tabla pero ningún handler lo consulta todavía (ver
 * CLAUDE.md §4).
 *
 * La evaluación de elegibilidad NO se protege aquí ni en un componente: se
 * redacta en esa misma ruta, en el servidor. Una versión anterior de este
 * comentario afirmaba que el gate vivía en ProcessDetail/OferenteWizard; era
 * falso, y esa contradicción es la razón por la que la política ahora vive en
 * un solo sitio.
 */
const PROTECTED_PREFIXES = [
  // Solo este subcamino: /diagnostico a secas es público y debe seguir siéndolo,
  // porque responder sin cuenta es el flujo principal del módulo.
  "/diagnostico/historial",
  "/cuenta",
  "/mis-procesos",
];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
