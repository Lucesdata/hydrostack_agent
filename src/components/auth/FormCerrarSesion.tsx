"use client";

import type { FormEvent, ReactNode } from "react";
import { clearOferentePerfil } from "@/src/lib/state/clientStore";

/**
 * El formulario de «Cerrar sesión», el mismo en el menú de escritorio, el de
 * móvil y /cuenta.
 *
 * Antes de enviar borra el perfil de oferente que `SecopExplorer` guarda en el
 * navegador. Con sesión, ese perfil es una copia del de la cuenta; si se queda
 * al salir, en un navegador compartido la siguiente persona ve el semáforo de
 * cada ficha calculado con el perfil de otra (mismo caso que el `session_token`
 * del diagnóstico, CLAUDE.md §4).
 *
 * `/logout` además responde con `Clear-Site-Data: "storage"`, que cubre el caso
 * sin JavaScript; esto cubre los navegadores que ignoran esa cabecera. No se
 * previene el envío: el borrado es síncrono y el formulario sigue su curso.
 */
export default function FormCerrarSesion({
  children,
  onSubmit,
}: {
  children: ReactNode;
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      action="/logout"
      method="POST"
      onSubmit={(e) => {
        clearOferentePerfil();
        window.dispatchEvent(new Event("aqualicita:logout"));
        onSubmit?.(e);
      }}
    >
      {children}
    </form>
  );
}
