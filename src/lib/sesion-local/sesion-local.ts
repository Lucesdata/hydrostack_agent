/**
 * Sesión local para probar la aplicación sin Supabase Auth
 * (`docs/entorno-local.md`).
 *
 * Solo existe con `next dev` **y** `AQ_SESION_LOCAL=1`. `NODE_ENV` lo fija
 * Next: vale `development` solo en `next dev`, y `production` en todo build
 * (Vercel incluido), así que en producción esta función devuelve `false` haga
 * lo que haga la variable. Con ella activa, la cookie `aq_sesion_local` lleva
 * el id de uno de los usuarios de abajo, y nada más: un id que no esté en la
 * lista es «sin sesión».
 *
 * Los usuarios los siembra `scripts/local/sembrar.ts` en la tabla `usuario`,
 * con el mismo id, para que las consultas por `usuario_id` funcionen igual que
 * con una cuenta real.
 */

export const COOKIE_SESION_LOCAL = "aq_sesion_local";

export interface UsuarioLocal {
  id: string;
  email: string;
  nombre: string;
  /** Si `sembrar.ts` le crea perfil de oferente completo. */
  conPerfil: boolean;
}

export const USUARIOS_LOCALES: readonly UsuarioLocal[] = [
  {
    id: "00000000-0000-4000-8000-00000000a001",
    email: "ana@aqualicita.local",
    nombre: "Ana (con perfil)",
    conPerfil: true,
  },
  {
    id: "00000000-0000-4000-8000-00000000a002",
    email: "beto@aqualicita.local",
    nombre: "Beto (sin perfil)",
    conPerfil: false,
  },
];

export function sesionLocalActiva(): boolean {
  return process.env.NODE_ENV === "development" && process.env.AQ_SESION_LOCAL === "1";
}

/** El usuario local que nombra la cookie, o `null` (también fuera del modo local). */
export function usuarioLocal(valorCookie: string | undefined): UsuarioLocal | null {
  if (!sesionLocalActiva() || !valorCookie) return null;
  return USUARIOS_LOCALES.find((u) => u.id === valorCookie) ?? null;
}
