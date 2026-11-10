/**
 * Bandera de las rutas `/comercial/*` (CI-11). Apagada por defecto: con ella
 * apagada toda ruta del bloque responde 404, así que un merge a `main` (que
 * despliega a producción) no publica nada. Se enciende con
 * `CI_COMERCIAL_HABILITADO=1` en el entorno.
 */
export function comercialHabilitado(
  env: Record<string, string | undefined> = process.env
): boolean {
  return env.CI_COMERCIAL_HABILITADO === "1";
}
