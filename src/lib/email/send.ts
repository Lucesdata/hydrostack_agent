/**
 * Adaptador IO: envío del digest vía Resend. Único punto que conoce el SDK de
 * Resend — cambiar de proveedor de correo toca solo este archivo (mismo
 * principio que `extractPliego.ts` para Anthropic).
 *
 * Headers `List-Unsubscribe` + `List-Unsubscribe-Post` (RFC 8058) desde el
 * primer correo: Gmail/Outlook los exigen para no caer en spam a volumen.
 *
 * Devuelve el id que asigna Resend. Es lo que permite que el webhook de
 * entregabilidad empareje un evento con SU envío: sin él, el handler tiene que
 * caer al destinatario y quedarse con la fila más reciente de esa dirección —
 * funciona, pero atribuye mal cuando hay más de un envío al mismo correo.
 */

import { Resend } from "resend";
import type { Digest } from "./digest";

/**
 * Reply-To corporativo opcional (`EMAIL_REPLY_TO`). Se define solo cuando el
 * buzón corporativo está validado; ausente o con un valor que no parece una
 * dirección, el mensaje sale sin Reply-To (comportamiento previo).
 */
function replyToConfigurado(): string | undefined {
  const valor = process.env.EMAIL_REPLY_TO?.trim();
  return valor && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(valor) ? valor : undefined;
}

export async function sendDigestEmail(to: string, digest: Digest): Promise<string> {
  const apiKey = process.env.AUTH_RESEND_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey) throw new Error("AUTH_RESEND_KEY no definida");
  if (!from) throw new Error("EMAIL_FROM no definida");

  const resend = new Resend(apiKey);
  const replyTo = replyToConfigurado();
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: digest.subject,
    html: digest.html,
    text: digest.text,
    ...(replyTo ? { replyTo } : {}),
    headers: {
      "List-Unsubscribe": `<${digest.unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error("Resend no devolvió un identificador de envío");
  return data.id;
}
