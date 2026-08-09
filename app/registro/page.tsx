import Link from "next/link";
import { AuthCard } from "@/src/components/auth/AuthCard";
import { GoogleButton } from "@/src/components/auth/GoogleButton";
import { signUpAction } from "@/src/lib/supabase/actions";
import { authErrorMessage } from "@/src/lib/supabase/auth-messages";

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next && params.next.startsWith("/") ? params.next : "/";
  const error = authErrorMessage(params.error);

  return (
    <AuthCard
      figLabel="Fig. 06 — Registro"
      title="Crear cuenta"
      subtitle="Guarda tu perfil de oferente y recibe alertas de procesos."
    >
      {error && <p className="clr-auth-msg clr-auth-msg--error">{error}</p>}

      <form action={signUpAction}>
        <input type="hidden" name="next" value={next} />
        <div className="clr-auth-field">
          <label className="clr-auth-label" htmlFor="fullName">
            Nombre completo
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            autoComplete="name"
            placeholder="Nombre y apellido"
            className="clr-auth-input"
          />
        </div>
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
        <div className="clr-auth-field">
          <label className="clr-auth-label" htmlFor="password">
            Contraseña
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
        <button type="submit" className="clr-auth-btn">
          [ Crear cuenta ]
        </button>
      </form>

      <div className="clr-auth-divider">o</div>
      <GoogleButton next={next} />

      <p className="clr-auth-foot">
        ¿Ya tienes cuenta? <Link href={`/login?next=${encodeURIComponent(next)}`}>Ingresar</Link>
      </p>
    </AuthCard>
  );
}
