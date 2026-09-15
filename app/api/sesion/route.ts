/**
 * Route handler: GET /api/sesion
 *
 * Lo que el Navbar necesita saber de la sesión: el usuario a mostrar y si tiene
 * coincidencias sin ver. Sin sesión devuelve `{ user: null }`.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 * Hasta el 2026-09-15 el layout raíz (`app/layout.js`) resolvía esto en el
 * servidor y se lo pasaba al Navbar por props. Eso hacía que el layout llamara a
 * `cookies()`, y como el layout envuelve TODAS las páginas, arrastraba a
 * dinámicas también a las rutas facetadas, que se declaran estáticas a
 * propósito. En producción reventó: las 43 rutas devolvían 500 con
 * "Page changed from static to dynamic at runtime ... reason: cookies".
 *
 * Moverlo aquí no es solo un rodeo para que compile. Una página cacheada y
 * compartida NO puede llevar datos de sesión incrustados en su HTML: ese HTML se
 * sirve tal cual al siguiente visitante, así que hornear ahí el avatar y el
 * correo de alguien sería filtrarlos. La sesión pertenece al cliente, que es
 * quien tiene la cookie.
 *
 * `no-store` es obligatorio: la respuesta depende de quién pregunta y no debe
 * quedarse en ninguna caché intermedia.
 */

import { NextResponse } from "next/server";
import { getSessionDisplayUser } from "@/src/lib/supabase/get-session-user";
import { hasCoincidenciasNoVistas } from "@/src/lib/matching/record-coincidencias";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionDisplayUser();
  const hasNewMatches = user ? await hasCoincidenciasNoVistas(user.id) : false;

  return NextResponse.json({ user, hasNewMatches }, { headers: { "Cache-Control": "no-store" } });
}
