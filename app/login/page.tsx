import Link from 'next/link';
import { AuthCard } from '@/src/components/auth/AuthCard';
import { GoogleButton } from '@/src/components/auth/GoogleButton';
import { signInWithPasswordAction } from '@/src/lib/supabase/actions';
import { authErrorMessage, authNoticeMessage } from '@/src/lib/supabase/auth-messages';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const next = params.next && params.next.startsWith('/') ? params.next : '/';
  const error = authErrorMessage(params.error);
  const notice = authNoticeMessage(params.notice);

  return (
    <AuthCard figLabel="Fig. 05 — Acceso" title="Ingresar" subtitle="Entra a tu cuenta de HydroStack.">
      {error && <p className="clr-auth-msg clr-auth-msg--error">{error}</p>}
      {notice && <p className="clr-auth-msg clr-auth-msg--notice">{notice}</p>}

      <form action={signInWithPasswordAction}>
        <input type="hidden" name="next" value={next} />
        <div className="clr-auth-field">
          <label className="clr-auth-label" htmlFor="email">Correo</label>
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
          <label className="clr-auth-label" htmlFor="password">Contraseña</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="clr-auth-input"
          />
        </div>
        <button type="submit" className="clr-auth-btn">[ Entrar ]</button>
      </form>

      <div className="clr-auth-divider">o</div>
      <GoogleButton next={next} />

      <p className="clr-auth-foot">
        ¿No tienes cuenta? <Link href={`/registro?next=${encodeURIComponent(next)}`}>Crear cuenta</Link>
      </p>
    </AuthCard>
  );
}
