/**
 * Verificación de la firma Svix con la que Resend firma sus webhooks
 * (SDD §7.3, Fase 6).
 *
 * Vive aquí y no en el route handler para poder probarla: un webhook de entrega
 * sin verificar es un endpoint público con el que cualquiera puede dar de baja
 * las alertas de una cuenta ajena, así que la firma es la única cosa que separa
 * ese endpoint de un formulario abierto.
 *
 * Formato: HMAC-SHA256 de `id.timestamp.body`, con el secreto en base64 tras el
 * prefijo `whsec_`, y el header trae una o más firmas separadas por espacio con
 * prefijo `v1,`.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

/** Ventana de tolerancia: un replay más viejo que esto no vale. */
export const VENTANA_SEGUNDOS = 300;

export interface CabecerasSvix {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
}

export function firmar(secret: string, id: string, timestamp: string, body: string): string {
  const clave = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  return createHmac("sha256", clave).update(`${id}.${timestamp}.${body}`).digest("base64");
}

export function firmaValida(
  secret: string,
  cab: CabecerasSvix,
  body: string,
  ahora: number = Date.now()
): boolean {
  const { id, timestamp, signature } = cab;
  if (!id || !timestamp || !signature) return false;

  const edad = Math.abs(ahora / 1000 - Number(timestamp));
  if (!Number.isFinite(edad) || edad > VENTANA_SEGUNDOS) return false;

  const esperada = Buffer.from(firmar(secret, id, timestamp, body));

  return signature.split(" ").some((f) => {
    const valor = f.startsWith("v1,") ? f.slice(3) : f;
    const buf = Buffer.from(valor);
    // La comparación es en tiempo constante, pero `timingSafeEqual` exige
    // longitudes iguales: comprobarlas antes no filtra nada útil.
    return buf.length === esperada.length && timingSafeEqual(buf, esperada);
  });
}
