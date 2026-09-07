import { resendConfirmationAction } from "@/src/lib/supabase/actions";

/**
 * Salida del callejón sin salida de `notice=check_email`: si el correo de
 * verificación no llegó, esta es la única acción que le queda al usuario —
 * reintentar el alta ya falla con "ese correo ya está registrado".
 *
 * Pide el correo otra vez en vez de recibirlo por prop desde la URL, que es
 * donde no debe viajar.
 */
export function ResendConfirmation({ next }: { next: string }) {
  return (
    <details className="clr-auth-resend">
      <summary className="clr-auth-resend-toggle">¿No te llegó el correo?</summary>
      <form action={resendConfirmationAction} className="clr-auth-resend-form">
        <input type="hidden" name="next" value={next} />
        <label className="clr-auth-label" htmlFor="resend-email">
          Correo de la cuenta
        </label>
        <input
          id="resend-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="tu@correo.com"
          className="clr-auth-input"
        />
        <button type="submit" className="clr-auth-btn-secondary">
          Reenviar verificación
        </button>
      </form>
    </details>
  );
}
