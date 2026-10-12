import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthCard } from "@/src/components/auth/AuthCard";
import { BotonEnvio } from "@/src/components/auth/BotonEnvio";
import { updatePasswordAction } from "@/src/lib/supabase/actions";
import { authErrorMessage, authNoticeMessage } from "@/src/lib/supabase/auth-messages";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { COOKIE_RECUPERACION } from "@/src/lib/supabase/recuperacion";
import { sesionLocalActiva } from "@/src/lib/sesion-local/sesion-local";

export const metadata = { title: "Contraseña nueva | AquaLicita", robots: { index: false } };

export default async function RestablecerPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const next = params.next && params.next.startsWith("/") ? params.next : "/";
  if (sesionLocalActiva()) redirect(`/dev/sesion?next=${encodeURIComponent(next)}`);

  const error = authErrorMessage(params.error);
  const notice = authNoticeMessage(params.notice);
  const listo = params.notice === "password_updated";

  // Sin el enlace del correo (cookie) y sin la sesión que ese enlace abre, esta
  // pantalla no deja cambiar nada. Tras el cambio la cookie ya se borró: el
  // aviso de «listo» se muestra sin ella.
  if (!listo) {
    const jar = await cookies();
    const user = await getSessionUser();
    if (!jar.get(COOKIE_RECUPERACION) || !user) {
      redirect(`/recuperar?next=${encodeURIComponent(next)}&error=link_invalid`);
    }
  }

  return (
    <AuthCard
      figLabel="Fig. 08 — Contraseña nueva"
      title={listo ? "Contraseña actualizada" : "Elige tu contraseña nueva"}
      subtitle={listo ? undefined : "Mínimo 8 caracteres. Cerraremos tus otras sesiones abiertas."}
    >
      {error && <p className="clr-auth-msg clr-auth-msg--error">{error}</p>}
      {notice && <p className="clr-auth-msg clr-auth-msg--notice">{notice}</p>}

      {listo ? (
        <p className="clr-auth-foot">
          <Link href={next}>Continuar</Link>
        </p>
      ) : (
        <form action={updatePasswordAction}>
          <input type="hidden" name="next" value={next} />
          <div className="clr-auth-field">
            <label className="clr-auth-label" htmlFor="password">
              Contraseña nueva
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              className="clr-auth-input"
            />
          </div>
          <div className="clr-auth-field">
            <label className="clr-auth-label" htmlFor="confirmar">
              Repítela
            </label>
            <input
              id="confirmar"
              name="confirmar"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="clr-auth-input"
            />
          </div>
          <BotonEnvio enviando="Guardando…">Guardar contraseña</BotonEnvio>
        </form>
      )}
    </AuthCard>
  );
}
