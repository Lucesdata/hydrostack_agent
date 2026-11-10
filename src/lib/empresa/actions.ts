"use server";

/**
 * Acciones de servidor del perfil de empresa comercial (CI-05). Todavía sin
 * pantalla: la interfaz entra después de los prototipos (CI-06). Aquí solo se
 * resuelve QUIÉN es el usuario y SI puede; el resto lo hace `servicio.ts`.
 *
 * El `usuarioId` sale siempre de la sesión. Cualquier id que venga en `entrada`
 * se ignora (el validador solo lee campos conocidos).
 */
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { comercialHabilitado } from "@/src/lib/comercial/habilitado";
import { nivelDe, puede } from "@/src/lib/acceso/politica";
import { guardarEmpresa, obtenerEmpresa, type EmpresaGuardada } from "./servicio";
import { entradaDesdeFormData } from "./formulario";
import type { ErrorValidacion } from "./validar";

export type ResultadoAccionGuardar =
  | { ok: true; creada: boolean; empresa: EmpresaGuardada }
  | { ok: false; error: "SIN_SESION" | "SIN_PERMISO" }
  | { ok: false; error: "VALIDACION"; errores: ErrorValidacion[] };

export type ResultadoAccionLeer =
  | { ok: true; empresa: EmpresaGuardada | null }
  | { ok: false; error: "SIN_SESION" | "SIN_PERMISO" };

export async function guardarEmpresaAction(entrada: unknown): Promise<ResultadoAccionGuardar> {
  const user = await getSessionUser();
  if (!user?.id) return { ok: false, error: "SIN_SESION" };
  if (!puede(nivelDe(user, null), "empresa_perfil")) return { ok: false, error: "SIN_PERMISO" };
  return guardarEmpresa(user.id, entrada);
}

export async function leerMiEmpresaAction(): Promise<ResultadoAccionLeer> {
  const user = await getSessionUser();
  if (!user?.id) return { ok: false, error: "SIN_SESION" };
  if (!puede(nivelDe(user, null), "empresa_perfil")) return { ok: false, error: "SIN_PERMISO" };
  return { ok: true, empresa: await obtenerEmpresa(user.id) };
}

/**
 * Acción del formulario de `/comercial/perfil` (CI-11b): funciona sin JavaScript
 * de cliente y responde siempre con una redirección (`?ok=1` o `?error=campos`).
 * Mismas reglas que `guardarEmpresaAction`: el usuario sale de la sesión.
 */
export async function guardarEmpresaFormAction(formData: FormData): Promise<void> {
  if (!comercialHabilitado()) notFound();
  const user = await getSessionUser();
  if (!user?.id) redirect("/login?next=/comercial/perfil");
  if (!puede(nivelDe(user, null), "empresa_perfil")) redirect("/comercial/perfil?error=permiso");

  const existente = await obtenerEmpresa(user.id);
  const r = await guardarEmpresa(user.id, entradaDesdeFormData(formData, existente));
  if (!r.ok) {
    const campos = [...new Set(r.errores.map((e) => e.campo))].join(",");
    redirect(`/comercial/perfil?error=${encodeURIComponent(campos)}`);
  }
  redirect("/comercial/perfil?ok=1");
}
