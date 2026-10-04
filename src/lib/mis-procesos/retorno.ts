import { validarId } from "./validacion";
export function rutaInterna(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\x00-\x20]/.test(value)
  )
    return "/mis-procesos";
  try {
    const u = new URL(value, "https://aqualicita.invalid");
    return u.origin === "https://aqualicita.invalid"
      ? u.pathname + u.search + u.hash
      : "/mis-procesos";
  } catch {
    return "/mis-procesos";
  }
}
export function retornoDeGuardado(procesoId: string, volver: string): string {
  return `/mis-procesos?${new URLSearchParams({ guardar: validarId(procesoId), volver: rutaInterna(volver) })}`;
}
