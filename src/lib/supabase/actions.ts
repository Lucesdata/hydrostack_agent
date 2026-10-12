"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { syncUsuario } from "@/src/lib/supabase/sync-usuario";
import { authErrorCode } from "@/src/lib/supabase/auth-messages";
import { reclamarDiagnosticoAnonimo } from "@/src/lib/diagnostico/reclamar";
import { appUrl } from "@/src/lib/app-url";
import { registrarConsentimiento } from "@/src/lib/marketing/consentimiento";
import { cookies } from "next/headers";
import { COOKIE_RECUPERACION } from "@/src/lib/supabase/recuperacion";

/**
 * Destino del enlace que Supabase pone en el correo. Lo comparten el alta y el
 * reenvío: si divergen, el reenviado deja de pasar por /auth/callback y el
 * usuario pierde el reclamo de su diagnóstico anónimo.
 */
function callbackUrl(next: string): string {
  return `${appUrl()}/auth/callback?next=${encodeURIComponent(next)}`;
}

/** Evita open-redirect: solo se permite un `next` de ruta interna. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "/";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function signInWithPasswordAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    const code = authErrorCode(error?.message, "invalid_credentials");
    redirect(`/login?next=${encodeURIComponent(next)}&error=${code}`);
  }

  await syncUsuario(data.user);
  await reclamarDiagnosticoAnonimo(data.user.id);
  redirect(next);
}

export async function signUpAction(formData: FormData): Promise<void> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (password.length < 8) {
    redirect(`/registro?next=${encodeURIComponent(next)}&error=weak_password`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      // Sin esto, el enlace del correo de confirmación vuelve al Site URL que
      // tenga configurado Supabase —normalmente `/`— y /auth/callback NUNCA
      // corre para este camino. Importa porque ahí es donde vive el reclamo del
      // diagnóstico anónimo cuando el alta no abre sesión de una vez: sin este
      // redirect, ese usuario no recupera nunca lo que respondió. El camino de
      // Google ya fijaba su `redirectTo` explícitamente; este no, y esa
      // asimetría era el agujero.
      emailRedirectTo: callbackUrl(next),
    },
  });

  if (error) {
    console.error("[signUpAction] Supabase signup error:", error.message);
    const code = authErrorCode(error.message, "signup_error");
    // Ojo con `email_delivery_failed`: Supabase ya creó la fila en
    // `auth.users` aunque devuelva error, así que la cuenta existe sin
    // verificar y un reintento choca contra "ese correo ya está registrado".
    // El texto de ese código lo dice en vez de invitar a reintentar.
    redirect(`/registro?next=${encodeURIComponent(next)}&error=${code}`);
  }

  if (data.user) {
    await syncUsuario(data.user);
    // Casilla de novedades: desmarcada por defecto. Un fallo aquí no debe romper
    // el alta; la persona puede activarla luego en /cuenta.
    if (formData.get("marketing") === "on") {
      try {
        await registrarConsentimiento(data.user.id, true);
      } catch (err) {
        console.error("[signUpAction] No se registró el consentimiento de marketing:", err);
      }
    }
  }

  // El reclamo va DENTRO de la rama con sesión, y no antes, a propósito. Con
  // la confirmación por correo activa, Supabase devuelve `user` pero
  // `session: null`: reclamar ahí le asignaría el diagnóstico a una cuenta que
  // todavía no puede entrar y, peor, borraría la cookie del anónimo — su
  // resultado desaparecería del navegador hasta que verificara el correo. En
  // ese caso el reclamo le toca a /auth/callback, que es por donde vuelve.
  if (data.session && data.user) {
    await reclamarDiagnosticoAnonimo(data.user.id);
    redirect(next);
  }

  redirect(`/login?next=${encodeURIComponent(next)}&notice=check_email`);
}

/**
 * Reenvía el correo de verificación. Sin esto, `notice=check_email` era un
 * callejón sin salida: si el correo no llegaba, el usuario no tenía ninguna
 * acción disponible salvo reintentar el alta, que ya falla con "ese correo ya
 * está registrado" porque la cuenta sí se creó.
 *
 * Pide el correo en su propio campo en vez de arrastrarlo por la URL: en la
 * barra de direcciones quedaría registrado en el historial y en los logs del
 * servidor.
 */
export async function resendConfirmationAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const next = safeNext(formData.get("next"));
  const volver = `/login?next=${encodeURIComponent(next)}`;

  if (!email) {
    redirect(`${volver}&error=invalid_credentials`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: callbackUrl(next) },
  });

  if (error) {
    console.error("[resendConfirmationAction] Supabase resend error:", error.message);
    redirect(`${volver}&error=${authErrorCode(error.message, "signup_error")}`);
  }

  // Supabase responde igual exista o no la cuenta, para no filtrar qué correos
  // están registrados. Mantenemos ese mismo aviso único.
  redirect(`${volver}&notice=confirmation_resent`);
}

/**
 * Pide el correo de recuperación. La respuesta es SIEMPRE la misma —exista o no
 * la cuenta— para no revelar qué correos están registrados; solo el límite de un
 * correo por minuto de Supabase se muestra aparte, porque no depende de la cuenta.
 * El enlace vuelve por /auth/callback con `next=/restablecer`, y el callback deja
 * la cookie que exige `updatePasswordAction`.
 */
export async function requestPasswordResetAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const next = safeNext(formData.get("next"));
  const volver = `/recuperar?next=${encodeURIComponent(next)}`;

  if (!email) {
    redirect(`${volver}&error=email_required`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: callbackUrl(`/restablecer?next=${encodeURIComponent(next)}`),
  });

  if (error) {
    console.error("[requestPasswordResetAction] Supabase reset error:", error.message);
    if (authErrorCode(error.message, "reset_error") === "rate_limit") {
      redirect(`${volver}&error=rate_limit`);
    }
  }

  redirect(`${volver}&notice=reset_sent`);
}

/**
 * Fija la contraseña nueva. Exige DOS cosas: la cookie que deja /auth/callback
 * al venir del enlace del correo y una sesión (la que ese mismo intercambio
 * abrió). Sin la cookie, una sesión abierta cualquiera no puede cambiarla.
 */
export async function updatePasswordAction(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");
  const confirmar = String(formData.get("confirmar") ?? "");
  const next = safeNext(formData.get("next"));
  const volver = `/restablecer?next=${encodeURIComponent(next)}`;

  const jar = await cookies();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!jar.get(COOKIE_RECUPERACION) || !data?.user) {
    redirect(`/recuperar?next=${encodeURIComponent(next)}&error=link_invalid`);
  }

  if (password.length < 8) redirect(`${volver}&error=weak_password`);
  if (password !== confirmar) redirect(`${volver}&error=password_mismatch`);

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("[updatePasswordAction] Supabase update error:", error.message);
    redirect(`${volver}&error=${authErrorCode(error.message, "reset_error")}`);
  }

  // Un solo uso: la cookie se borra y las demás sesiones de la cuenta se cierran.
  jar.delete(COOKIE_RECUPERACION);
  await supabase.auth.signOut({ scope: "others" });

  redirect(`${volver}&notice=password_updated`);
}

export async function signInWithGoogleAction(formData: FormData): Promise<void> {
  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl(next) },
  });

  if (error || !data.url) {
    redirect(`/login?next=${encodeURIComponent(next)}&error=oauth_error`);
  }

  redirect(data.url);
}
