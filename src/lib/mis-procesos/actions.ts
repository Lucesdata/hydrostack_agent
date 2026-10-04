"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cuentaActiva } from "./acceso";
import { guardarProceso, quitarProceso, borrarRecientes } from "./store";
import { validarId, ConsultaPersonalInvalidaError, ProcesoNoDisponibleError } from "./validacion";
import { retornoDeGuardado, rutaInterna } from "./retorno";
async function ejecutar(form: FormData, accion: "guardar" | "quitar" | "borrar") {
  const volver = rutaInterna(form.get("volver"));
  let id = "";
  if (accion !== "borrar") {
    try {
      id = validarId(form.get("id"));
    } catch {
      redirect("/mis-procesos?error=criterios");
    }
  }
  let cuenta;
  try {
    cuenta = await cuentaActiva(accion === "borrar" ? "procesos_recientes" : "procesos_guardar");
  } catch (error) {
    if (typeof error === "object" && error !== null && "status" in error && error.status === 401) {
      const next = accion === "guardar" ? retornoDeGuardado(id, volver) : "/mis-procesos";
      redirect(`/login?next=${encodeURIComponent(next)}`);
    }
    console.error("[mis-procesos] Cuenta no disponible", error);
    redirect("/mis-procesos?error=servicio");
  }
  let aviso = "ok",
    fallo = "";
  try {
    if (accion === "guardar") await guardarProceso(cuenta, id);
    else if (accion === "quitar") await quitarProceso(cuenta.usuarioId, id);
    else {
      if (form.get("confirmar") !== "si")
        throw new ConsultaPersonalInvalidaError("Confirma el borrado.");
      await borrarRecientes(cuenta.usuarioId);
    }
  } catch (error) {
    if (error instanceof ConsultaPersonalInvalidaError) fallo = "criterios";
    else if (error instanceof ProcesoNoDisponibleError) fallo = "retirado";
    else {
      console.error("[mis-procesos] Cambio no confirmado", error);
      fallo = "servicio";
    }
  }
  if (!fallo) revalidatePath("/mis-procesos");
  const params = new URLSearchParams(fallo ? { error: fallo } : { aviso });
  if (form.has("volver")) params.set("volver", volver);
  if (fallo && accion === "guardar") params.set("guardar", id);
  redirect(`/mis-procesos?${params}`);
}
export async function guardarPersonalAction(form: FormData) {
  await ejecutar(form, "guardar");
}
export async function quitarPersonalAction(form: FormData) {
  await ejecutar(form, "quitar");
}
export async function borrarRecientesAction(form: FormData) {
  await ejecutar(form, "borrar");
}
