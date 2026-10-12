/**
 * Recuperación de contraseña (plan 2026-10-12-recuperacion-contrasena.md, D3 A).
 *
 * El enlace del correo pasa por /auth/callback con `next=/restablecer…`. Ahí, y
 * solo ahí, se deja una cookie `httpOnly` de 15 minutos: `/restablecer` y su
 * acción la exigen. Así una sesión abierta cualquiera (un navegador compartido)
 * no puede cambiar la contraseña sin haber pasado por el enlace del correo.
 */
export const COOKIE_RECUPERACION = "aq_recuperacion";
export const VIDA_RECUPERACION_SEGUNDOS = 15 * 60;

/** ¿El destino del callback es la pantalla de contraseña nueva? */
export function esDestinoRecuperacion(next: string): boolean {
  return next === "/restablecer" || next.startsWith("/restablecer?");
}
