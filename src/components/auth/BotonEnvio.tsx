"use client";

import { useFormStatus } from "react-dom";

/**
 * Botón de envío que se desactiva mientras la acción de servidor corre. Sin
 * esto, un segundo clic reenviaba el alta: el primero creaba la cuenta y el
 * segundo chocaba con el límite de un correo por minuto de Supabase, y era el
 * error del segundo el que veía el usuario aunque la cuenta ya existía.
 */
export function BotonEnvio({ children, enviando }: { children: string; enviando: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="clr-auth-btn" disabled={pending} aria-busy={pending}>
      {pending ? enviando : children}
    </button>
  );
}
