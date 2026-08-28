/**
 * Cookie del diagnóstico anónimo.
 *
 * El diagnóstico se persiste en Postgres desde el primer envío, tenga o no
 * cuenta quien lo responde. Esta cookie es lo único que vive en el navegador y
 * no guarda ningún dato: solo un identificador opaco que permite (a) volver a
 * la página y encontrar el resultado, y (b) reclamar la fila cuando la persona
 * se registre. Deliberadamente NO es localStorage — ver la restricción 2 de
 * docs/diagnostico/01-spec-diagnostico.md y el historial del `clientStore`.
 *
 * httpOnly: el JS de la página nunca la necesita (el resultado viaja en la
 * respuesta del POST), así que no hay razón para exponerla.
 *
 * Este módulo no lee `next/headers` a propósito: opera sobre el `NextRequest` y
 * el `NextResponse` del route handler, que es donde de verdad se puede escribir
 * una cookie, y así queda testeable sin montar un contexto de request. Los
 * Server Components que necesiten leerla usan `DIAGNOSTICO_COOKIE` con
 * `cookies()` directamente (una línea, sin lógica que duplicar).
 */

import type { NextRequest, NextResponse } from "next/server";

export const DIAGNOSTICO_COOKIE = "aqualicita_diagnostico";

/** 90 días: suficiente para que alguien vuelva a terminar lo que empezó, sin ser permanente. */
const MAX_AGE_SEGUNDOS = 90 * 24 * 60 * 60;

/** Identificador opaco. `randomUUID` está en el runtime de Node y en el Edge. */
export function nuevoSessionToken(): string {
  return crypto.randomUUID();
}

/**
 * Descarta valores que no tengan forma de UUID v4: la cookie la controla el
 * cliente y termina en un `WHERE session_token = ...`, así que no se acepta
 * cualquier cadena.
 */
export function esSessionTokenValido(valor: unknown): valor is string {
  return (
    typeof valor === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-9a-f][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor)
  );
}

export function leerSessionToken(req: NextRequest): string | null {
  const valor = req.cookies.get(DIAGNOSTICO_COOKIE)?.value;
  return esSessionTokenValido(valor) ? valor : null;
}

export function escribirSessionToken(res: NextResponse, token: string): void {
  res.cookies.set(DIAGNOSTICO_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SEGUNDOS,
  });
}

/** Tras reclamar el diagnóstico, la cookie ya no tiene función. */
export function borrarSessionToken(res: NextResponse): void {
  res.cookies.set(DIAGNOSTICO_COOKIE, "", { path: "/", maxAge: 0 });
}
