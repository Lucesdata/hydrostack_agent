/**
 * Adaptador IO: envío del digest vía Resend. Único punto que conoce el SDK de
 * Resend — cambiar de proveedor de correo toca solo este archivo (mismo
 * principio que `extractPliego.ts` para Anthropic).
 *
 * Headers `List-Unsubscribe` + `List-Unsubscribe-Post` (RFC 8058) desde el
 * primer correo: Gmail/Outlook los exigen para no caer en spam a volumen.
 */

import { Resend } from "resend";
import type { Digest } from "./digest";

export async function sendDigestEmail(to: string, digest: Digest): Promise<void> {
  const apiKey = process.env.AUTH_RESEND_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey) throw new Error("AUTH_RESEND_KEY no definida");
  if (!from) throw new Error("EMAIL_FROM no definida");

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    subject: digest.subject,
    html: digest.html,
    text: digest.text,
    headers: {
      "List-Unsubscribe": `<${digest.unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  if (error) throw new Error(error.message);
}
