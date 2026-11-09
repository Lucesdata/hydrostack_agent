"use server";

/**
 * Acciones de servidor del perfil de empresa comercial (CI-05). Todavía sin
 * pantalla: la interfaz entra después de los prototipos (CI-06). Aquí solo se
 * resuelve QUIÉN es el usuario y SI puede; el resto lo hace `servicio.ts`.
 *
 * El `usuarioId` sale siempre de la sesión. Cualquier id que venga en `entrada`
 * se ignora (el validador solo lee campos conocidos).
 */
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { nivelDe, puede } from "@/src/lib/acceso/politica";
import { guardarEmpresa, obtenerEmpresa, type EmpresaGuardada } from "./servicio";
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
