'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/src/lib/supabase/server';
import { syncUsuario } from '@/src/lib/supabase/sync-usuario';

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

/** Evita open-redirect: solo se permite un `next` de ruta interna. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === 'string' ? value : '/';
  return next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export async function signInWithPasswordAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const next = safeNext(formData.get('next'));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    const code = error?.message.includes('Email not confirmed')
      ? 'email_not_confirmed'
      : 'invalid_credentials';
    redirect(`/login?next=${encodeURIComponent(next)}&error=${code}`);
  }

  await syncUsuario(data.user);
  redirect(next);
}

export async function signUpAction(formData: FormData): Promise<void> {
  const fullName = String(formData.get('fullName') ?? '').trim();
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const next = safeNext(formData.get('next'));

  if (password.length < 8) {
    redirect(`/registro?next=${encodeURIComponent(next)}&error=weak_password`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    const code = error.message.includes('already registered') ? 'email_exists' : 'signup_error';
    redirect(`/registro?next=${encodeURIComponent(next)}&error=${code}`);
  }

  if (data.user) {
    await syncUsuario(data.user);
  }

  if (data.session) {
    redirect(next);
  }

  redirect(`/login?next=${encodeURIComponent(next)}&notice=check_email`);
}

export async function signInWithGoogleAction(formData: FormData): Promise<void> {
  const next = safeNext(formData.get('next'));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${appUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    redirect(`/login?next=${encodeURIComponent(next)}&error=oauth_error`);
  }

  redirect(data.url);
}
