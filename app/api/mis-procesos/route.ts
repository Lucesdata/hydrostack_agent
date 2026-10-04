import { NextRequest } from "next/server";
import { operacionPersonal } from "@/src/lib/mis-procesos/acceso";
import { listarMisProcesos, estadoGuardados } from "@/src/lib/mis-procesos/store";
import { validarPagina, validarIds } from "@/src/lib/mis-procesos/validacion";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  return operacionPersonal(req, "procesos_guardar", false, async (cuenta) => {
    if (req.nextUrl.searchParams.has("ids"))
      return {
        usuarioId: cuenta.usuarioId,
        guardados: await estadoGuardados(
          cuenta.usuarioId,
          validarIds(req.nextUrl.searchParams.get("ids")!)
        ),
      };
    return {
      usuarioId: cuenta.usuarioId,
      ...(await listarMisProcesos(
        cuenta.usuarioId,
        validarPagina(req.nextUrl.searchParams.get("page"))
      )),
    };
  });
}
