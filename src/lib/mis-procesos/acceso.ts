import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { nivelDe, puede, type Capacidad } from "@/src/lib/acceso/politica";
import { ConsultaPersonalInvalidaError, ProcesoNoDisponibleError } from "./validacion";
import type { CuentaProcesos } from "./types";
export class AccesoPersonalError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}
export async function cuentaActiva(
  capacidad: Capacidad = "procesos_guardar"
): Promise<CuentaProcesos> {
  const user = await getSessionUser();
  if (!user || !puede(nivelDe(user, null), capacidad))
    throw new AccesoPersonalError("Inicia sesión para conservar tus procesos.", 401);
  return { usuarioId: user.id };
}
export function respuestaPersonal(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}
export async function operacionPersonal(
  req: NextRequest,
  capacidad: Capacidad,
  mutacion: boolean,
  operacion: (cuenta: CuentaProcesos) => Promise<unknown>
) {
  try {
    const cuenta = await cuentaActiva(capacidad);
    if (mutacion) {
      const origin = req.headers.get("origin");
      if (origin !== req.nextUrl.origin)
        throw new AccesoPersonalError("La solicitud no procede de esta aplicación.", 403);
    }
    return respuestaPersonal(await operacion(cuenta));
  } catch (error) {
    if (error instanceof AccesoPersonalError)
      return respuestaPersonal({ error: error.message }, error.status);
    if (error instanceof ConsultaPersonalInvalidaError)
      return respuestaPersonal({ error: error.message }, 400);
    if (error instanceof ProcesoNoDisponibleError)
      return respuestaPersonal({ error: error.message }, 404);
    console.error("[mis-procesos] No se pudo completar la operación", error);
    return respuestaPersonal({ error: "No pudimos cargar tus procesos. Inténtalo de nuevo." }, 503);
  }
}
