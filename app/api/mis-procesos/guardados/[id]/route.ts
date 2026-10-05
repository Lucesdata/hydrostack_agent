import { NextRequest } from "next/server";
import { operacionPersonal } from "@/src/lib/mis-procesos/acceso";
import { guardarProceso, quitarProceso } from "@/src/lib/mis-procesos/store";
import { validarId } from "@/src/lib/mis-procesos/validacion";
type Contexto = { params: { id: string } };
export async function PUT(req: NextRequest, { params }: Contexto) {
  return operacionPersonal(req, "procesos_guardar", true, async (cuenta) => {
    await guardarProceso(cuenta, validarId(params.id));
    return { guardado: true };
  });
}
export async function DELETE(req: NextRequest, { params }: Contexto) {
  return operacionPersonal(req, "procesos_guardar", true, async (cuenta) => {
    await quitarProceso(cuenta.usuarioId, validarId(params.id));
    return { guardado: false };
  });
}
