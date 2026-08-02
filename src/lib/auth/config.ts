/**
 * Auth.js v5 — cuentas con solo correo (Fase 1.1).
 *
 * Provider Resend: magic link nativo, sin contraseñas. `DrizzleAdapter` persiste
 * usuario/cuenta/sesión/token contra las tablas de `db/schema/cuentas.ts` (el
 * contrato exacto que el adapter espera — ver el comentario de cabecera de ese
 * archivo). `db` se importa del cliente compartido (`db/client.ts`), mismo
 * singleton que usa el resto del repo (evita agotar conexiones en HMR).
 */

import NextAuth from 'next-auth';
import Resend from 'next-auth/providers/resend';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/src/lib/db/client';
import { usuario, cuenta, sesion, tokenVerificacion } from '@/src/lib/db/schema/cuentas';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: usuario,
    accountsTable: cuenta,
    sessionsTable: sesion,
    verificationTokensTable: tokenVerificacion,
  }),
  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.EMAIL_FROM,
    }),
  ],
  session: { strategy: 'database' },
  pages: {
    verifyRequest: '/cuenta',
  },
});
