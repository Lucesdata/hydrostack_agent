import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/src/components/auth/AuthCard";
import { BotonEnvio } from "@/src/components/auth/BotonEnvio";
import { requestPasswordResetAction } from "@/src/lib/supabase/actions";
import { authErrorMessage, authNoticeMessage } from "@/src/lib/supabase/auth-messages";
import { sesionLocalActiva } from "@/src/lib/sesion-local/sesion-local";

export const metadata = { title: "Recuperar contraseña | AquaLicita", robots: { index: false } };

export default async function RecuperarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const next = params.next && params.next.startsWith("/") ? params.next : "/";
  // Entorno local sin Supabase: no hay correo que enviar.
  if (sesionLocalActiva()) redirect(`/dev/sesion?next=${encodeURIComponent(next)}`);
  const error = authErrorMessage(params.error);
  const notice = authNoticeMessage(params.notice);

  return (
    <AuthCard
      figLabel="Fig. 07 — Recuperar acceso"
      title="Recuperar contraseña"
      subtitle="Escribe el correo de tu cuenta y te enviamos un enlace para elegir una contraseña nueva."
    >
      {error && <p className="clr-auth-msg clr-auth-msg--error">{error}</p>}
      {notice && <p className="clr-auth-msg clr-auth-msg--notice">{notice}</p>}

      <form action={requestPasswordResetAction}>
        <input type="hidden" name="next" value={next} />
        <div className="clr-auth-field">
          <label className="clr-auth-label" htmlFor="email">
            Correo
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="tu@correo.com"
            className="clr-auth-input"
          />
        </div>
        <BotonEnvio enviando="Enviando…">Enviar enlace</BotonEnvio>
      </form>

      <p className="clr-auth-foot">
        ¿Ya la recordaste? <Link href={`/login?next=${encodeURIComponent(next)}`}>Ingresar</Link>
      </p>
    </AuthCard>
  );
}
