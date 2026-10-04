import { NextRequest } from "next/server";
import { operacionPersonal } from "@/src/lib/mis-procesos/acceso";
import { borrarRecientes } from "@/src/lib/mis-procesos/store";
export async function DELETE(req: NextRequest) {
  return operacionPersonal(req, "procesos_recientes", true, async (cuenta) => {
    await borrarRecientes(cuenta.usuarioId);
    return { borrados: true };
  });
}
