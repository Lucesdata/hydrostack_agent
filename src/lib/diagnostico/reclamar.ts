/**
 * Reclamo del diagnóstico anónimo tras autenticarse.
 *
 * Se llama desde los TRES caminos que crean sesión, no solo desde el callback
 * de OAuth: el alta con contraseña y sesión inmediata y el login normal no
 * pasan por `/auth/callback`, así que engancharlo solo ahí dejaría fuera a
 * buena parte de los registros.
 *
 * Este módulo sí lee `next/headers` (a diferencia de session-token.ts, que se
 * mantiene puro para poder testearse): es un helper de servidor que corre
 * dentro de un Route Handler o de una Server Action, ambos con acceso al store
 * de cookies.
 *
 * Nunca lanza. Corre dentro del flujo de registro/login y un fallo aquí no
 * puede impedirle a nadie entrar a su cuenta.
 */

import { cookies } from "next/headers";
import { reclamarDiagnosticos } from "./diagnostico-store";
import { DIAGNOSTICO_COOKIE, esSessionTokenValido } from "./session-token";

/**
 * Asocia a `usuarioId` los diagnósticos anónimos de esta cookie y la borra.
 * Devuelve cuántos se reclamaron (0 si no había cookie o nada que reclamar).
 *
 * Borrar la cookie no es cosmético: sin eso, en un navegador compartido, quien
 * inicie sesión después heredaría el diagnóstico que respondió otra persona.
 */
export async function reclamarDiagnosticoAnonimo(usuarioId: string): Promise<number> {
  try {
    const store = await cookies();
    const token = store.get(DIAGNOSTICO_COOKIE)?.value;
    if (!esSessionTokenValido(token)) return 0;

    const reclamados = await reclamarDiagnosticos(token, usuarioId);
    try {
      store.delete(DIAGNOSTICO_COOKIE);
    } catch {
      // Contexto sin permiso de escritura. Una cookie que sobreviva es
      // inofensiva: el siguiente reclamo no encuentra filas sin dueño.
    }
    return reclamados;
  } catch {
    return 0;
  }
}
