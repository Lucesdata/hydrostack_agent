import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/src/lib/supabase/middleware";

/**
 * Refresca la sesión de Supabase en cada request y protege las rutas que
 * requieren cuenta: /pliego (análisis de pliegos), /cuenta (preferencias de
 * alerta), /asistente/* (asistentes de proyecto, Prompt 03) y sus rutas de
 * API (/api/assistant, /api/documents). /api/mercado/waitlist NO está aquí a
 * propósito: es un fetch() disparado desde un botón en la home (no una
 * navegación), y un redirect de middleware ahí lo sigue en silencio como un
 * 200 con el HTML de /login en vez de dar el 401 que el botón espera — el
 * propio route handler ya hace su gate de sesión (ver
 * app/api/mercado/waitlist/route.ts) y eso es lo único que debe protegerlo.
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
  "/pliego",
  "/api/pliego",
  "/cuenta",
  "/asistente",
  "/api/assistant",
  "/api/documents",
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
