/**
 * Token de unsubscribe de un clic (Fase 1.3 — el endpoint de baja vive desde
 * ya aunque la UI de preferencias sea Fase 1.5). HMAC-SHA256 sobre el
 * `usuarioId`, firmado con `AUTH_SECRET` (el mismo secreto de Auth.js — sin
 * introducir una segunda clave). Determinístico y sin estado: no hay que
 * guardar el token en DB para poder validarlo.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

function requireSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET no definida — requerida para firmar el unsubscribe");
  return secret;
}

function sign(usuarioId: string): string {
  return createHmac("sha256", requireSecret()).update(usuarioId).digest("hex");
}

export function signUnsubscribeToken(usuarioId: string): string {
  return `${usuarioId}.${sign(usuarioId)}`;
}

/** Devuelve el `usuarioId` si el token es válido, o `null` si no. */
export function verifyUnsubscribeToken(token: string): string | null {
  const sepIdx = token.lastIndexOf(".");
  if (sepIdx <= 0) return null;
  const usuarioId = token.slice(0, sepIdx);
  const sig = token.slice(sepIdx + 1);

  const expected = sign(usuarioId);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return usuarioId;
}
