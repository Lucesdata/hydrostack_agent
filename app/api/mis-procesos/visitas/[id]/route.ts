import { NextRequest } from "next/server";
import { operacionPersonal } from "@/src/lib/mis-procesos/acceso";
import { registrarVisita } from "@/src/lib/mis-procesos/store";
import { validarId } from "@/src/lib/mis-procesos/validacion";
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return operacionPersonal(req, "procesos_recientes", true, async (cuenta) => {
    await registrarVisita(cuenta, validarId(params.id));
    return { registrado: true };
  });
}
