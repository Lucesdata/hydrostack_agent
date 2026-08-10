import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/src/lib/supabase/middleware';

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
 * El resto del gating (evaluación de elegibilidad, embebida en
 * /licitaciones) no es una ruta dedicada — se protege en el componente que
 * dispara el flujo, ver ProcessDetail/OferenteWizard.
 */
const PROTECTED_PREFIXES = [
  '/pliego',
  '/api/pliego',
  '/cuenta',
  '/asistente',
  '/api/assistant',
  '/api/documents',
];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
