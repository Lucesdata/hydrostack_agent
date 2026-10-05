import { NextResponse, type NextRequest } from "next/server";
import {
  COOKIE_SESION_LOCAL,
  sesionLocalActiva,
  USUARIOS_LOCALES,
} from "@/src/lib/sesion-local/sesion-local";

/**
 * Entrar y salir en el entorno local (`docs/entorno-local.md`):
 *
 *   /dev/sesion                         lista los usuarios de prueba
 *   /dev/sesion?usuario=<id>&next=/x    entra como ese usuario y vuelve a /x
 *   /dev/sesion?salir=1                 cierra la sesión local
 *
 * Fuera de `next dev` con `AQ_SESION_LOCAL=1` responde 404: en producción la
 * ruta no existe a efectos prácticos.
 */
export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  if (!sesionLocalActiva()) return new NextResponse(null, { status: 404 });

  const params = request.nextUrl.searchParams;
  const nextParam = params.get("next");
  const destino =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  if (params.get("salir")) {
    const r = NextResponse.redirect(new URL(destino, request.url), 303);
    r.cookies.delete(COOKIE_SESION_LOCAL);
    return r;
  }

  const usuario = USUARIOS_LOCALES.find((u) => u.id === params.get("usuario"));
  if (usuario) {
    const r = NextResponse.redirect(new URL(destino, request.url), 303);
    r.cookies.set(COOKIE_SESION_LOCAL, usuario.id, { httpOnly: true, sameSite: "lax", path: "/" });
    return r;
  }

  const enlaces = USUARIOS_LOCALES.map(
    (u) =>
      `<li><a href="/dev/sesion?usuario=${u.id}&next=${encodeURIComponent(destino)}">${u.nombre}</a> · ${u.email}</li>`
  ).join("");
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><title>Sesión local</title>
<body style="font-family:system-ui;max-width:560px;margin:48px auto;padding:0 16px">
<h1>Sesión local</h1><p>Entorno local sin Supabase. Elige un usuario de prueba:</p>
<ul>${enlaces}</ul><p><a href="/dev/sesion?salir=1">Cerrar la sesión local</a></p></body>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}
